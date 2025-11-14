// src/modules/workspaces/workspaces.router.js

const express = require('express');
const router = express.Router();

const workspaceService = require('./workspaces.service');
const { BadRequestError, UnauthorizedError } = require('../../shared/error');
const config = require('../../config');

const defaultPagination = { page: 1, limit: 20 };

// --- 1. Workspace (기본 CRUD) ---

// POST /api/v1/workspaces
const createWorkspace = async (req, res, next) => {
  try {
    const data = await workspaceService.createWorkspace(req.body, req.user?.id || 1); // 임시로 user.id 없으면 1
    res.status(201).json({
      ...data,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/workspaces
// GET /api/v1/workspaces
const getWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user?.id || 1; // 지금은 1번 유저 강제 사용

    if (!userId) {
      throw new UnauthorizedError('UNAUTHORIZED', 'Not authorized, no user');
    }

    const page = Number.parseInt(req.query.page, 10) || defaultPagination.page;
    const limit = Number.parseInt(req.query.limit, 10) || defaultPagination.limit;

    const pagination = {
      page,
      limit,
      q: req.query.q,
      sort: req.query.sort || 'recent',
    };

    const result = await workspaceService.getMyWorkspaces(userId, pagination);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};


// GET /api/v1/workspaces/:id
const getWorkspaceDetail = async (req, res, next) => {
  try {
    const detail = await workspaceService.getWorkspaceDetail(req.params.id);
    res.status(200).json(detail);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/workspaces/:id
const updateWorkspace = async (req, res, next) => {
  try {
    const updated = await workspaceService.updateWorkspace(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/workspaces/:id
const deleteWorkspace = async (req, res, next) => {
  try {
    await workspaceService.deleteWorkspace(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// --- 2. Members ---

const getMemberList = async (req, res, next) => {
  try {
    const members = await workspaceService.getMemberList(req.params.id);
    res.status(200).json({ items: members });
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const result = await workspaceService.addMember(req.params.id, email, role);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const result = await workspaceService.updateMemberRole(
      req.params.id,
      req.params.userId,
      req.body.role
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    await workspaceService.removeMember(req.params.id, req.params.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// --- 3. Invites ---

const sendInvite = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const result = await workspaceService.sendInvite(
      req.params.id,
      req.user?.id || 1,
      email,
      role
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getInviteList = async (req, res, next) => {
  try {
    const items = await workspaceService.getInviteList(req.params.id);
    res.status(200).json({ items });
  } catch (error) {
    next(error);
  }
};

const acceptInvite = async (req, res, next) => {
  try {
    const result = await workspaceService.acceptInvite(req.params.token, req.user?.id || 1);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const rejectInvite = async (req, res, next) => {
  try {
    const result = await workspaceService.rejectInvite(req.params.token);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const cancelInvite = async (req, res, next) => {
  try {
    await workspaceService.cancelInvite(req.params.token);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// --- 4. Shared Prompts ---

const getSharedPromptList = async (req, res, next) => {
  try {
    const pagination = {
      page: parseInt(req.query.page) || defaultPagination.page,
      limit: parseInt(req.query.limit) || defaultPagination.limit,
      q: req.query.q,
      sort: req.query.sort || 'recent',
    };
    const result = await workspaceService.getSharedPromptList(req.params.id, pagination);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const sharePrompt = async (req, res, next) => {
  try {
    const { role } = req.body;
    const result = await workspaceService.sharePrompt(
      req.params.id,
      req.params.promptId,
      req.user?.id || 1,
      role
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const updateSharedPromptRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const result = await workspaceService.updateSharedPromptRole(
      req.params.id,
      req.params.promptId,
      role
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const unsharePrompt = async (req, res, next) => {
  try {
    await workspaceService.unsharePrompt(req.params.id, req.params.promptId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// --- 여기서 실제 라우팅을 묶어준다 ---

router.post('/', createWorkspace);
router.get('/', getWorkspaces);
router.get('/:id', getWorkspaceDetail);
router.patch('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);

router.get('/:id/members', getMemberList);
router.post('/:id/members', addMember);
router.patch('/:id/members/:userId', updateMemberRole);
router.delete('/:id/members/:userId', removeMember);

router.post('/:id/invites', sendInvite);
router.get('/:id/invites', getInviteList);
router.patch('/invites/:token/accept', acceptInvite);
router.patch('/invites/:token/reject', rejectInvite);
router.delete('/invites/:token', cancelInvite);

router.get('/:id/prompts', getSharedPromptList);
router.post('/:id/prompts/:promptId/share', sharePrompt);
router.patch('/:id/prompts/:promptId', updateSharedPromptRole);
router.delete('/:id/prompts/:promptId', unsharePrompt);

// 진짜 라우터 export
module.exports = router;
