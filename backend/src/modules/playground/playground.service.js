const pool = require('../../shared/db');
const promptSvc = require('../prompts/prompt.service');

function httpError(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

// 아주 단순한 “가짜 분석기”
function runAnalyzer(promptText, rules) {
  const len = promptText ? promptText.length : 0;

  const issues = [];
  const suggestions = [];

  if (len < 30) {
    issues.push({
      type: 'short',
      message: '프롬프트가 너무 짧습니다. 의도와 출력 형식을 더 구체적으로 적어 보세요.',
      range: { start: 0, end: len }
    });
    suggestions.push({
      title: '요구사항 상세화',
      example: '예: 원하는 출력 형식(목록/표/JSON)과 대상 사용자(초보자/전문가)를 명시해 보세요.'
    });
  }

  const score = Math.max(50, Math.min(95, 60 + Math.floor(len / 20)));

  return {
    enabled: true,
    score,
    issues,
    suggestions
  };
}


// 아주 단순한 가짜 분석기
function runAnalyzer(text, rules) {
  const len = text.length;
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



// src/modules/playground/playground.service.js 상단에서 이미:
// const pool = require('../../shared/db');  // 되어 있다고 가정

exports.runPlayground = async function (userId, body, cb) {
  try {
    if (!body || !body.prompt_text || !body.model_id) {
      return cb(httpError(400, 'prompt_text, model_id 필수'));
    }

    const promptText  = body.prompt_text;
    const modelParams = body.model_params || {};
    const variables   = body.variables || {};
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

    // ─────────────────────────────
    // ① source.prompt_id / prompt_version_id 처리
    // ─────────────────────────────
    let promptVersionId = null;

    if (source) {
      if (source.prompt_version_id) {
        // 프론트에서 버전 id를 직접 넘긴 경우
        promptVersionId = source.prompt_version_id;
      } else if (source.prompt_id) {
        // prompt_id만 들어온 경우 → latest_version_id를 찾아서 사용
        const [prow] = await pool.query(
          'SELECT latest_version_id FROM prompt WHERE id = ?',
          [source.prompt_id]
        );
        if (prow.length && prow[0].latest_version_id) {
          promptVersionId = prow[0].latest_version_id;
        } else {
          // 프롬프트가 없거나 latest_version_id가 없으면 그냥 null로 둠
          // (필요하면 여기서 에러를 던져도 됨)
          console.warn(
            '[runPlayground] prompt_id는 있으나 latest_version_id 없음:',
            source.prompt_id
          );
        }
      }
    }

    // ─────────────────────────────
    // ② playground_history INSERT
    // ─────────────────────────────
    let historyId = null;
    try {
      const modelSettingJson = JSON.stringify({
        temperature: modelParams.temperature ?? 1.0,
        max_token:   modelParams.max_token ?? null,
        top_p:       modelParams.top_p ?? null,
      });

      const [result] = await pool.query(
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
        ]
      );
      historyId = result.insertId;
    } catch (e) {
      console.error('playground_history INSERT 실패:', e);
      // 기록 실패해도 실행 결과는 그대로 돌려줌
    }

    // ─────────────────────────────
    // ③ 최종 응답
    // ─────────────────────────────
    cb(null, {
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

  // 아주 단순한 가중치로 checks 구성
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
exports.listHistory = async function (userId, query, cb) {
  try {
    const page  = Number(query.page)  > 0 ? Number(query.page)  : 1;
    const limit = Number(query.limit) > 0 && Number(query.limit) <= 100
      ? Number(query.limit)
      : 20;
    const offset = (page - 1) * limit;

    const where = ['user_id = ?'];
    const params = [userId];

    // model_id 필터
    if (query.model_id) {
      where.push('model_id = ?');
      params.push(Number(query.model_id));
    }

    // 날짜 필터: from, to (YYYY-MM-DD)
    if (query.from) {
      where.push('tested_at >= ?');
      params.push(query.from);              // '2025-11-13' 이런 식
    }
    if (query.to) {
      where.push('tested_at <= ?');
      params.push(query.to + ' 23:59:59');  // 끝날짜 하루의 끝까지
    }

    const whereSql = 'WHERE ' + where.join(' AND ');

    // total 개수
    const countSql = `
      SELECT COUNT(*) AS cnt
      FROM playground_history
      ${whereSql}
    `;
    const [cntRows] = await pool.query(countSql, params);
    const total = Number(cntRows[0].cnt) || 0;

    // 실제 목록
    const listSql = `
      SELECT
        id,
        prompt_version_id,
        model_id,
        tested_at,
        CHAR_LENGTH(test_content) AS input_len,
        CHAR_LENGTH(output)      AS output_len
      FROM playground_history
      ${whereSql}
      ORDER BY tested_at DESC
      LIMIT ? OFFSET ?
    `;
    const listParams = params.slice();
    listParams.push(limit, offset);

    const [rows] = await pool.promise().query(listSql, listParams);

    const items = rows.map(r => ({
      id: r.id,
      prompt_version_id: r.prompt_version_id,
      model_id: r.model_id,
      tested_at: r.tested_at,
      summary: {
        input_len: r.input_len,
        output_len: r.output_len,
        analyzer_score: null,   // 아직 analyzer 결과는 DB에 없으니까 null
        status: 'success'       // 지금은 전부 success로 가정
      }
    }));

    cb(null, { items, page, limit, total });
  } catch (err) {
    cb(err);
  }
};


// 4) 히스토리 상세
exports.getHistory = async function (userId, historyId, cb) {
  try {
    if (!historyId) {
      return cb(httpError(400, 'INVALID_HISTORY_ID'));
    }

    const [rows] = await pool.promise().query(
      `SELECT
         id,
         prompt_version_id,
         model_id,
         user_id,
         test_content,
         model_setting,
         output,
         tested_at
       FROM playground_history
       WHERE id = ? AND user_id = ?`,
      [historyId, userId]
    );

    if (!rows.length) {
      return cb(httpError(404, 'HISTORY_NOT_FOUND'));
    }

    const row = rows[0];

    // model_setting 은 JSON 컬럼이라 mysql2가 이미 객체로 줄 수도 있고, 문자열일 수도 있음
    let modelSetting = row.model_setting;
    if (typeof modelSetting === 'string') {
      try {
        modelSetting = JSON.parse(modelSetting);
      } catch {
        // 파싱 실패하면 그냥 원본 그대로 둠
      }
    }

    cb(null, {
      id: row.id,
      prompt_version_id: row.prompt_version_id,
      model_id: row.model_id,
      user_id: row.user_id,
      test_content: row.test_content,
      model_setting: modelSetting,
      output: row.output,
      tested_at: row.tested_at,
      // 아직 analyzer 결과를 DB에 안 넣으니까 더미
      analyzer: {
        enabled: false
      }
    });
  } catch (err) {
    cb(err);
  }
};


// 5) 히스토리 삭제
exports.deleteHistory = async function (userId, historyId, cb) {
  try {
    if (!historyId) {
      return cb(httpError(400, 'INVALID_HISTORY_ID'));
    }

    const [result] = await pool.promise().query(
      'DELETE FROM playground_history WHERE id = ? AND user_id = ?',
      [historyId, userId]
    );

    if (result.affectedRows === 0) {
      return cb(httpError(404, 'HISTORY_NOT_FOUND'));
    }

    cb(null, true);
  } catch (err) {
    cb(err);
  }
};


// ─────────────────────────────────────────────
// 6) 저장(프롬프트/버전화 연동)
// ─────────────────────────────────────────────
exports.saveFromPlayground = function (userId, body, cb) {
  console.log('[saveFromPlayground] userId =', userId, 'body =', body);

  if (!body || typeof body !== 'object') {
    return cb(httpError(400, '잘못된 body'));
  }

  const mode = body.mode;
  if (!mode) {
    return cb(httpError(400, 'mode 필수'));
  }

  // 공통: content + model_setting 확보
  function resolveContentAndModelSetting(cb2) {
    const sourceId = body.source_history_id;

    // 1) history 기준으로 가져오기
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

          // JSON 컬럼이 문자열로 올 수도 있으니 방어
          if (typeof ms === 'string') {
            try { ms = JSON.parse(ms); } catch (e) { /* ignore */ }
          }
          if (!ms || typeof ms !== 'object') {
            ms = {};
          }

          // 여기서 ai_model_id 보정
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

    // 2) body.version 에서 직접 받기
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

  // ── mode = new_prompt ──────────────────────────
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

  // ── mode = new_version ─────────────────────────
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

  // 알 수 없는 mode
  return cb(httpError(400, 'UNKNOWN_MODE'));
};


// 7) 플레이그라운드 설정 조회
exports.getSettings = function(userId, cb) {
  // TODO: user별 설정 테이블에서 조회
  cb(null, {
    analyzer_default_enabled: true,
    default_model_id: 3,
    default_params: { temperature: 0.7, max_token: 1024, top_p: 1.0 }
  });
};

// 8) 플레이그라운드 설정 수정
exports.updateSettings = function(userId, patch, cb) {
  // TODO: upsert into playground_settings
  cb(null, { updated: true });
};
