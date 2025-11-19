// src/modules/settings/settings.router.js

const express = require('express');
const router = express.Router();
const ctrl = require('./settings.controller');
const passport = require('passport'); // 1. Passport 로드

// JWT 인증 미들웨어 정의
// 이 미들웨어가 요청 성공 시 req.user 또는 req.payload에 사용자 정보를 넣어줍니다.
const authMiddleware = passport.authenticate('jwt', { session: false }); 


// 🚨 이제는 미들웨어를 통해 실제 인증이 이루어져야 합니다.

// 1) 프로필
router.get('/profile', authMiddleware, ctrl.getProfile); // ⬅️ authMiddleware 추가
router.patch('/profile', authMiddleware, ctrl.updateProfile); // ⬅️ authMiddleware 추가

// 2) 프라이버시
router.get('/privacy', authMiddleware, ctrl.getPrivacy); // ⬅️ authMiddleware 추가
router.patch('/privacy', authMiddleware, ctrl.updatePrivacy); // ⬅️ authMiddleware 추가

// 3) 환경
router.get('/environment', authMiddleware, ctrl.getEnvironment); // ⬅️ authMiddleware 추가
router.patch('/environment', authMiddleware, ctrl.updateEnvironment); // ⬅️ authMiddleware 추가

// 4) 이메일 변경
router.post('/email/change-request', authMiddleware, ctrl.requestEmailChange); // ⬅️ authMiddleware 추가
router.post('/email/change-confirm', authMiddleware, ctrl.confirmEmailChange); // ⬅️ authMiddleware 추가

// ── 계정 삭제 ──────────────────────────────────
// DELETE /api/v1/settings/account
router.delete('/account', authMiddleware, ctrl.deleteAccount); // ⬅️ authMiddleware 추가

module.exports = router;