const express = require('express');
const authController = require('./auth.controller');
const { protect } = require('../../middlewares/protect');
const passport = require('passport');

// [수정!]
// 이전에 누락되었던 모든 validate 함수들을
// 여기서 require 해야 합니다.
const {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateEmail,
  validatePasswordReset,
} = require('../../middlewares/validate');

const router = express.Router();

// 1. Local Auth (PDF Spec)
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', protect, authController.logout);
router.post('/refresh', authController.refresh);

// 2. Password Management (PDF Spec)
// [수정!]
// 이제 'validatePasswordChange' 변수가 'undefined'가 아니므로
// 이 코드가 정상적으로 작동합니다.
router.post('/password/change', protect, validatePasswordChange, authController.changePassword);
router.post('/password/reset/request', validateEmail, authController.requestPasswordReset);
router.post('/password/reset/confirm', validatePasswordReset, authController.confirmPasswordReset);

// 3. OAuth (PDF Spec)
// (Google)
router.get(
  '/oauth/google/start',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get(
  '/oauth/google/callback',
  authController.googleCallback // (에러 처리를 위해 passport session을 끔)
);
// (GitHub)
router.get(
  '/oauth/github/start',
  passport.authenticate('github', { scope: ['read:user', 'user:email'], session: false })
);
router.get(
  '/oauth/github/callback',
  authController.githubCallback
);

// 4. OAuth Link/Unlink (PDF Spec)
router.get(
  '/oauth/link/:provider',
  protect, // (반드시 로그인 상태)
  authController.linkOauthStart
);
router.delete(
  '/oauth/:provider',
  protect, // (반드시 로그인 상태)
  authController.unlinkOauth
);

// 5. Profile & Session (PDF Spec)
router.get('/me', protect, authController.getProfile);
router.get('/session', protect, authController.checkSession);


module.exports = router;