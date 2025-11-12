const svc = require('./prompt.service');

exports.createPrompt = function(req, res, next){
  const userId = req.user.id;
  // 최소 검증만
  if (!req.body || !req.body.name || !req.body.content || !req.body.commit_message || !req.body.model_setting) {
    return res.status(400).json({ error: 'name, content, commit_message, model_setting 필수' });
  }
  svc.createPromptWithFirstVersion(userId, req.body, function(err, result){
    if (err) return next(err);
    res.status(201).json(result);
  });
};

exports.listPrompts = function(req, res, next){
  const userId = req.user.id;
  svc.listPrompts(userId, req.query, function(err, result){
    if (err) return next(err);
    res.json(result);
  });
};

exports.getPrompt = function(req, res, next){
  const userId = req.user.id;
  const id = Number(req.params.id);
  svc.getPrompt(userId, id, function(err, result){
    if (err) return next(err);
    if (!result) return res.status(404).json({ error: 'not found' });
    res.json(result);
  });
};

exports.updatePrompt = function(req, res, next){
  const userId = req.user.id;
  const id = Number(req.params.id);
  svc.updatePromptMeta(userId, id, req.body || {}, function(err, result){
    if (err) return next(err);
    res.json(result);
  });
};

exports.deletePrompt = function(req, res, next){
  const userId = req.user.id;
  const id = Number(req.params.id);
  svc.deletePrompt(userId, id, function(err){
    if (err) return next(err);
    res.status(204).end();
  });
};

// 버전
exports.listVersions = function(req, res, next){
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  svc.listVersions(userId, promptId, req.query, function(err, items){
    if (err) return next(err);
    res.json({ items: items });
  });
};

exports.createVersion = function(req, res, next){
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  if (!req.body || !req.body.content || !req.body.commit_message) {
    return res.status(400).json({ error: 'content, commit_message 필수' });
  }
  svc.createVersion(userId, promptId, req.body, function(err, result){
    if (err) return next(err);
    res.status(201).json(result);
  });
};

exports.getVersion = function(req, res, next){
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  const verId = Number(req.params.verId);
  svc.getVersion(userId, promptId, verId, function(err, v){
    if (err) return next(err);
    if (!v) return res.status(404).json({ error: 'not found' });
    res.json(v);
  });
};

exports.updateVersion = function(req, res, next){
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  const verId = Number(req.params.verId);
  svc.updateVersion(userId, promptId, verId, req.body || {}, function(err, r){
    if (err) return next(err);
    res.json(r);
  });
};

exports.deleteVersion = function(req, res, next){
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  const verId = Number(req.params.verId);
  svc.deleteVersion(userId, promptId, verId, function(err){
    if (err) return next(err);
    res.status(204).end();
  });
};

// 모델 세팅
exports.getModelSetting = function(req, res, next){
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  const verId = Number(req.params.verId);
  svc.getModelSetting(userId, promptId, verId, function(err, ms){
    if (err) return next(err);
    if (!ms) return res.status(404).json({ error: 'not found' });
    res.json(ms);
  });
};

exports.updateModelSetting = function(req, res, next){
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  const verId = Number(req.params.verId);
  svc.updateModelSetting(userId, promptId, verId, req.body || {}, function(err, ok){
    if (err) return next(err);
    res.json({ updated: !!ok });
  });
};

// ── 댓글(버전 단위) ─────────────────────
exports.listComments = (req, res, next) => {
  // TODO: svc.listComments(userId, promptId, verId, query, cb)
  return res.status(501).json({ error: 'NOT_IMPLEMENTED' });
};
exports.createComment = (req, res, next) => {
  // TODO: svc.createComment(userId, promptId, verId, body, cb)
  return res.status(501).json({ error: 'NOT_IMPLEMENTED' });
};
exports.deleteComment = (req, res, next) => {
  // TODO: svc.deleteComment(userId, commentId, cb)
  return res.status(501).json({ error: 'NOT_IMPLEMENTED' });
};

// ── 즐겨찾기(버전 단위) ─────────────────
exports.starVersion = (req, res, next) => {
  // TODO: svc.starVersion(userId, promptId, verId, cb)
  return res.status(201).json({ starred: true });
};
exports.unstarVersion = (req, res, next) => {
  // TODO: svc.unstarVersion(userId, promptId, verId, cb)
  return res.status(204).end();
};

// ── 포크 ────────────────────────────────
exports.forkPromptFromVersion = (req, res, next) => {
  // TODO: svc.forkPromptFromVersion(userId, promptId, body.source_version_id, body.new_name, cb)
  return res.status(501).json({ error: 'NOT_IMPLEMENTED' });
};

// ── 태그/카테고리 ───────────────────────
exports.listTags = (req, res, next) => {
  // TODO: svc.listTags(q, cb)
  return res.json({ items: [] });
};
exports.listCategories = (req, res, next) => {
  // TODO: svc.listCategories(cb)
  return res.json({ items: [] });
};
