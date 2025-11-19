// src/modules/settings/settings.router.js
const express = require('express');
const router = express.Router();
const ctrl = require('./settings.controller');
const passport = require('passport');

const authMiddleware = passport.authenticate('jwt', { session: false });

// 전부 로그인 필요라고 가정 (app.js에서 임시 user 넣어주는 거 이미 있음)

// 1) 프로필
router.get('/profile', authMiddleware, ctrl.getProfile);
router.patch('/profile', authMiddleware, ctrl.updateProfile);

// 2) 프라이버시
router.get('/privacy', authMiddleware, ctrl.getPrivacy);
router.patch('/privacy', authMiddleware, ctrl.updatePrivacy);

// 3) 환경
router.get('/environment', authMiddleware, ctrl.getEnvironment);
router.patch('/environment', authMiddleware, ctrl.updateEnvironment);

// 4) 이메일 변경
router.post('/email/change-request', authMiddleware, ctrl.requestEmailChange);
router.post('/email/change-confirm', authMiddleware, ctrl.confirmEmailChange);

// ── 계정 삭제 ──────────────────────────────────
// DELETE /api/v1/settings/account
router.delete('/account', authMiddleware, ctrl.deleteAccount);

module.exports = router;
