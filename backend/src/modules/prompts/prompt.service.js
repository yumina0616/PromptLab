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

// 2) 목록
exports.listPrompts = function(userId, q, done){
  const where = [];
  const params = [];

  if (q && q.owner === 'me') { where.push('p.owner_id = ?'); params.push(userId); }
  if (q && q.visibility) { where.push('p.visibility = ?'); params.push(q.visibility); }
  if (q && q.q) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push('%'+q.q+'%', '%'+q.q+'%'); }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const orderSql = 'ORDER BY p.created_at DESC';
  const limit = Number(q && q.limit ? q.limit : 20);
  const page = Number(q && q.page ? q.page : 1);
  const offset = (page - 1) * limit;

  const sql = `
    SELECT p.id, p.name, p.description, p.visibility, p.latest_version_id
    FROM prompt p
    ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?`;

  params.push(limit, offset);

  pool.query(sql, params, function(err, rows){
    if (err) return done(err);

    // 태그/최신버전 붙이기(간단히 순차 조회)
    let i = 0;
    const items = [];
    function next(){
      if (i >= rows.length) return done(null, { items });
      const row = rows[i++];

      pool.query(
        `SELECT t.name FROM prompt_tag pt JOIN tag t ON t.id=pt.tag_id WHERE pt.prompt_id = ?`,
        [row.id],
        function(err2, tagRows){
          if (err2) return done(err2);

          if (row.latest_version_id) {
            pool.query('SELECT id, version_number FROM prompt_version WHERE id = ?', [row.latest_version_id], function(err3, lv){
              if (err3) return done(err3);
              items.push({
                id: row.id,
                name: row.name,
                description: row.description,
                visibility: row.visibility,
                tags: tagRows.map(t => t.name),
                latest_version: lv[0] || null
              });
              next();
            });
          } else {
            pool.query(
              'SELECT id, version_number FROM prompt_version WHERE prompt_id = ? ORDER BY version_number DESC LIMIT 1',
              [row.id],
              function(err3, lv){
                if (err3) return done(err3);
                items.push({
                  id: row.id,
                  name: row.name,
                  description: row.description,
                  visibility: row.visibility,
                  tags: tagRows.map(t => t.name),
                  latest_version: lv[0] || null
                });
                next();
              }
            );
          }
        }
      );
    }
    next();
  });
};

