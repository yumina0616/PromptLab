const pool = require('../../shared/db');

// 공통 에러 헬퍼
function httpError(status, msg){
  const e = new Error(msg); e.status = status; return e;
}

// 트랜잭션 헬퍼(콜백)
function withTx(work, done){
  pool.getConnection(function(err, conn){
    if (err) return done(err);
    console.log('→ TX 시작');
    conn.beginTransaction(function(err2){
      if (err2) { conn.release(); return done(err2); }
      work(conn, function(workErr, result){
        if (workErr) {
          console.log('⚠️ TX rollback:', workErr);
          return conn.rollback(function(){
            conn.release(); done(workErr);
          });
        }
        console.log('✅ TX commit');
        conn.commit(function(cErr){
          conn.release();
          done(cErr, result);
        });
      });
    });
  });
}

function ensureOwner(conn, userId, promptId, cb){
  conn.query('SELECT owner_id FROM prompt WHERE id = ?', [promptId], function(err, rows){
    if (err) return cb(err);
    if (!rows.length) return cb(httpError(404,'Prompt not found'));
    if (rows[0].owner_id !== userId) return cb(httpError(403,'Forbidden'));
    cb(null);
  });
}

function ensurePromptViewer(userId, promptId, cb){
  if (!userId) return cb(httpError(401, 'UNAUTHORIZED'));
  pool.query('SELECT owner_id FROM prompt WHERE id = ?', [promptId], function(err, rows){
    if (err) return cb(err);
    if (!rows.length) return cb(httpError(404,'Prompt not found'));
    if (rows[0].owner_id === userId) return cb(null, rows[0].owner_id);
    pool.query(
      `SELECT 1
       FROM workspace_prompts wp
       JOIN workspace_members wm ON wm.workspace_id = wp.workspace_id
       WHERE wp.prompt_id = ? AND wm.user_id = ?
       LIMIT 1`,
      [promptId, userId],
      function(err2, shared){
        if (err2) return cb(err2);
        if (!shared.length) return cb(httpError(403,'Forbidden'));
        cb(null, rows[0].owner_id);
      }
    );
  });
}

function ensurePromptViewerAsync(userId, promptId){
  return new Promise((resolve, reject) => {
    ensurePromptViewer(userId, promptId, function(err, ownerId){
      if (err) return reject(err);
      resolve(ownerId);
    });
  });
}

function getCategoryIdByCode(conn, code, cb){
  if (!code) return cb(null, null);
  conn.query('SELECT id FROM category WHERE code = ?', [code], function(err, rows){
    if (err) return cb(err);
    if (!rows.length) return cb(httpError(400, 'INVALID_CATEGORY'));
    cb(null, rows[0].id);
  });
}

function upsertTags(conn, promptId, tags, cb){
  if (!tags || !tags.length) return cb(null);
  // 순차 실행
  let i = 0;
  function next(){
    if (i >= tags.length) return cb(null);
    const name = tags[i++];
    conn.query(
      'INSERT INTO tag (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
      [name],
      function(err, r){
        if (err) return cb(err);
        const tagId = r.insertId;
        conn.query(
          'INSERT IGNORE INTO prompt_tag (prompt_id, tag_id) VALUES (?, ?)',
          [promptId, tagId],
          function(err2){
            if (err2) return cb(err2);
            next();
          }
        );
      }
    );
  }
  next();
}

function ensurePromptViewer(userId, promptId, cb){
  if (!userId) return cb(httpError(401, 'UNAUTHORIZED'));
  // ★ 1. prompt의 owner_id와 visibility를 함께 가져옵니다.
  pool.query('SELECT owner_id, visibility FROM prompt WHERE id = ?', [promptId], function(err, rows){
    if (err) return cb(err);
    if (!rows.length) return cb(httpError(404,'Prompt not found'));
    
    const p = rows[0];

    // 2. 소유자(Owner)이거나 Public인 경우 즉시 허용
    if (p.owner_id === userId) return cb(null, p.owner_id);
    if (p.visibility === 'public') return cb(null, p.owner_id); // ⬅️ 추가된 로직

    // 3. Private이고 워크스페이스 공유 확인 (이하 기존 로직)
    pool.query(
      `SELECT 1
       FROM workspace_prompts wp
       JOIN workspace_members wm ON wm.workspace_id = wp.workspace_id
       WHERE wp.prompt_id = ? AND wm.user_id = ?
       LIMIT 1`,
      [promptId, userId],
      function(err2, shared){
        if (err2) return cb(err2);
        if (!shared.length) return cb(httpError(403,'Forbidden'));
        cb(null, p.owner_id); // rows[0].owner_id 대신 p.owner_id 사용
      }
    );
  });
}

