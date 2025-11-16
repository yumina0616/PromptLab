// src/modules/playground/playground.controller.js
const svc = require('./playground.service');

// 1) 실행(run)
exports.run = function (req, res, next) {
  const userId = req.user && req.user.id;
  const body   = req.body || {};

  console.log('[playground/run] user:', userId, 'body:', body);

  svc.runPlayground(userId, body, function (err, result) {
    if (err) return next(err);
    return res.json(result);
  });
};

// 2) 품질 점검(단독 호출)
// -> 품질 점검은 나중에 제대로 붙이기로 했으니까,
//    지금은 네가 쓰던 더미 응답 그대로 둔다.
//    완전히 막고 싶으면 501만 리턴하게 바꿔도 됨.
exports.grammarCheck = async function (req, res, next) {
  try {
    const body = req.body || {};
    console.log('[playground/grammar-check] body:', body);

    // 보류 버전: 간단한 더미 결과
    return res.json({
      score: 80,
      issues: [],
      suggestions: [],
      checks: {
        clarity: 0.8,
        structure: 0.8,
        variables: 0.8,
        safety: 0.9,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 3) 히스토리 목록
exports.listHistory = async function (req, res, next) {
  try {
    const userId = req.user && req.user.id;
    const query  = req.query || {};

    svc.listHistory(userId, query, function (err, result) {
      if (err) return next(err);
      res.json(result);
    });
  } catch (err) {
    next(err);
  }
};


// 4) 히스토리 상세
exports.getHistory = function (req, res, next) {
  const userId    = req.user && req.user.id;
  const historyId = Number(req.params.id);

  svc.getHistory(userId, historyId, function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
};

// 5) 히스토리 삭제
exports.deleteHistory = function (req, res, next) {
  const userId    = req.user && req.user.id;
  const historyId = Number(req.params.id);

  svc.deleteHistory(userId, historyId, function (err) {
    if (err) return next(err);
    res.status(204).end();
  });
};



// 6) 저장(프롬프트/버전화 연동)
exports.saveFromPlayground = function (req, res, next) {
  const userId = req.user && req.user.id;
  const body   = req.body || {};

  svc.saveFromPlayground(userId, body, function (err, result) {
    if (err) return next(err);
    res.status(201).json(result);
  });
};


// 7) 설정 조회
exports.getSettings = function (req, res, next) {
  const userId = req.user && req.user.id;

  console.log('[playground/settings GET] user:', userId);

  svc.getSettings(userId, function (err, result) {
    if (err) return next(err);
    return res.json(result);
  });
};

// 8) 설정 수정
exports.updateSettings = function (req, res, next) {
  const userId = req.user && req.user.id;
  const patch = req.body || {};

  console.log('[playground/settings PATCH] user:', userId, 'body:', patch);

  svc.updateSettings(userId, patch, function (err, result) {
    if (err) return next(err);
    return res.json(result);
  });
};
