// 기본 API 에러 클래스
class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message || code); // 메시지가 없으면 코드를 메시지로 사용
    this.statusCode = statusCode;
    this.code = code; // 예: "INVALID_CREDENTIALS"
  }
}

// 400 Bad Request
class BadRequestError extends ApiError {
  constructor(code = 'BAD_REQUEST', message = 'Bad Request') {
    super(400, code, message);
  }
}

// 401 Unauthorized
class UnauthorizedError extends ApiError {
  constructor(code = 'UNAUTHORIZED', message = 'Unauthorized') {
    super(401, code, message);
  }
}

// 403 Forbidden (권한 없음)
class ForbiddenError extends ApiError {
  constructor(code = 'FORBIDDEN', message = 'Forbidden') {
    super(403, code, message);
  }
}

// 404 Not Found
class NotFoundError extends ApiError {
  constructor(code = 'NOT_FOUND', message = 'Not Found') {
    super(404, code, message);
  }
}

// 409 Conflict
class ConflictError extends ApiError {
  constructor(code = 'CONFLICT', message = 'Conflict') {
    super(409, code, message);
  }
}


module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError, // [추가]
  NotFoundError,
  ConflictError,
};