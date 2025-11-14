const workspaceService = require('./workspaces.service');
const { validationResult } = require('express-validator');
const { BadRequestError } = require('../../shared/error');
const config = require('../../config');

// 기본 페이지네이션 설정
const defaultPagination = { page: 1, limit: 20 };

// --- 1. Workspace (기본 CRUD) ---

// POST /workspaces (생성)
exports.createWorkspace = async (req, res, next) => {
    try {
        const data = await workspaceService.createWorkspace(req.body, req.user.id);
        res.status(201).json({
            ...data,
            created_at: new Date().toISOString() // DB에서 받지만, 스펙을 위해 예시 날짜 사용
        });
    } catch (error) {
        next(error);
    }
};

// GET /workspaces (목록)
exports.getWorkspaces = async (req, res, next) => {
    try {
        const pagination = {
            page: parseInt(req.query.page) || defaultPagination.page,
            limit: parseInt(req.query.limit) || defaultPagination.limit,
            q: req.query.q,
            sort: req.query.sort || 'recent',
        };
        const result = await workspaceService.getMyWorkspaces(req.user.id, pagination);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// GET /workspaces/:id (상세)
exports.getWorkspaceDetail = async (req, res, next) => {
    try {
        // req.workspace는 workspace.auth.js의 loadWorkspace 미들웨어에서 이미 로드됨
        // isMember 미들웨어에서 권한 체크 완료
        const detail = await workspaceService.getWorkspaceDetail(req.params.id);
        res.status(200).json(detail);
    } catch (error) {
        next(error);
    }
};

// PATCH /workspaces/:id (수정)
exports.updateWorkspace = async (req, res, next) => {
    try {
        // isAdminOrOwner 미들웨어에서 권한 체크 완료
        const updated = await workspaceService.updateWorkspace(req.params.id, req.body);
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

// DELETE /workspaces/:id (삭제)
exports.deleteWorkspace = async (req, res, next) => {
    try {
        // isAdminOrOwner 미들웨어에서 권한 체크 완료
        await workspaceService.deleteWorkspace(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// --- 2. Members (멤버 관리) ---

// GET /workspaces/:id/members (멤버 목록)
exports.getMemberList = async (req, res, next) => {
    try {
        // isMember 미들웨어에서 권한 체크 완료
        const members = await workspaceService.getMemberList(req.params.id);
        res.status(200).json({ items: members });
    } catch (error) {
        next(error);
    }
};

// POST /workspaces/:id/members (멤버 추가 - 직접 추가)
exports.addMember = async (req, res, next) => {
    try {
        // isAdminOrOwner 미들웨어에서 권한 체크 완료
        const { email, role } = req.body;
        const result = await workspaceService.addMember(req.params.id, email, role);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

// PATCH /workspaces/:id/members/:userId (멤버 역할 변경)
exports.updateMemberRole = async (req, res, next) => {
    try {
        // isAdminOrOwner 미들웨어에서 권한 체크 완료
        const result = await workspaceService.updateMemberRole(req.params.id, req.params.userId, req.body.role);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// DELETE /workspaces/:id/members/:userId (멤버 제거)
exports.removeMember = async (req, res, next) => {
    try {
        // canRemoveMember 미들웨어에서 권한 체크 완료 (본인 탈퇴 또는 admin/owner)
        await workspaceService.removeMember(req.params.id, req.params.userId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// --- 3. Invites (초대) ---

// POST /workspaces/:id/invites (초대 발송)
exports.sendInvite = async (req, res, next) => {
    try {
        // isAdminOrOwner 미들웨어에서 권한 체크 완료
        const { email, role } = req.body;
        const result = await workspaceService.sendInvite(req.params.id, req.user.id, email, role);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

// GET /workspaces/:id/invites (초대 목록)
exports.getInviteList = async (req, res, next) => {
    try {
        // isAdminOrOwner 미들웨어에서 권한 체크 완료
        const items = await workspaceService.getInviteList(req.params.id);
        res.status(200).json({ items });
    } catch (error) {
        next(error);
    }
};

// PATCH /workspaces/invites/:token/accept (초대 수락)
exports.acceptInvite = async (req, res, next) => {
    try {
        const result = await workspaceService.acceptInvite(req.params.token, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// PATCH /workspaces/invites/:token/reject (초대 거절)
exports.rejectInvite = async (req, res, next) => {
    try {
        const result = await workspaceService.rejectInvite(req.params.token);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// DELETE /workspaces/invites/:token (초대 취소)
exports.cancelInvite = async (req, res, next) => {
    try {
        // canCancelInvite 미들웨어에서 권한 체크 완료
        // req.invite를 사용하지 않지만, 권한 검사 시 유효성 검사가 완료됨
        await workspaceService.cancelInvite(req.params.token);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

// --- 4. Shared Prompts (공유된 프롬프트) ---

// GET /workspaces/:id/prompts (공유 목록)
exports.getSharedPromptList = async (req, res, next) => {
    try {
        // isMember 미들웨어에서 권한 체크 완료
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

// POST /workspaces/:id/prompts/:promptId/share (공유 추가)
exports.sharePrompt = async (req, res, next) => {
    try {
        // canSharePrompt 미들웨어에서 권한 체크 완료 (멤버면 누구나 가능)
        const { role } = req.body;
        const result = await workspaceService.sharePrompt(req.params.id, req.params.promptId, req.user.id, role);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

// PATCH /workspaces/:id/prompts/:promptId (공유 권한 변경)
exports.updateSharedPromptRole = async (req, res, next) => {
    try {
        // canSharePrompt 미들웨어에서 권한 체크 완료 (멤버면 누구나 가능)
        const { role } = req.body;
        const result = await workspaceService.updateSharedPromptRole(req.params.id, req.params.promptId, role);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// DELETE /workspaces/:id/prompts/:promptId (공유 해제)
exports.unsharePrompt = async (req, res, next) => {
    try {
        // canSharePrompt 미들웨어에서 권한 체크 완료 (멤버면 누구나 가능)
        await workspaceService.unsharePrompt(req.params.id, req.params.promptId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};