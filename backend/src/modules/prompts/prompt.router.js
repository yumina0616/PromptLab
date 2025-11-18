// prompt.router.js

const router = require('express').Router();
const c = require('./prompt.controller');
const passport = require('passport'); // 1. Passport 로드

// JWT 인증 미들웨어 정의
const authMiddleware = passport.authenticate('jwt', { session: false }); // 2. 미들웨어 정의

// =========================================================
// 1. [정적 라우트] 태그/카테고리 (인증 불필요 - 퍼블릭)
// =========================================================
router.get('/tags', c.listTags);
router.get('/categories', c.listCategories);

// =========================================================
// 2. [기본 Prompt] ID가 없는 Prompt 목록/생성 (인증 필수)
// =========================================================
router.post('/', authMiddleware, c.createPrompt); // ⬅️ 추가
router.get('/', authMiddleware, c.listPrompts); // ⬅️ 추가

// =========================================================
// 3. [동적 라우트] Prompt ID 기반 (인증 필수)
// =========================================================
router.get('/:id', authMiddleware, c.getPrompt); // ⬅️ 추가
router.patch('/:id', authMiddleware, c.updatePrompt); // ⬅️ 추가
router.delete('/:id', authMiddleware, c.deletePrompt); // ⬅️ 추가

// 버전
router.get('/:id/versions', authMiddleware, c.listVersions); // ⬅️ 추가 (문제의 라우트)
router.post('/:id/versions', authMiddleware, c.createVersion); // ⬅️ 추가
router.get('/:id/versions/:verId', authMiddleware, c.getVersion); // ⬅️ 추가
router.patch('/:id/versions/:verId', authMiddleware, c.updateVersion); // ⬅️ 추가
router.delete('/:id/versions/:verId', authMiddleware, c.deleteVersion); // ⬅️ 추가

// 모델 세팅
router.get('/:id/versions/:verId/model-setting', authMiddleware, c.getModelSetting); // ⬅️ 추가
router.patch('/:id/versions/:verId/model-setting', authMiddleware, c.updateModelSetting); // ⬅️ 추가

// 댓글(버전 단위)
router.get('/:id/versions/:verId/comments', authMiddleware, c.listComments); // ⬅️ 추가
router.post('/:id/versions/:verId/comments', authMiddleware, c.addComment); // ⬅️ 추가
router.delete('/:id/versions/:verId/comments/:commentId', authMiddleware, c.deleteComment); // ⬅️ 추가

// 즐겨찾기(버전 단위)
router.post('/:id/versions/:verId/favorite', authMiddleware, c.addFavorite); // ⬅️ 추가
router.delete('/:id/versions/:verId/favorite', authMiddleware, c.removeFavorite); // ⬅️ 추가

// 포크
router.post('/:id/fork', authMiddleware, c.forkPromptFromVersion); // ⬅️ 추가

module.exports = router;