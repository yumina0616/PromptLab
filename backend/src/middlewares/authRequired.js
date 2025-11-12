module.exports = function authRequired(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  next();
};
