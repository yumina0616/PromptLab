const express = require('express');
const usersController = require('./users.controller');
const { protect } = require('../../middlewares/protect');
const { isSelf, optionalAuth } = require('../../middlewares/authz');
const { validateProfileUpdate } = require('../../middlewares/validate');

const router = express.Router();

// --- 3) ~ 7) 목록형 API ---

// 3) 내가 만든 프롬프트 목록  (선택적 인증)
router.get('/:userid/prompts', optionalAuth, usersController.getPrompts);

// 4) 내가 즐겨찾기한 프롬프트 (본인만)
router.get('/:userid/favorites', protect, isSelf, usersController.getFavorites);

// 5) 내가 포크한 프롬프트 (본인만)
router.get('/:userid/forks', protect, isSelf, usersController.getForks);

// 6) 활동 로그 (본인만)
router.get('/:userid/activity', protect, isSelf, usersController.getActivity);

// 7) 내 데이터 내보내기 (이미 OK)
router.get('/:userid/export', protect, isSelf, usersController.exportData);

// --- 8) 계정 삭제 ---
router.delete('/:userid', protect, isSelf, usersController.deleteAccount);

// --- 2) 프로필 수정 ---
router.patch(
  '/:userid',
  protect,
  isSelf,
  validateProfileUpdate,
  usersController.updateProfile
);

// --- 1) 공개 프로필 조회 ---
router.get('/:userid', optionalAuth, usersController.getProfile);

module.exports = router;
