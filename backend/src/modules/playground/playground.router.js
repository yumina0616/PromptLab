// src/modules/playground/playground.router.js

const router = require('express').Router();
const c = require('./playground.controller');
const passport = require('passport'); // ⬅️ 1. Passport 로드

// JWT 인증 미들웨어 정의
// 이 미들웨어가 요청 헤더의 토큰을 검증하고 req.user를 채워줍니다.
const authMiddleware = passport.authenticate('jwt', { session: false }); // ⬅️ 2. 미들웨어 정의

// ── 실행 / 품질 점검 ─────────────────────────────
// 'run'은 history를 기록하므로 인증 필수입니다.
router.post('/run', authMiddleware, c.run); // ⬅️ 적용 (현재 오류 발생 지점)
router.post('/grammar-check', authMiddleware, c.grammarCheck); // ⬅️ 적용 (품질 점검도 user context 필요할 수 있음)

// ── 히스토리 ────────────────────────────────────
router.get('/history', authMiddleware, c.listHistory); // ⬅️ 적용
router.get('/history/:id', authMiddleware, c.getHistory); // ⬅️ 적용
router.delete('/history/:id', authMiddleware, c.deleteHistory); // ⬅️ 적용

// ── 저장 ────────────────────────────────────────
router.post('/save', authMiddleware, c.saveFromPlayground); // ⬅️ 적용 (저장은 인증 필수)

// ── 설정 ────────────────────────────────────────
router.get('/settings', authMiddleware, c.getSettings); // ⬅️ 적용
router.patch('/settings', authMiddleware, c.updateSettings); // ⬅️ 적용

module.exports = router;