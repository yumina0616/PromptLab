const express = require('express');
const usersController = require('./users.controller'); // (복수형)
const { protect } = require('../../middlewares/protect');
const { isSelf, optionalAuth } = require('../../middlewares/authz'); // (인가 미들웨어)
const { validateProfileUpdate } = require('../../middlewares/validate');

const router = express.Router();

// --- 3) ~ 7) 목록형 API (먼저 정의) ---
// (주의: :userid 보다 먼저 정의되어야 라우트가 겹치지 않음)
router.get('/:userid/prompts', usersController.getPrompts);
router.get('/:userid/favorites', usersController.getFavorites);
router.get('/:userid/forks', usersController.getForks);
router.get('/:userid/activity', usersController.getActivity);

// (로그인 필수, 본인 확인 필수)
router.get('/:userid/export', protect, isSelf, usersController.exportData);


// --- 8) 계정 삭제 (로그인 필수, 본인 확인 필수) ---
// (주의) DELETE 요청은 body를 가질 수 있음
router.delete(
  '/:userid', 
  protect, 
  isSelf, 
  usersController.deleteAccount
);


// --- 2) 프로필 수정 (로그인 필수, 본인 확인 필수) ---
router.patch(
  '/:userid', 
  protect, 
  isSelf, 
  validateProfileUpdate, // (유효성 검사)
  usersController.updateProfile
);

// --- 1) 공개 프로필 조회 (맨 마지막에 매칭) ---
// (선택적 인증: optionalAuth)
router.get(
  '/:userid', 
  optionalAuth, 
  usersController.getProfile
);


module.exports = router;