const { check, body, validationResult } = require('express-validator');
const { BadRequestError } = require('../shared/error');

// [신규 추가 1/2] 회원가입 (Auth API)
exports.validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/) // (스펙) 최소 8자, 영문/숫자 조합
    .withMessage('Password must be at least 8 characters and include letters and numbers'),
  
  body('userid')
    .isString()
    .isLength({ min: 3, max: 30 })
    .withMessage('Userid must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/) // (스펙) 영문/숫자/밑줄
    .withMessage('Userid can only contain letters, numbers, and underscores'),
  
  body('display_name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Display name must be between 1 and 120 characters'),

  // (결과 처리)
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new BadRequestError('INVALID_FIELD', errors.array()[0].msg));
    }
    next();
  },
];

// [신규 추가 2/2] 로그인 (Auth API)
exports.validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  // (결과 처리)
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new BadRequestError('INVALID_FIELD', errors.array()[0].msg));
    }
    next();
  },
];

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

exports.validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/)
    .withMessage('New password must be at least 8 characters and include letters and numbers'),

  // (결과 처리)
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new BadRequestError('INVALID_FIELD', errors.array()[0].msg));
    }
    next();
  },
];


exports.validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  // (결과 처리)
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new BadRequestError('INVALID_FIELD', errors.array()[0].msg));
    }
    next();
  },
];

exports.validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Token is required'),
  
  body('new_password')                 // ✅ newPassword → new_password
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/)
    .withMessage('New password must be at least 8 characters and include letters and numbers'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new BadRequestError('INVALID_FIELD', errors.array()[0].msg));
    }
    next();
  },
];

