// src/modules/workspaces/workspaces.router.js

const express = require('express');
const router = express.Router();

const controller = require('./workspaces.controller');
const workspaceAuth = require('./workspaces.auth');
const validate = require('./workspaces.validate');

// ⚠️ 프로젝트에 맞게 경로/이름만 맞추면 됨
// 예: modules/auth/auth.middleware.js 에서 authenticate export 된다고 가정
const { protect } = require('../../middlewares/protect');

// 모든 워크스페이스 API는 인증 필요
router.use(protect);

// --- 1. Workspace (기본 CRUD) ---

// POST /api/v1/workspaces
router.post(
  '/',
  validate.validateCreateWorkspace,
  controller.createWorkspace
);

// GET /api/v1/workspaces
router.get(
  '/',
  validate.validatePagination,
  controller.getWorkspaces
);

// GET /api/v1/workspaces/:id
router.get(
  '/:id',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isMember,
  controller.getWorkspaceDetail
);

// PATCH /api/v1/workspaces/:id
router.patch(
  '/:id',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isAdminOrOwner,
  validate.validateUpdateWorkspace,
  controller.updateWorkspace
);

// DELETE /api/v1/workspaces/:id
router.delete(
  '/:id',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isAdminOrOwner,
  controller.deleteWorkspace
);

// --- 2. Members ---

// GET /api/v1/workspaces/:id/members
router.get(
  '/:id/members',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isMember,
  controller.getMemberList
);

// POST /api/v1/workspaces/:id/members
router.post(
  '/:id/members',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isAdminOrOwner,
  validate.validateAddMember,
  controller.addMember
);

// PATCH /api/v1/workspaces/:id/members/:userId
router.patch(
  '/:id/members/:userId',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isAdminOrOwner,
  validate.validateUpdateMemberRole,
  controller.updateMemberRole
);

// DELETE /api/v1/workspaces/:id/members/:userId
router.delete(
  '/:id/members/:userId',
  workspaceAuth.loadWorkspace,
  workspaceAuth.canRemoveMember,
  controller.removeMember
);

// --- 3. Invites ---

// POST /api/v1/workspaces/:id/invites
router.post(
  '/:id/invites',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isAdminOrOwner,
  validate.validateSendInvite,
  controller.sendInvite
);

// GET /api/v1/workspaces/:id/invites
router.get(
  '/:id/invites',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isAdminOrOwner,
  controller.getInviteList
);

// PATCH /api/v1/workspaces/invites/:token/accept
router.patch(
  '/invites/:token/accept',
  validate.validateInviteToken,
  controller.acceptInvite
);

// PATCH /api/v1/workspaces/invites/:token/reject
router.patch(
  '/invites/:token/reject',
  validate.validateInviteToken,
  controller.rejectInvite
);

// DELETE /api/v1/workspaces/invites/:token
router.delete(
  '/invites/:token',
  validate.validateInviteToken,
  workspaceAuth.canCancelInvite,
  controller.cancelInvite
);

// --- 4. Shared Prompts ---

// GET /api/v1/workspaces/:id/prompts
router.get(
  '/:id/prompts',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isMember,
  validate.validatePagination,
  controller.getSharedPromptList
);

// POST /api/v1/workspaces/:id/prompts/:promptId/share
router.post(
  '/:id/prompts/:promptId/share',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isMember,
  workspaceAuth.canSharePrompt,
  validate.validatePromptShare,
  controller.sharePrompt
);

router.get(
  '/:id/prompts',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isMember,
  validate.validatePagination,
  controller.getSharedPromptList
);

router.post(
  '/:id/prompts',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isMember,                // 팀 멤버면 누구나 생성 가능
  validate.validateWorkspacePromptCreate,
  controller.createPromptInWorkspace
);
// PATCH /api/v1/workspaces/:id/prompts/:promptId
router.patch(
  '/:id/prompts/:promptId',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isMember,
  workspaceAuth.canSharePrompt,
  validate.validatePromptShare,
  controller.updateSharedPromptRole
);

// DELETE /api/v1/workspaces/:id/prompts/:promptId
router.delete(
  '/:id/prompts/:promptId',
  workspaceAuth.loadWorkspace,
  workspaceAuth.isMember,
  workspaceAuth.canSharePrompt,
  controller.unsharePrompt
);

module.exports = router;
