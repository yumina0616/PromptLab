// src/modules/settings/settings.controller.js
const svc = require('./settings.service');

exports.getProfile = (req, res, next) => {
  const userId = req.user.id;
  svc.getProfile(userId, (err, profile) => {
    if (err) return next(err);
    res.json(profile);
  });
};

exports.updateProfile = (req, res, next) => {
  const userId = req.user.id;
  svc.updateProfile(userId, req.body, (err, result) => {
    if (err) return next(err);
    res.json({ updated: true });
  });
};

exports.getPrivacy = (req, res, next) => {
  const userId = req.user.id;
  svc.getPrivacy(userId, (err, privacy) => {
    if (err) return next(err);
    res.json(privacy);
  });
};

exports.updatePrivacy = (req, res, next) => {
  const userId = req.user.id;
  svc.updatePrivacy(userId, req.body, (err, result) => {
    if (err) return next(err);
    res.json({ updated: true });
  });
};

exports.getEnvironment = (req, res, next) => {
  const userId = req.user.id;
  svc.getEnvironment(userId, (err, env) => {
    if (err) return next(err);
    res.json(env);
  });
};

exports.updateEnvironment = (req, res, next) => {
  const userId = req.user.id;
  svc.updateEnvironment(userId, req.body, (err, result) => {
    if (err) return next(err);
    res.json({ updated: true });
  });
};

// 이메일 변경 요청
exports.requestEmailChange = (req, res, next) => {
  const userId = req.user.id;
  svc.requestEmailChange(userId, req.body, (err, result) => {
    if (err) return next(err);
    res.json({ sent: true });
  });
};

// 이메일 변경 확정
exports.confirmEmailChange = (req, res, next) => {
  svc.confirmEmailChange(req.body, (err, result) => {
    if (err) return next(err);
    res.json({ changed: true });
  });
};



// ─────────────────────────────────────────────
// 계정 삭제 (간단 버전: user.deleted_at 만 업데이트)
// ─────────────────────────────────────────────

// DELETE /api/v1/settings/account
exports.deleteAccount = (req, res, next) => {
  const userId = req.user && req.user.id;

  svc.deleteAccount(userId, (err, ok) => {
    if (err) return next(err);

    // 실제 삭제 완료 → 204로 응답
    return res.status(204).end();
  });
};