// 3) 상세
exports.getPrompt = function(userId, id, done){
  pool.query('SELECT * FROM prompt WHERE id = ?', [id], function(err, rows){
    if (err) return done(err);
    if (!rows.length) return done(null, null);
    const p = rows[0];

    pool.query(
      'SELECT t.name FROM prompt_tag pt JOIN tag t ON t.id=pt.tag_id WHERE pt.prompt_id = ?',
      [id],
      function(err2, tags){
        if (err2) return done(err2);

        function finish(latest){
          done(null, {
            id: p.id,
            name: p.name,
            description: p.description,
            visibility: p.visibility,
            tags: tags.map(t => t.name),
            latest_version: latest
          });
        }

        if (p.latest_version_id) {
          pool.query('SELECT id, version_number FROM prompt_version WHERE id = ?', [p.latest_version_id], function(err3, lv){
            if (err3) return done(err3);
            return finish(lv[0] || null);
          });
        } else {
          pool.query(
            'SELECT id, version_number FROM prompt_version WHERE prompt_id = ? ORDER BY version_number DESC LIMIT 1',
            [id],
            function(err3, lv){
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
  // 권한 체크는 소유자 기준으로 단순 처리 (추후 공유권한 확장)
  pool.query('SELECT owner_id FROM prompt WHERE id = ?', [promptId], function(err, r){
    if (err) return done(err);
    if (!r.length) return done(httpError(404,'Prompt not found'));
    if (r[0].owner_id !== userId) return done(httpError(403,'Forbidden'));

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

      conn.query(
        'SELECT IFNULL(MAX(version_number), 0) + 1 AS next_no FROM prompt_version WHERE prompt_id = ?',
        [promptId],
        function(err2, cnt){
          if (err2) return cb(err2);
          const version_number = cnt[0].next_no;

          getCategoryIdByCode(conn, body.category_code, function(err3, categoryId){
            if (err3) return cb(err3);

            // ✅ 1) 이번 버전을 확정(is_draft=false)으로 만들 거라면
            //    기존 확정 버전들(is_draft = 0)을 모두 1로 올려준다.
            function updateOldDrafts(next){
              if (body.is_draft === false) {
                conn.query(
                  'UPDATE prompt_version SET is_draft = 1 WHERE prompt_id = ? AND is_draft = 0',
                  [promptId],
                  function(err) { next(err); }
                );
              } else {
                next(null);
              }
            }

            updateOldDrafts(function(err4){
              if (err4) return cb(err4);

              // ✅ 2) 새 버전 insert
              conn.query(
                `INSERT INTO prompt_version
                 (prompt_id, version_number, commit_message, content, is_draft, revision, created_by, category_id)
                 VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
                [
                  promptId,
                  version_number,
                  body.commit_message,
                  body.content,
                  body.is_draft ? 1 : 0,
                  userId,
                  categoryId
                ],
                function(err5, vr){
                  if (err5) return cb(err5);
                  const verId = vr.insertId;

                  function doneModelSetting(next){
                    if (!body.model_setting) return next();
                    const ms = body.model_setting;
                    conn.query(
                      `INSERT INTO model_setting
                       (prompt_version_id, ai_model_id, temperature, max_token, top_p, frequency_penalty, presence_penalty)
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
                      function(err6){ next(err6); }
                    );
                  }

                  doneModelSetting(function(err7){
                    if (err7) return cb(err7);

                    if (body.is_draft) {
                      return cb(null, { id: verId, version_number, is_draft: true });
                    }

                    conn.query(
                      'UPDATE prompt SET latest_version_id = ? WHERE id = ?',
                      [verId, promptId],
                      function(err8){
                        if (err8) return cb(err8);
                        cb(null, { id: verId, version_number, is_draft: false });
                      }
                    );
                  });
                }
              );
            });
          });
        }
      );
    });
  }, done);
};


exports.getVersion = function(userId, promptId, verId, done){
  pool.query('SELECT owner_id FROM prompt WHERE id = ?', [promptId], function(err, r){
    if (err) return done(err);
    if (!r.length) return done(httpError(404,'Prompt not found'));
    if (r[0].owner_id !== userId) return done(httpError(403,'Forbidden'));

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
        if (patch.commit_message !== undefined) { fields.push('commit_message = ?'); params.push(patch.commit_message); }
        if (patch.is_draft !== undefined) { fields.push('is_draft = ?'); params.push(patch.is_draft ? 1 : 0); }
        if (patch.category_code !== undefined) { fields.push('category_id = ?'); params.push(categoryId); }

        function afterUpdate(){
          if (patch.is_draft === false) {
            conn.query('UPDATE prompt SET latest_version_id = ? WHERE id = ?', [verId, promptId], function(e3){
              if (e3) return cb(e3);
              conn.query('SELECT id, is_draft FROM prompt_version WHERE id = ?', [verId], function(e4, r){
                if (e4) return cb(e4);
                cb(null, r[0]);
              });
            });
          } else {
            conn.query('SELECT id, is_draft FROM prompt_version WHERE id = ?', [verId], function(e4, r){
              if (e4) return cb(e4);
              cb(null, r[0]);
            });
          }
        }

        if (fields.length) {
          conn.query('UPDATE prompt_version SET ' + fields.join(', ') + ' WHERE id = ?', [...params, verId], function(e2){
            if (e2) return cb(e2);
            afterUpdate();
          });
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

      conn.query('SELECT COUNT(*) AS c FROM prompt_version WHERE prompt_id = ?', [promptId], function(e2, cnt){
        if (e2) return cb(e2);
        if (Number(cnt[0].c) <= 1) return cb(httpError(400, 'LAST_VERSION_DELETION_FORBIDDEN'));

        conn.query('SELECT latest_version_id FROM prompt WHERE id = ?', [promptId], function(e3, r){
          if (e3) return cb(e3);
          const latestId = r[0] ? r[0].latest_version_id : null;

          conn.query('DELETE FROM prompt_version WHERE id = ?', [verId], function(e4){
            if (e4) return cb(e4);

            if (latestId === verId) {
              conn.query(
                `SELECT id FROM prompt_version
                 WHERE prompt_id = ? AND is_draft = 0
                 ORDER BY version_number DESC LIMIT 1`,
                [promptId],
                function(e5, lv){
                  if (e5) return cb(e5);
                  const newLatest = lv[0] ? lv[0].id : null;
                  conn.query('UPDATE prompt SET latest_version_id = ? WHERE id = ?', [newLatest, promptId], function(e6){
                    if (e6) return cb(e6);
                    cb(null);
                  });
                }
              );
            } else {
              cb(null);
            }
          });
        });
      });
    });
  }, done);
};

// 모델 세팅
exports.getModelSetting = async (userId, promptId, verId) => {
  
  // 1. pool.query에 콜백 대신 await을 사용합니다.
  const [r] = await pool.query('SELECT owner_id FROM prompt WHERE id = ?', [promptId]);

  // 2. 에러 및 권한 검사
  if (!r.length) throw httpError(404,'Prompt not found');
  if (r[0].owner_id !== userId) throw httpError(403,'Forbidden');

  // 3. 두 번째 쿼리 실행
  const [rows] = await pool.query('SELECT * FROM model_setting WHERE prompt_version_id = ?', [verId]);

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
