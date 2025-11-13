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
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  const verId = Number(req.params.verId);
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  svc.listComments(userId, promptId, verId, { page, limit }, (err, items) => {
    if (err) return next(err);
    res.json({ items });
  });
};

exports.createComment = (req, res, next) => {
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  const verId = Number(req.params.verId);
  const body = (req.body && req.body.body || '').trim();
  if (!body) return res.status(400).json({ error: 'body 필수' });
  svc.createComment(userId, promptId, verId, body, (err, cmt) => {
    if (err) return next(err);
    res.status(201).json(cmt);
  });
};

exports.deleteComment = (req, res, next) => {
  const userId = req.user.id;
  const commentId = Number(req.params.commentId);
  svc.deleteComment(userId, commentId, (err) => {
    if (err) return next(err);
    res.status(204).end();
  });
};


// ── 즐겨찾기(버전 단위) ─────────────────
exports.addFavorite = (req, res, next) => {
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  const verId = Number(req.params.verId);
  svc.addFavorite(userId, promptId, verId, (err, ok) => {
    if (err) return next(err);
    res.status(201).json({ starred: !!ok });
  });
};

exports.removeFavorite = (req, res, next) => {
  const userId = req.user.id;
  const promptId = Number(req.params.id);
  const verId = Number(req.params.verId);
  svc.removeFavorite(userId, promptId, verId, (err) => {
    if (err) return next(err);
    res.status(204).end();
  });
};


// ── 포크 ────────────────────────────────
exports.forkPromptFromVersion = (req, res, next) => {
  // TODO: svc.forkPromptFromVersion(userId, promptId, body.source_version_id, body.new_name, cb)
  return res.status(501).json({ error: 'NOT_IMPLEMENTED' });
};

// ── 태그/카테고리 ───────────────────────
exports.listTags = (req, res, next) => {
  const q = (req.query.q || '').trim();
  svc.listTags(q, (err, items) => {
    if (err) return next(err);
    res.json({ items });
  });
};

exports.listCategories = (req, res, next) => {
  svc.listCategories((err, items) => {
    if (err) return next(err);
    res.json({ items });
  });
};
