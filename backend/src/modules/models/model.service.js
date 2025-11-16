// src/modules/models/model.service.js
const pool = require('../../shared/db');
const geminiProvider = require('./provider/gemini');
const openaiProvider = require('./provider/openai');
const anthropicProv  = require('./provider/anthropic');
const ollamaProv     = require('./provider/ollama');


function httpError(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

// provider 문자열 -> 구현 매핑
// 지금은 google(Gemini)만 실제 구현, 나머진 나중에 추가
const providerMap = {
  google: geminiProvider,
  openai: openaiProvider,
  //anthropic: anthropicProvider,
  //ollama: ollamaProvider,
};

// 1) 모델 목록
exports.listModels = function (userId, query, cb) {
  try {
    const where = [];
    const params = [];

    // provider 필터
    if (query && query.provider) {
      where.push('provider = ?');
      params.push(query.provider);
    }

    // active 필터: 기본 true
    if (
      !query ||
      query.active === undefined ||
      query.active === null ||
      query.active === ''
    ) {
      where.push('is_active = 1');
    } else {
      const s = String(query.active).toLowerCase();
      if (s === 'true') {
        where.push('is_active = 1');
      } else if (s === 'false') {
        where.push('is_active = 0');
      } else {
        return cb(httpError(400, 'INVALID_ACTIVE'));
      }
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // 정렬
    const allowedSortFields = new Set([
      'provider',
      'display_name',
      'model_code',
      'created_at',
    ]);
    let sortSpecs = query && query.sort;
    const orderList = [];

    if (sortSpecs) {
      if (!Array.isArray(sortSpecs)) sortSpecs = [sortSpecs];

      for (const spec of sortSpecs) {
        const [fieldRaw, dirRaw] = String(spec).split(',');
        const field = fieldRaw && fieldRaw.trim();
        const dir = (dirRaw || 'asc').toLowerCase();

        if (!allowedSortFields.has(field) || (dir !== 'asc' && dir !== 'desc')) {
          return cb(httpError(400, 'INVALID_SORT'));
        }
        orderList.push(field + ' ' + dir.toUpperCase());
      }
    }

    // 기본 정렬
    if (!orderList.length) {
      orderList.push('provider ASC', 'display_name ASC');
    }
    const orderSql = 'ORDER BY ' + orderList.join(', ');

    // 페이징
    const limit = query && query.limit ? Number(query.limit) : 50;
    const page = query && query.page ? Number(query.page) : 1;

    if (!Number.isFinite(limit) || limit <= 0 || limit > 200) {
      return cb(httpError(400, 'INVALID_LIMIT'));
    }
    const offset = (page - 1) * limit;

    // 1단계: total 카운트
    pool.query(
      `SELECT COUNT(*) AS cnt FROM ai_model ${whereSql}`,
      params,
      function (err, countRows) {
        if (err) return cb(err);

        const total = countRows[0] ? Number(countRows[0].cnt) : 0;

        // 2단계: 실제 목록
        pool.query(
          `SELECT id, provider, model_code, display_name, is_active
           FROM ai_model
           ${whereSql}
           ${orderSql}
           LIMIT ? OFFSET ?`,
          [...params, limit, offset],
          function (err2, rows) {
            if (err2) return cb(err2);

            cb(null, {
              total,
              page,
              limit,
              items: rows,
            });
          }
        );
      }
    );
  } catch (err) {
    cb(err);
  }
};

// 2) 모델 상세
exports.getModel = function (userId, id, cb) {
  pool.query('SELECT * FROM ai_model WHERE id = ?', [id], function (err, rows) {
    if (err) return cb(err);
    if (!rows.length) return cb(httpError(404, 'MODEL_NOT_FOUND'));

    const m = rows[0];

    if (!m.is_active) {
      return cb(httpError(403, 'MODEL_DISABLED'));
    }

    const capabilities = {
      max_tokens: m.max_tokens || null,
      supports_vision: !!m.supports_vision,
      supports_tool_call: !!m.supports_tool_call,
    };

    const defaultParams = {
      temperature: m.default_temperature ?? 0.7,
      top_p: m.default_top_p ?? 1.0,
    };

    cb(null, {
      id: m.id,
      provider: m.provider,
      model_code: m.model_code,
      display_name: m.display_name,
      is_active: !!m.is_active,
      capabilities,
      default_params: defaultParams,
    });
  });
};

// 3) 모델 단발 테스트 (ADMIN 전용)
exports.testModel = function (userId, body, cb) {
  if (!body || !body.prompt_text || !body.model_id) {
    return cb(httpError(400, 'prompt_text, model_id 필수'));
  }

  const modelId = Number(body.model_id);
  const promptTxt = body.prompt_text;
  const params = body.params || {};

  // 1단계: 모델 정보 조회
  pool.query(
    'SELECT * FROM ai_model WHERE id = ?',
    [modelId],
    function (err, rows) {
      if (err) return cb(err);
      if (!rows.length) return cb(httpError(400, 'INVALID_MODEL'));

      const m = rows[0];

      if (!m.is_active) {
        return cb(httpError(403, 'MODEL_DISABLED'));
      }

      const providerImpl = providerMap[m.provider];

      if (!providerImpl || typeof providerImpl.callModel !== 'function') {
        return cb(httpError(400, 'UNSUPPORTED_PROVIDER'));
      }

      // 2단계: 실제 LLM 호출
      providerImpl
        .callModel({
          model: m,
          prompt: promptTxt,
          params,
        })
        .then(function (result) {
          const applied = {
            temperature: params.temperature ?? 0.7,
            max_token: params.max_token ?? 1024,
            top_p: params.top_p ?? 1.0,
            frequency_penalty: params.frequency_penalty ?? 0.0,
            presence_penalty: params.presence_penalty ?? 0.0,
          };

          cb(null, {
            output: result.output,
            usage: result.usage,
            model: {
              id: modelId,
              applied_params: applied,
            },
          });
        })
        .catch(function (err2) {
          console.error('[model.testModel] provider 호출 오류:', err2);
          cb(httpError(502, 'UPSTREAM_ERROR'));
        });
    }
  );
};
