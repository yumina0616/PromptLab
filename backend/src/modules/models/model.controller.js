// src/modules/models/model.controller.js
const svc = require('./model.service');

// 1) 모델 목록
exports.listModels = function (req, res, next) {
  const userId = req.user && req.user.id;
  const query  = req.query || {};

  svc.listModels(userId, query, function (err, result) {
    if (err) return next(err);
    return res.json(result);
  });
};

// 2) 모델 상세
exports.getModel = function (req, res, next) {
  const userId = req.user && req.user.id;
  const id     = Number(req.params.id);

  svc.getModel(userId, id, function (err, model) {
    if (err) return next(err);
    // svc.getModel 이 404를 던지도록 되어 있어서 사실 이 체크는 거의 안 타긴 함
    if (!model) {
      return res.status(404).json({ error: 'MODEL_NOT_FOUND' });
    }
    return res.json(model);
  });
};

// 3) 모델 단발 테스트 (ADMIN 전용)
exports.testModel = function (req, res, next) {
  const user = req.user;

  // 지금은 user.is_admin 플래그 기준으로 권한 체크
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'ADMIN_ONLY' });
  }

  const body = req.body || {};

  svc.testModel(user.id, body, function (err, result) {
    if (err) return next(err);
    return res.json(result);
  });
};
