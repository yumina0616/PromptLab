const { ForbiddenError, NotFoundError } = require('../../shared/error');
const workspaceService = require('./workspaces.service');

/**
 * 워크스페이스를 로드하고, 멤버 여부와 역할을 req.workspace에 저장합니다.
 */
exports.loadWorkspace = async (req, res, next) => {
    try {
        const workspaceId = req.params.id || req.params.workspaceId; // 라우터에서 :id 또는 :workspaceId를 사용
        if (!workspaceId) {
            return next(new NotFoundError('WORKSPACE_NOT_FOUND', 'Workspace ID is missing.'));
        }

        const workspace = await workspaceService.getWorkspaceById(workspaceId);
        if (!workspace) {
            return next(new NotFoundError('WORKSPACE_NOT_FOUND', 'Workspace not found.'));
        }

        // 1. 워크스페이스 정보 저장
        req.workspace = workspace;
        
        // 2. 현재 사용자의 역할 확인 (로그인 필요)
        if (req.user) {
            const memberRole = await workspaceService.getMemberRole(workspaceId, req.user.id);
            req.workspace.currentUserRole = memberRole; // 'admin', 'editor', 'viewer', or null
        } else {
            req.workspace.currentUserRole = null;
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * 워크스페이스에 접근하는 사용자가 멤버인지 확인합니다. (스펙 3번)
 */
exports.isMember = (req, res, next) => {
    // kind가 'personal'인 경우, 생성자가 곧 멤버이므로 접근 허용 (서비스 로직이 처리)
    if (req.workspace.kind === 'personal' && req.user.id === req.workspace.created_by) {
        return next();
    }

    if (!req.workspace.currentUserRole) {
        return next(new ForbiddenError('FORBIDDEN_ACCESS', 'User is not a member of this workspace.'));
    }
    next();
};

/**
 * 워크스페이스 설정 변경 및 멤버 관리를 위한 admin/owner 권한을 확인합니다.
 */
exports.isAdminOrOwner = (req, res, next) => {
    const role = req.workspace.currentUserRole;
    
    // owner는 created_by와 같음
    const isOwner = req.user.id === req.workspace.created_by;

    if (role === 'admin' || isOwner) {
        return next();
    }
    next(new ForbiddenError('FORBIDDEN_ACTION', 'Requires admin or owner role.'));
};

/**
 * 멤버 제거 시, 본인 탈퇴이거나 admin/owner 권한인지 확인합니다.
 */
exports.canRemoveMember = (req, res, next) => {
    const targetUserId = parseInt(req.params.userId, 10);
    const role = req.workspace.currentUserRole;
    const isOwner = req.user.id === req.workspace.created_by;
    
    // 1. 본인 탈퇴인 경우 허용
    if (req.user.id === targetUserId) {
        return next();
    }

    // 2. Admin 또는 Owner인 경우 허용
    if (role === 'admin' || isOwner) {
        return next();
    }
    
    next(new ForbiddenError('FORBIDDEN_ACTION', 'Requires admin/owner role or self-removal.'));
};

/**
 * 프롬프트 공유 권한을 확인합니다. (스펙 15, 16, 17: 전원 가능)
 * 이 미들웨어는 단순히 isMember 이후에 실행되어야 하며, 추가적인 역할 검사는 없습니다.
 */
exports.canSharePrompt = (req, res, next) => {
    // isMember를 통과했다면, 모든 멤버는 프롬프트 공유/수정/해제가 가능합니다. (스펙 준수)
    next();
};

/**
 * 초대 취소 권한을 확인합니다. (스펙 13: admin 또는 초대한 사용자)
 */
exports.canCancelInvite = async (req, res, next) => {
    const { token } = req.params;
    const invite = await workspaceService.getInviteByToken(token);

    if (!invite) {
        return next(new NotFoundError('INVITE_NOT_FOUND', 'Invitation not found.'));
    }

    const role = req.workspace.currentUserRole;
    const isOwner = req.user.id === req.workspace.created_by;
    const isInviter = req.user.id === invite.invited_by;
    
    if (role === 'admin' || isOwner || isInviter) {
        // 초대 정보를 req에 저장하여 컨트롤러에서 재활용
        req.invite = invite; 
        return next();
    }

    next(new ForbiddenError('FORBIDDEN_ACTION', 'Requires admin/owner role or inviter role.'));
};