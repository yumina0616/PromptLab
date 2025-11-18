// src/modules/settings/settings.router.js
const express = require('express');
const router = express.Router();
const ctrl = require('./settings.controller');

// 전부 로그인 필요라고 가정 (app.js에서 임시 user 넣어주는 거 이미 있음)

// 1) 프로필
router.get('/profile', ctrl.getProfile);
router.patch('/profile', ctrl.updateProfile);

// 2) 프라이버시
router.get('/privacy', ctrl.getPrivacy);
router.patch('/privacy', ctrl.updatePrivacy);

// 3) 환경
router.get('/environment', ctrl.getEnvironment);
router.patch('/environment', ctrl.updateEnvironment);

// 4) 이메일 변경
router.post('/email/change-request', ctrl.requestEmailChange);
router.post('/email/change-confirm', ctrl.confirmEmailChange);

// 세션, 계정 삭제, 데이터 내보내기는 나중에

module.exports = router;