// 1) 프롬프트 + 첫 버전
exports.createPromptWithFirstVersion = function(userId, body, done){
  withTx(function(conn, cb){
    conn.query(
      'INSERT INTO prompt (owner_id, name, description, visibility) VALUES (?, ?, ?, ?)',
      [userId, body.name, body.description || null, body.visibility || 'public'],
      function(err, r){
        if (err) return cb(err);
        const promptId = r.insertId;

        getCategoryIdByCode(conn, body.category_code, function(err2, categoryId){
          if (err2) return cb(err2);

          conn.query(
            `INSERT INTO prompt_version
             (prompt_id, version_number, commit_message, content, is_draft, revision, created_by, category_id)
             VALUES (?, 1, ?, ?, ?, 1, ?, ?)`,
            [promptId, body.commit_message, body.content, body.is_draft ? 1 : 0, userId, categoryId],
            function(err3, vr){
              if (err3) return cb(err3);
              const versionId = vr.insertId;

              const ms = body.model_setting;
              conn.query(
                `INSERT INTO model_setting
                 (prompt_version_id, ai_model_id, temperature, max_token, top_p, frequency_penalty, presence_penalty)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  versionId,
                  ms.ai_model_id,
                  ms.temperature || 1.0,
                  ms.max_token || null,
                  ms.top_p || null,
                  ms.frequency_penalty || null,
                  ms.presence_penalty || null
                ],
                function(err4){
                  if (err4) return cb(err4);

                  upsertTags(conn, promptId, body.tags || [], function(err5){
                    if (err5) return cb(err5);

                    if (body.is_draft) {
                      return cb(null, { id: promptId, owner_id: userId, latest_version_id: null });
                    }
                    conn.query('UPDATE prompt SET latest_version_id = ? WHERE id = ?', [versionId, promptId], function(err6){
                      if (err6) return cb(err6);
                      cb(null, { id: promptId, owner_id: userId, latest_version_id: versionId });
                    });
                  });
                }
              );
            }
          );
        });
      }
    );
  }, done);
};

// 2) 프롬프트 목록 (검색 + 정렬 + 카테고리 + 태그 + owner)
// src/modules/prompts/prompt.service.js

exports.listPrompts = function (userId, q, done) {
  try {
    const where  = [];
    const params = [];

    const isOwnerMe = q && q.owner === 'me';

    // 1) owner 필터: owner=me
    if (isOwnerMe) {
      if (!userId) return done(httpError(401, 'UNAUTHORIZED'));
      where.push('p.owner_id = ?');
      params.push(userId);

      // 내 프롬프트 목록에서는 visibility 필터를 선택적으로 걸 수 있음
      if (q && q.visibility) {
        where.push('p.visibility = ?');
        params.push(q.visibility);
      }
    } else {
      // ★ 글로벌 검색(owner 파라미터 없거나 'me'가 아닌 경우)은
      // 항상 public 만 조회
      where.push("p.visibility = 'public'");
    }

    // 3) 검색어(q): 이름/설명 LIKE
    if (q && q.q) {
      where.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push('%' + q.q + '%', '%' + q.q + '%');
    }

    // 4) 태그 필터: tag=dev
    if (q && q.tag) {
      where.push(
        'EXISTS (' +
        '  SELECT 1 FROM prompt_tag pt2' +
        '  JOIN tag t2 ON t2.id = pt2.tag_id' +
        '  WHERE pt2.prompt_id = p.id AND t2.name = ?' +
        ')'
      );
      params.push(q.tag);
    }

    // 5) 카테고리 필터: category=dev
    if (q && q.category) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM prompt_version v2
          JOIN category c ON c.id = v2.category_id
          WHERE v2.prompt_id = p.id
            AND c.code = ?
        )
      `);
      params.push(q.category);
    }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    // 6) 정렬: sort=recent | stars | popular
    const sort = (q && q.sort) ? String(q.sort) : 'recent';
    let orderSql = 'ORDER BY p.created_at DESC';  // 기본: 최신순

    if (sort === 'recent') {
      orderSql = 'ORDER BY p.created_at DESC';
    } else if (sort === 'stars' || sort === 'popular') {
      // ⭐ 즐겨찾기 수 기준 내림차순(+ 생성일 보조 정렬)
      orderSql = 'ORDER BY star_count DESC, p.created_at DESC';
    } else {
      return done(httpError(400, 'INVALID_SORT'));
    }

    // 7) 페이징
    const limit  = Number(q && q.limit ? q.limit : 20);
    const page   = Number(q && q.page  ? q.page  : 1);
    const offset = (page - 1) * limit;

    if (!Number.isFinite(limit) || limit <= 0 || limit > 100) {
      return done(httpError(400, 'INVALID_LIMIT'));
    }

    // 8) 메인 리스트 쿼리
    const sql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.visibility,
        p.latest_version_id,
        -- ⭐ 인기(별점) 수: 이 프롬프트의 모든 버전에 달린 즐겨찾기 총합
        (
          SELECT COUNT(*)
          FROM favorite f
          JOIN prompt_version v ON v.id = f.prompt_version_id
          WHERE v.prompt_id = p.id
        ) AS star_count
      FROM prompt p
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;

    const listParams = params.concat([limit, offset]);

    pool.query(sql, listParams, function (err, rows) {
      if (err) return done(err);

      let i = 0;
      const items = [];

      function next() {
        if (i >= rows.length) {
          // 프론트로 나가는 응답 형태
          return done(null, { items });
        }

        const row = rows[i++];

        // 9) 태그 붙이기
        pool.query(
          `
          SELECT t.name
          FROM prompt_tag pt
          JOIN tag t ON t.id = pt.tag_id
          WHERE pt.prompt_id = ?
          `,
          [row.id],
          function (err2, tagRows) {
            if (err2) return done(err2);

            const tags = tagRows.map(t => t.name);

            // 10) latest_version 붙이기
            const pushItem = (lvRow) => {
              items.push({
                id:           row.id,
                name:         row.name,
                description:  row.description,
                visibility:   row.visibility,
                tags,
                latest_version: lvRow || null,
                // ⭐ 여기서 star_count 응답에 포함
                star_count: Number(row.star_count) || 0,
              });
            };

            if (row.latest_version_id) {
              pool.query(
                'SELECT id, version_number FROM prompt_version WHERE id = ?',
                [row.latest_version_id],
                function (err3, lv) {
                  if (err3) return done(err3);
                  pushItem(lv[0]);
                  next();
                }
              );
            } else {
              pool.query(
                'SELECT id, version_number FROM prompt_version WHERE prompt_id = ? ORDER BY version_number DESC LIMIT 1',
                [row.id],
                function (err3, lv) {
                  if (err3) return done(err3);
                  pushItem(lv[0]);
                  next();
                }
              );
            }
          }
        );
      }

      next();
    });
  } catch (err) {
    done(err);
  }
};




// 3) 상세
exports.getPrompt = function(userId, id, done) {
  pool.query('SELECT * FROM prompt WHERE id = ?', [id], function(err, rows) {
    if (err) return done(err);
    if (!rows.length) return done(null, null);
    const p = rows[0];

    pool.query(
      'SELECT t.name FROM prompt_tag pt JOIN tag t ON t.id=pt.tag_id WHERE pt.prompt_id = ?',
      [id],
      function(err2, tags) {
        if (err2) return done(err2);

        // latest_version 정보를 받아서 star_count까지 붙여서 응답을 완성하는 함수
        function finish(latest) {
          // ★ 여기서 favorite 카운트 조회
          pool.query(
            `
            SELECT COUNT(*) AS cnt
            FROM favorite f
            JOIN prompt_version v ON v.id = f.prompt_version_id
            WHERE v.prompt_id = ?
            `,
            [id],
            function(err4, favRows) {
              if (err4) return done(err4);

              const starCount = favRows[0] ? Number(favRows[0].cnt) : 0;

              done(null, {
                id: p.id,
                name: p.name,
                description: p.description,
                visibility: p.visibility,
                tags: tags.map(t => t.name),
                latest_version: latest,
                star_count: starCount          // ★ 추가된 필드
              });
            }
          );
        }

        if (p.latest_version_id) {
          pool.query(
            'SELECT id, version_number FROM prompt_version WHERE id = ?',
            [p.latest_version_id],
            function(err3, lv) {
              if (err3) return done(err3);
              return finish(lv[0] || null);
            }
          );
        } else {
          pool.query(
            'SELECT id, version_number FROM prompt_version WHERE prompt_id = ? ORDER BY version_number DESC LIMIT 1',
            [id],
            function(err3, lv) {
              if (err3) return done(err3);
              return finish(lv[0] || null);
            }
          );
        }
      }
    );
  });
};

// 4) 메타 수정
exports.updatePromptMeta = function(userId, id, patch, done){
  withTx(function(conn, cb){
    ensureOwner(conn, userId, id, function(err){
      if (err) return cb(err);

      const fields = [];
      const params = [];
      if (patch.name !== undefined) { fields.push('name = ?'); params.push(patch.name); }
      if (patch.description !== undefined) { fields.push('description = ?'); params.push(patch.description); }
      if (patch.visibility !== undefined) { fields.push('visibility = ?'); params.push(patch.visibility); }

      function afterUpdate(){
        if (patch.tags) {
          conn.query('DELETE FROM prompt_tag WHERE prompt_id = ?', [id], function(err2){
            if (err2) return cb(err2);
            upsertTags(conn, id, patch.tags, function(err3){
              if (err3) return cb(err3);
              cb(null);
            });
          });
        } else cb(null);
      }

      if (fields.length) {
        conn.query('UPDATE prompt SET ' + fields.join(', ') + ' WHERE id = ?', [...params, id], function(err2){
          if (err2) return cb(err2);
          afterUpdate();
        });
      } else {
        afterUpdate();
      }
    });
  }, function(err){
    if (err) return done(err);
    pool.query('SELECT id, name, visibility FROM prompt WHERE id = ?', [id], function(e2, r){
      if (e2) return done(e2);
      done(null, r[0]);
    });
  });
};

// 5) 삭제
exports.deletePrompt = function(userId, id, done){
  withTx(function(conn, cb){
    ensureOwner(conn, userId, id, function(err){
      if (err) return cb(err);
      conn.query('DELETE FROM prompt WHERE id = ?', [id], function(err2){
        if (err2) return cb(err2);
        cb(null);
      });
    });
  }, done);
};

// ===== 버전 =====
exports.listVersions = function(userId, promptId, query, done){
  ensurePromptViewer(userId, promptId, function(err){
    if (err) return done(err);

    // 사용자님 규칙에 따라 is_draft는 항상 0이므로,
    // includeDraft 쿼리 파라미터는 제거해도 무방하나, 
    // 기존 로직을 최대한 유지하고 권한 검사만 강화합니다.
    const includeDraft = String((query && query.includeDraft) || '').toLowerCase() === 'true';
    const sql = `
      SELECT id, version_number, is_draft, commit_message, category_id, created_at
      FROM prompt_version
      WHERE prompt_id = ? ${includeDraft ? '' : 'AND is_draft = 0'} 
      ORDER BY version_number DESC`;
    pool.query(sql, [promptId], function(err2, rows){
      if (err2) return done(err2);
      done(null, rows);
    });
  });
};

exports.createVersion = function(userId, promptId, body, done){
  withTx(function(conn, cb){
    ensureOwner(conn, userId, promptId, function(err){
      if (err) return cb(err);

      // 1) 다음 버전 번호 계산
      conn.query(
        'SELECT IFNULL(MAX(version_number), 0) + 1 AS next_no FROM prompt_version WHERE prompt_id = ?',
        [promptId],
        function(err2, cnt){
          if (err2) return cb(err2);
          const version_number = cnt[0].next_no;

          // 2) 카테고리 ID 결정
          getCategoryIdByCode(conn, body.category_code, function(err3, categoryId){
            if (err3) return cb(err3);

            // 3) 새 버전 INSERT (is_draft는 항상 0으로 고정)
            conn.query(
              `INSERT INTO prompt_version
                 (prompt_id, version_number, commit_message, content,
                  is_draft, revision, created_by, category_id)
               VALUES (?, ?, ?, ?, 0, 1, ?, ?)`,
              [
                promptId,
                version_number,
                body.commit_message,
                body.content,
                userId,
                categoryId
              ],
              function(err4, vr){
                if (err4) return cb(err4);
                const verId = vr.insertId;

                // 4) model_setting 있으면 저장
                function doneModelSetting(next){
                  if (!body.model_setting) return next();
                  const ms = body.model_setting;
                  conn.query(
                    `INSERT INTO model_setting
                       (prompt_version_id, ai_model_id,
                        temperature, max_token, top_p,
                        frequency_penalty, presence_penalty)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                      verId,
                      ms.ai_model_id,
                      ms.temperature || 1.0,
                      ms.max_token || null,
                      ms.top_p || null,
                      ms.frequency_penalty || null,
                      ms.presence_penalty || null
                    ],
                    function(err5){ next(err5); }
                  );
                }

                doneModelSetting(function(err6){
                  if (err6) return cb(err6);

                  // 5) 항상 이 버전을 latest_version으로 세팅
                  conn.query(
                    'UPDATE prompt SET latest_version_id = ? WHERE id = ?',
                    [verId, promptId],
                    function(err7){
                      if (err7) return cb(err7);
                      cb(null, { id: verId, version_number, is_draft: false });
                    }
                  );
                });
              }
            );
          });
        }
      );
    });
  }, done);
};



exports.getVersion = function(userId, promptId, verId, done){
  ensurePromptViewer(userId, promptId, function(err){
    if (err) return done(err);

    pool.query(
      `SELECT pv.*, c.code AS category_code, c.name_kr AS category_name
       FROM prompt_version pv
       LEFT JOIN category c ON c.id = pv.category_id
       WHERE pv.id = ? AND pv.prompt_id = ?`,
      [verId, promptId],
      function(err2, rows){
        if (err2) return done(err2);
        if (!rows.length) return done(null, null);

        pool.query('SELECT * FROM model_setting WHERE prompt_version_id = ?', [verId], function(err3, ms){
          if (err3) return done(err3);
          const v = rows[0];
          v.model_setting = ms[0] || null;
          done(null, v);
        });
      }
    );
  });
};

exports.updateVersion = function(userId, promptId, verId, patch, done){
  withTx(function(conn, cb){
    ensureOwner(conn, userId, promptId, function(err){
      if (err) return cb(err);

      function resolveCategory(next){
        if (patch.category_code === undefined) return next(null, undefined);
        getCategoryIdByCode(conn, patch.category_code, next);
      }

      resolveCategory(function(err2, categoryId){
        if (err2) return cb(err2);

        const fields = [];
        const params = [];

        if (patch.commit_message !== undefined) {
          fields.push('commit_message = ?');
          params.push(patch.commit_message);
        }
        // is_draft는 이제 안 건드림
        if (patch.category_code !== undefined) {
          fields.push('category_id = ?');
          params.push(categoryId);
        }

        function afterUpdate(){
          // 이제 latest_version_id는 create에서만 바꾸고,
          // 여기서는 단순히 수정 결과만 리턴
          conn.query(
            'SELECT id, is_draft FROM prompt_version WHERE id = ?',
            [verId],
            function(e4, r){
              if (e4) return cb(e4);
              cb(null, r[0]);
            }
          );
        }

        if (fields.length) {
          conn.query(
            'UPDATE prompt_version SET ' + fields.join(', ') + ' WHERE id = ?',
            [...params, verId],
            function(e2){
              if (e2) return cb(e2);
              afterUpdate();
            }
          );
        } else {
          afterUpdate();
        }
      });
    });
  }, done);
};

exports.deleteVersion = function(userId, promptId, verId, done){
  withTx(function(conn, cb){
    ensureOwner(conn, userId, promptId, function(err){
      if (err) return cb(err);

      conn.query(
        'SELECT COUNT(*) AS c FROM prompt_version WHERE prompt_id = ?',
        [promptId],
        function(e2, cnt){
          if (e2) return cb(e2);
          if (Number(cnt[0].c) <= 1) {
            return cb(httpError(400, 'LAST_VERSION_DELETION_FORBIDDEN'));
          }

          conn.query(
            'SELECT latest_version_id FROM prompt WHERE id = ?',
            [promptId],
            function(e3, r){
              if (e3) return cb(e3);
              const latestId = r[0] ? r[0].latest_version_id : null;

              conn.query(
                'DELETE FROM prompt_version WHERE id = ?',
                [verId],
                function(e4){
                  if (e4) return cb(e4);

                  if (latestId === verId) {
                    // 남은 버전 중 version_number 가장 큰 걸 latest로
                    conn.query(
                      `SELECT id
                         FROM prompt_version
                        WHERE prompt_id = ?
                        ORDER BY version_number DESC
                        LIMIT 1`,
                      [promptId],
                      function(e5, lv){
                        if (e5) return cb(e5);
                        const newLatest = lv[0] ? lv[0].id : null;

                        conn.query(
                          'UPDATE prompt SET latest_version_id = ? WHERE id = ?',
                          [newLatest, promptId],
                          function(e6){
                            if (e6) return cb(e6);
                            cb(null);
                          }
                        );
                      }
                    );
                  } else {
                    cb(null);
                  }
                }
              );
            }
          );
        }
      );
    });
  }, done);
};

// 모델 세팅
exports.getModelSetting = async (userId, promptId, verId) => {
  await ensurePromptViewerAsync(userId, promptId);
  const [rows] = await pool.promise().query('SELECT * FROM model_setting WHERE prompt_version_id = ?', [verId]);

  // 4. 콜백(done) 대신, 값을 바로 return 합니다.
  return rows[0] || null;
};


exports.updateModelSetting = function(userId, promptId, verId, patch, done){
  withTx(function(conn, cb){
    ensureOwner(conn, userId, promptId, function(err){
      if (err) return cb(err);

      conn.query('SELECT prompt_version_id FROM model_setting WHERE prompt_version_id = ?', [verId], function(e2, ex){
        if (e2) return cb(e2);
        if (!ex.length) return cb(httpError(404, 'Model setting not found'));

        const fields = [];
        const params = [];
        const keys = ['ai_model_id','temperature','max_token','top_p','frequency_penalty','presence_penalty'];
        for (var k=0;k<keys.length;k++){
          var key = keys[k];
          if (patch[key] !== undefined) { fields.push(key + ' = ?'); params.push(patch[key]); }
        }
        if (!fields.length) return cb(null, true);

        conn.query('UPDATE model_setting SET ' + fields.join(', ') + ' WHERE prompt_version_id = ?', [...params, verId], function(e3){
          if (e3) return cb(e3);
          cb(null, true);
        });
      });
    });
  }, done);
};

/**
 * 즐겨찾기 추가
 * userId: 사용자 id
 * promptId: 프롬프트 id (URL 의 :id)
 * verId: 프롬프트 버전 id (URL 의 :verId = prompt_version.id)
 */
exports.addFavorite = function (userId, promptId, verId, done) {
  try {
    if (!userId) return done(httpError(401, 'UNAUTHORIZED'));
    if (!promptId || !verId) return done(httpError(400, 'INVALID_ID'));

    // 1) 이 버전이 해당 프롬프트에 실제로 속하는지 검증
    pool.query(
      `
      SELECT id 
      FROM prompt_version
      WHERE id = ? AND prompt_id = ?
      `,
      [verId, promptId],
      function (err, rows) {
        if (err) return done(err);
        if (!rows.length) {
          return done(httpError(404, 'VERSION_NOT_FOUND'));
        }

        // 2) 즐겨찾기 INSERT 
        pool.query(
          `
          INSERT IGNORE INTO favorite
            (user_id, prompt_version_id, created_at)
          VALUES (?, ?, NOW())
          `,
          [userId, verId],
          function (err2, result) {
            if (err2) return done(err2);

            const ok = result.affectedRows > 0;
            return done(null, ok);
          }
        );
      }
    );
  } catch (err) {
    done(err);
  }
};


/**
 * 즐겨찾기 제거
 */
exports.removeFavorite = function (userId, promptId, verId, done) {
  try {
    if (!userId) return done(httpError(401, 'UNAUTHORIZED'));
    if (!promptId || !verId) return done(httpError(400, 'INVALID_ID'));

    pool.query(
      `
      DELETE f
      FROM favorite f
      JOIN prompt_version v ON v.id = f.prompt_version_id
      WHERE f.user_id = ?
        AND f.prompt_version_id = ?
        AND v.prompt_id = ?
      `,
      [userId, verId, promptId],
      function (err, result) {
        if (err) return done(err);
        return done(null);
      }
    );
  } catch (err) {
    done(err);
  }
};

/**
 * 댓글 목록 조회
 * GET /api/v1/prompts/:id/versions/:verId/comments
 */
exports.listComments = function (userId, promptId, verId, q, done) {
  try {
    const page 	= Number(q && q.page 	? q.page 	: 1);
    const limit = Number(q && q.limit ? q.limit : 20);
    const offset = (page - 1) * limit;

    if (!Number.isFinite(limit) || limit <= 0 || limit > 100) {
      return done(httpError(400, 'INVALID_LIMIT'));
    }

    // 1) 목록
    const listSql = `
      SELECT
        c.id,
        c.prompt_version_id,
        c.author_id,
        u.user_name,
        u.email,
        c.body,
        c.created_at
      FROM comment c
      JOIN prompt_version v ON v.id = c.prompt_version_id
      JOIN user u ON u.id = c.author_id
      WHERE v.prompt_id = ? AND v.id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const params = [promptId, verId, limit, offset];

    pool.query(listSql, params, function (err, rows) {
      if (err) return done(err);

      // 2) total 카운트
      const cntSql = `
        SELECT COUNT(*) AS total
        FROM comment c
        JOIN prompt_version v ON v.id = c.prompt_version_id
        WHERE v.prompt_id = ? AND v.id = ?
      `;
      pool.query(cntSql, [promptId, verId], function (err2, cntRows) {
        if (err2) return done(err2);

        const total = cntRows[0] ? Number(cntRows[0].total) : 0;

        const items = rows.map((row) => ({
          id: row.id,
          prompt_version_id: row.prompt_version_id,
          author_id: row.author_id, // 🚨 수정: user_id 대신 author_id 사용 (DB 스키마에 맞춤)
          author: {
            username: row.user_name, // 🚨 수정: row.username 대신 row.user_name 사용 (SQL SELECT에 맞춤)
            email: row.email,
          },
          body: row.body,
          created_at: row.created_at,
        }));

        done(null, { items, page, limit, total });
      });
    });
  } catch (err) {
    done(err);
  }
};

/**
 * 댓글 작성
 * POST /api/v1/prompts/:id/versions/:verId/comments
 */
exports.addComment = function (userId, promptId, verId, bodyText, done) {
  try {
    const text = (bodyText || '').trim();
    if (!text) {
      return done(httpError(400, 'COMMENT_BODY_REQUIRED'));
    }

    // SQL 쿼리 내부의 주석(//)을 제거하여 MySQL 구문 오류를 해결합니다.
    const sql = `
      INSERT INTO comment (prompt_version_id, author_id, body, created_at)
      VALUES (?, ?, ?, NOW())
    `;

    pool.query(sql, [verId, userId, text], function (err, result) {
      if (err) return done(err);

      done(null, {
        id: result.insertId,
        prompt_version_id: verId,
        author_id: userId,
        body: text,
      });
    });
  } catch (err) {
    done(err);
  }
};

/**
 * 댓글 삭제
 * DELETE /api/v1/comments/:commentId
 */
exports.deleteComment = function (userId, commentId, done) {
  try {
    const sql = `
      DELETE FROM comment
      WHERE id = ? AND author_id = ?
    `;
    pool.query(sql, [commentId, userId], function (err, result) {
      if (err) return done(err);

      if (!result.affectedRows) {
        return done(httpError(404, 'COMMENT_NOT_FOUND'));
      }

      done(null, true);
    });
  } catch (err) {
    done(err);
  }
};


exports.listCategories = (callback) => {
    // 카테고리 테이블의 필드 이름이 code와 name_kr이라고 가정합니다.
    const sql = `
        SELECT code, name_kr
        FROM category
        ORDER BY name_kr
    `;

    // **중요:** 이전 'NaN' 에러를 막기 위해, 이 함수는 WHERE 절을 사용하지 않고
    // 모든 카테고리를 조회합니다. 사용자별 필터링이 필요하다면 여기에 로직을 추가해야 합니다.
    
    pool.query(sql, [], (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return callback(err);
        }
        // 결과를 그대로 반환합니다.
        callback(null, results);
    });
};

exports.listTags = (q, callback) => {
    let sql = `
        SELECT DISTINCT name 
        FROM tag 
    `;
    const params = [];

    if (q) {
        // 검색어가 있으면 LIKE 쿼리를 추가하여 필터링합니다.
        sql += ` WHERE name LIKE ?`;
        params.push(`%${q}%`);
    }

    // 데이터베이스 쿼리 실행
    pool.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching tags:', err);
            return callback(err);
        }
        // 결과에서 태그 이름만 추출하여 배열로 반환합니다.
        const tags = results.map(row => row.name);
        callback(null, tags);
    });
};
