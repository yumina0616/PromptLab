const { check, body, validationResult } = require('express-validator');
const { BadRequestError } = require('../shared/error');

// (기존 validateRegistration, validateLogin, ... 등등의 코드)
// ...

// [추가] 5. 프로필 수정 (PATCH /users/:userid)
exports.validateProfileUpdate = [
  // (주의) :userid는 URL 파라미터이므로 여기서 검증 안 함
  // (스펙) email은 별도 API로 처리해야 하나, 우선 유효성 검사
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('userid')
    .optional()
    .isString()
    .isLength({ min: 3, max: 30 })
    .withMessage('Userid must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/) // (스펙) 영문/숫자/밑줄
    .withMessage('Userid can only contain letters, numbers, and underscores'),
    
  body('display_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Display name must be between 1 and 120 characters'),
  
  body('bio')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 }) // (예시: 500자 제한)
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('profile_image_url')
    .optional()
    .isURL()
    .withMessage('Profile image URL must be a valid URL'),

  // (결과 처리)
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // PDF 스펙에 맞는 400 에러 반환
      return next(new BadRequestError('INVALID_FIELD', errors.array()[0].msg));
    }
    next();
  },
];