const { body, param, query, validationResult } = require('express-validator');
const { BadRequestError } = require('../../shared/error');

// Slug 유효성 검사 함수 (소문자, 숫자, 하이픈만 허용, 길이 3~40)
const slugValidation = (field) => body(field)
    .optional() // PATCH 등에서 선택 사항
    .isString()
    .trim()
    .isLength({ min: 3, max: 40 })
    .withMessage('Slug must be between 3 and 40 characters.')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens.');

// 유효성 검사 결과를 처리하는 공통 미들웨어
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new BadRequestError('INVALID_FIELD', errors.array()[0].msg));
    }
    next();
};

// --- 1. Workspace (기본 CRUD) ---

// POST /workspaces (생성)
exports.validateCreateWorkspace = [
    body('kind')
        .isIn(['team']) // 스펙: "team"만 생성 가능
        .withMessage('Only "team" kind workspaces can be created via this endpoint.'),
    body('name')
        .isString()
        .trim()
        .isLength({ min: 1, max: 120 })
        .withMessage('Name must be between 1 and 120 characters.'),
    slugValidation('slug'), // 선택 사항
    handleValidationErrors,
];

// PATCH /workspaces/:id (수정)
exports.validateUpdateWorkspace = [
    body('name')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 120 })
        .withMessage('Name must be between 1 and 120 characters.'),
    slugValidation('slug'),
    handleValidationErrors,
];

// --- 2. Members (멤버 관리) ---

// POST /workspaces/:id/members (직접 추가)
exports.validateAddMember = [
    body('email') // 스펙 요청: user_id 대신 email 사용
        .isEmail()
        .withMessage('Please provide a valid email to invite.'),
    body('role')
        .isIn(['viewer', 'editor', 'admin'])
        .withMessage('Role must be one of viewer, editor, or admin.'),
    handleValidationErrors,
];

// PATCH /workspaces/:id/members/:userId (역할 변경)
exports.validateUpdateMemberRole = [
    body('role')
        .isIn(['viewer', 'editor', 'admin'])
        .withMessage('Role must be one of viewer, editor, or admin.'),
    handleValidationErrors,
];

// --- 3. Invites (초대) ---

// POST /workspaces/:id/invites (초대 발송)
exports.validateSendInvite = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email for invitation.'),
    body('role')
        .isIn(['viewer', 'editor', 'admin'])
        .withMessage('Role must be one of viewer, editor, or admin.'),
    handleValidationErrors,
];

// PATCH /workspaces/invites/:token/accept/reject (토큰 처리)
exports.validateInviteToken = [
    param('token')
        .isString()
        .notEmpty()
        .withMessage('Invitation token is required.'),
    handleValidationErrors,
];

// --- 4. Shared Prompts (프롬프트 공유) ---

// POST /workspaces/:id/prompts/:promptId/share (공유 추가)
// PATCH /workspaces/:id/prompts/:promptId (공유 권한 변경)
exports.validatePromptShare = [
    body('role')
        .isIn(['viewer', 'editor']) // 스펙: viewer|editor
        .withMessage('Prompt role must be either viewer or editor.'),
    handleValidationErrors,
];

// --- 5. Common (공통 유효성 검사) ---

// 쿼리 매개변수 유효성 검사 (목록형 API)
exports.validatePagination = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
    query('sort').optional().isIn(['recent', 'name']).withMessage('Sort can only be "recent" or "name".'),
    handleValidationErrors,
];