// src/modules/playground/playground.service.js
const pool = require('../../shared/db');
const promptSvc = require('../prompts/prompt.service');

function httpError(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

// 아주 단순한 가짜 분석기
function runAnalyzer(text, rules) {
  const len = text ? text.length : 0;
  let score = Math.max(50, Math.min(95, 60 + Math.floor(len / 20)));

  const issues = [];
  const suggestions = [];

  if (len < 30) {
    issues.push({
      type: 'short',
      message: '프롬프트가 너무 짧습니다.',
      range: { start: 0, end: len }
    });
    suggestions.push({
      title: '요구사항 상세화',
      example: '출력 형식과 의도를 명확히 적어보세요.'
    });
  }

  return { enabled: true, score, issues, suggestions };
}

/**
 * source 에서 prompt_version_id를 구하는 helper
 * - source.prompt_version_id 있으면 그거 그대로
 * - source.prompt_id만 있으면 prompt.latest_version_id 조회
 * - 없으면 null
 */
function resolvePromptVersionId(source, cb) {
  if (!source) return cb(null, null);

  if (source.prompt_version_id) {
    return cb(null, source.prompt_version_id);
  }

  if (source.prompt_id) {
    pool.query(
      'SELECT latest_version_id FROM prompt WHERE id = ?',
      [source.prompt_id],
      function (err, rows) {
        if (err) return cb(err);
        if (!rows.length || !rows[0].latest_version_id) {
          console.warn(
            '[runPlayground] prompt_id는 있으나 latest_version_id 없음:',
            source.prompt_id
          );
          return cb(null, null);
        }
        return cb(null, rows[0].latest_version_id);
      }
    );
    return;
  }

  return cb(null, null);
}

// 1) 실행(run)
exports.runPlayground = function (userId, body, cb) {
  try {
    if (!body || !body.prompt_text || !body.model_id) {
      return cb(httpError(400, 'prompt_text, model_id 필수'));
    }

    const promptText  = body.prompt_text;
    const modelParams = body.model_params || {};
    const source      = body.source || null;
    const analyzerOpt = body.analyzer || {};

    const renderedPrompt = promptText;
    const fakeOutput =
      `[MOCK_OUTPUT]\n\n${renderedPrompt}\n\n(여기에 실제 모델 응답이 들어갈 예정입니다.)`;

    const usage = {
      input_tokens: renderedPrompt.length,
      output_tokens: fakeOutput.length,
    };

    let analyzerResult = null;
    if (analyzerOpt.enabled) {
      analyzerResult = runAnalyzer(promptText, analyzerOpt.rules);
    }

    // 1단계: prompt_version_id 결정
    resolvePromptVersionId(source, function (err, promptVersionId) {
      if (err) {
        console.error('[runPlayground] resolvePromptVersionId 실패:', err);
        promptVersionId = null; // 기록 실패해도 실행 결과는 돌려줄 거라서 null 처리
      }

      // 2단계: playground_history INSERT
      const modelSettingJson = JSON.stringify({
        temperature: modelParams.temperature ?? 1.0,
        max_token:   modelParams.max_token ?? null,
        top_p:       modelParams.top_p ?? null,
      });

      pool.query(
        `INSERT INTO playground_history
           (prompt_version_id, model_id, user_id,
            test_content, model_setting, output, tested_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          promptVersionId,
          body.model_id,
          userId,
          renderedPrompt,
          modelSettingJson,
          fakeOutput,
        ],
        function (err2, result) {
          let historyId = null;
          if (err2) {
            console.error('playground_history INSERT 실패:', err2);
          } else if (result && result.insertId) {
            historyId = result.insertId;
          }

          return cb(null, {
            output: fakeOutput,
            usage,
            model: {
              id: body.model_id,
              temperature: modelParams.temperature ?? 1.0,
              max_token:   modelParams.max_token ?? null,
              top_p:       modelParams.top_p ?? null,
            },
            analyzer: analyzerResult || { enabled: false },
            history_id: historyId,
            status: 'success',
          });
        }
      );
    });
  } catch (err) {
    cb(err);
  }
};

// 2) 품질 점검만
exports.grammarCheck = function(userId, body, cb) {
  if (!body || !body.prompt_text) {
    return cb(httpError(400, 'prompt_text 필수'));
  }
  const rules = body.rules || ['clarity','structure','variables','safety'];

  const res = runAnalyzer(body.prompt_text, rules);

  const checks = {
    clarity: 0.8,
    structure: 0.7,
    variables: 0.6,
    safety: 0.9
  };

  cb(null, {
    score: res.score,
    issues: res.issues,
    suggestions: res.suggestions,
    checks
  });
};

// 3) 히스토리 목록
exports.listHistory = function (userId, query, cb) {
  try {
    const page  = query.page  ? Number(query.page)  : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = (page - 1) * limit;

    const where  = ['user_id = ?'];
    const params = [userId];

    if (query.model_id) {
      where.push('model_id = ?');
      params.push(Number(query.model_id));
    }

    if (query.prompt_version_id) {
      where.push('prompt_version_id = ?');
      params.push(Number(query.prompt_version_id));
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    const listSql = `
      SELECT
        id,
        prompt_version_id,
        model_id,
        user_id,
        test_content,
        model_setting,
        output,
        tested_at
      FROM playground_history
      ${whereSql}
      ORDER BY tested_at DESC
      LIMIT ? OFFSET ?
    `;

    pool.query(
      listSql,
      [...params, limit, offset],
      function (err, rows) {
        if (err) return cb(err);

        pool.query(
          `
          SELECT COUNT(*) AS total
          FROM playground_history
          ${whereSql}
        `,
          params,
          function (err2, countRows) {
            if (err2) return cb(err2);

            const total = countRows[0] ? Number(countRows[0].total) : 0;

            const items = rows.map((row) => {
              let modelSetting = row.model_setting;

              if (typeof modelSetting === 'string') {
                try {
                  modelSetting = JSON.parse(modelSetting);
                } catch (e) {}
              }

              return {
                id: row.id,
                prompt_version_id: row.prompt_version_id,
                model_id: row.model_id,
                user_id: row.user_id,
                test_content: row.test_content,
                model_setting: modelSetting,
                output: row.output,
                tested_at: row.tested_at,
                analyzer: {
                  enabled: false
                }
              };
            });

            return cb(null, { items, page, limit, total });
          }
        );
      }
    );
  } catch (err) {
    cb(err);
  }
};

// 4) 히스토리 상세
exports.getHistory = function (userId, historyId, cb) {
  try {
    pool.query(
      `
      SELECT
        id,
        prompt_version_id,
        model_id,
        user_id,
        test_content,
        model_setting,
        output,
        tested_at
      FROM playground_history
      WHERE id = ? AND user_id = ?
    `,
      [historyId, userId],
      function (err, rows) {
        if (err) return cb(err);
        if (!rows.length) {
          return cb(httpError(404, 'HISTORY_NOT_FOUND'));
        }

        const row = rows[0];
        let modelSetting = row.model_setting;

        if (typeof modelSetting === 'string') {
          try {
            modelSetting = JSON.parse(modelSetting);
          } catch (e) {}
        }

        const item = {
          id: row.id,
          prompt_version_id: row.prompt_version_id,
          model_id: row.model_id,
          user_id: row.user_id,
          test_content: row.test_content,
          model_setting: modelSetting,
          output: row.output,
          tested_at: row.tested_at,
          analyzer: {
            enabled: false
          }
        };

        return cb(null, item);
      }
    );
  } catch (err) {
    cb(err);
  }
};

// 5) 히스토리 삭제
exports.deleteHistory = function (userId, historyId, cb) {
  try {
    if (!historyId) {
      return cb(httpError(400, 'INVALID_HISTORY_ID'));
    }

    pool.query(
      'DELETE FROM playground_history WHERE id = ? AND user_id = ?',
      [historyId, userId],
      function (err, result) {
        if (err) return cb(err);
        if (!result || result.affectedRows === 0) {
          return cb(httpError(404, 'HISTORY_NOT_FOUND'));
        }
        cb(null, true);
      }
    );
  } catch (err) {
    cb(err);
  }
};

// 6) 저장(프롬프트/버전화 연동)
exports.saveFromPlayground = function (userId, body, cb) {
  console.log('[saveFromPlayground] userId =', userId, 'body =', body);

  if (!body || typeof body !== 'object') {
    return cb(httpError(400, '잘못된 body'));
  }

  const mode = body.mode;
  if (!mode) {
    return cb(httpError(400, 'mode 필수'));
  }

  // content + model_setting 확보
  function resolveContentAndModelSetting(cb2) {
    const sourceId = body.source_history_id;

    if (sourceId) {
      console.log('[saveFromPlayground] resolve from history:', sourceId);

      pool.query(
        `SELECT test_content, model_setting, model_id
           FROM playground_history
          WHERE id = ? AND user_id = ?`,
        [sourceId, userId],
        function (err, rows) {
          if (err) return cb2(err);
          console.log('[saveFromPlayground] history rows length =', rows.length);
          if (!rows.length) {
            return cb2(httpError(404, 'HISTORY_NOT_FOUND'));
          }

          const row = rows[0];
          let ms = row.model_setting;

          if (typeof ms === 'string') {
            try { ms = JSON.parse(ms); } catch (e) {}
          }
          if (!ms || typeof ms !== 'object') {
            ms = {};
          }

          if (!ms.ai_model_id && row.model_id) {
            ms.ai_model_id = row.model_id;
          }

          return cb2(null, {
            content: row.test_content,
            model_setting: ms,
          });
        }
      );
      return;
    }

    const v = body.version || {};

    if (!v.content || !v.model_setting) {
      return cb2(
        httpError(
          400,
          'content, model_setting 필수 (또는 source_history_id 필요)'
        )
      );
    }

    return cb2(null, {
      content: v.content,
      model_setting: v.model_setting,
    });
  }

  // mode = new_prompt
  if (mode === 'new_prompt') {
    const p = body.prompt || {};
    const v = body.version || {};

    if (!p.name) {
      return cb(httpError(400, 'prompt.name 필수'));
    }
    if (!v.commit_message) {
      return cb(httpError(400, 'version.commit_message 필수'));
    }

    resolveContentAndModelSetting(function (err, resolved) {
      if (err) return cb(err);

      const payload = {
        name: p.name,
        description: p.description || null,
        visibility: p.visibility || 'public',
        tags: p.tags || [],
        content: resolved.content,
        commit_message: v.commit_message,
        category_code: v.category_code,
        is_draft: !!v.is_draft,
        model_setting: resolved.model_setting,
      };

      console.log('[saveFromPlayground] new_prompt payload =', payload);

      promptSvc.createPromptWithFirstVersion(
        userId,
        payload,
        function (err2, r) {
          if (err2) {
            console.error('[saveFromPlayground] createPromptWithFirstVersion ERR:', err2);
            return cb(err2);
          }

          return cb(null, {
            prompt_id: r.id,
            prompt_version_id: r.latest_version_id || null,
            latest_version_updated: !payload.is_draft,
          });
        }
      );
    });
    return;
  }

  // mode = new_version
  if (mode === 'new_version') {
    const targetPromptId = body.target_prompt_id;
    const v = body.version || {};

    if (!targetPromptId) {
      return cb(httpError(400, 'target_prompt_id 필수'));
    }
    if (!v.commit_message) {
      return cb(httpError(400, 'version.commit_message 필수'));
    }

    resolveContentAndModelSetting(function (err, resolved) {
      if (err) return cb(err);

      const payload = {
        content: resolved.content,
        commit_message: v.commit_message,
        category_code: v.category_code,
        is_draft: !!v.is_draft,
        model_setting: resolved.model_setting,
      };

      console.log('[saveFromPlayground] new_version payload =', payload);

      promptSvc.createVersion(
        userId,
        targetPromptId,
        payload,
        function (err2, r) {
          if (err2) {
            console.error('[saveFromPlayground] createVersion ERR:', err2);
            return cb(err2);
          }

          return cb(null, {
            prompt_id: targetPromptId,
            prompt_version_id: r.id,
            latest_version_updated: !payload.is_draft,
          });
        }
      );
    });
    return;
  }

  return cb(httpError(400, 'UNKNOWN_MODE'));
};

// 7) 플레이그라운드 설정 조회
exports.getSettings = function(userId, cb) {
  cb(null, {
    analyzer_default_enabled: true,
    default_model_id: 3,
    default_params: { temperature: 0.7, max_token: 1024, top_p: 1.0 }
  });
};

// 8) 플레이그라운드 설정 수정
exports.updateSettings = function(userId, patch, cb) {
  cb(null, { updated: true });
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
    
    db.query(sql, [], (err, results) => {
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
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching tags:', err);
            return callback(err);
        }
        // 결과에서 태그 이름만 추출하여 배열로 반환합니다.
        const tags = results.map(row => row.name);
        callback(null, tags);
    });
};