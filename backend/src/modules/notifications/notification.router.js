// notification.router.js (수정)

const express = require('express');
const ctrl = require('./notification.controller');
const passport = require('passport'); // ⬅️ 1. Passport 로드

const router = express.Router();

// JWT 인증 미들웨어 정의
const authMiddleware = passport.authenticate('jwt', { session: false }); // ⬅️ 2. 미들웨어 정의

// 모든 라우트에 authMiddleware 적용

// 설정
router.get('/settings', authMiddleware, ctrl.getSettings); // ⬅️ 적용
router.patch('/settings', authMiddleware, ctrl.updateSettings); // ⬅️ 적용

// 목록
router.get('/', authMiddleware, ctrl.listNotifications); // ⬅️ 적용
router.get('/unread-count', authMiddleware, ctrl.getUnreadCount); // ⬅️ 적용 (현재 오류 발생 지점)

// 읽음 처리
router.patch('/:id/read', authMiddleware, ctrl.markRead); // ⬅️ 적용
router.patch('/read-all', authMiddleware, ctrl.markAllRead); // ⬅️ 적용

// 삭제
router.delete('/:id', authMiddleware, ctrl.deleteOne); // ⬅️ 적용
router.delete('/', authMiddleware, ctrl.clearNotifications); // ⬅️ 적용

module.exports = router;