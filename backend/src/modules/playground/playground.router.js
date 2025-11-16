// src/modules/playground/playground.router.js
const router = require('express').Router();
const c = require('./playground.controller');

// ── 실행 / 품질 점검 ─────────────────────────────
router.post('/run', c.run);                   // POST /api/v1/playground/run
router.post('/grammar-check', c.grammarCheck);// POST /api/v1/playground/grammar-check

// ── 히스토리 ────────────────────────────────────
router.get('/history', c.listHistory);        // GET    /api/v1/playground/history
router.get('/history/:id', c.getHistory);     // GET    /api/v1/playground/history/:id
router.delete('/history/:id', c.deleteHistory);// DELETE /api/v1/playground/history/:id

// ── 저장 ────────────────────────────────────────
router.post('/save', c.saveFromPlayground);   // POST /api/v1/playground/save

// ── 설정 ────────────────────────────────────────
router.get('/settings', c.getSettings);       // GET  /api/v1/playground/settings
router.patch('/settings', c.updateSettings);  // PATCH /api/v1/playground/settings

module.exports = router;
