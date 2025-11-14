// src/modules/auth/jwt.js
const jwt = require('jsonwebtoken');
const config = require('../../config');

// Access Token 생성
function generateAccessToken(userId) {
  return jwt.sign(
    { id: userId },
    config.jwt.accessSecret,             // JWT_ACCESS_SECRET
    { expiresIn: config.jwt.accessTtl }  // 초 단위 (예: 900)
  );
}

// Refresh Token 생성
function generateRefreshToken(userId) {
  return jwt.sign(
    { id: userId },
    config.jwt.refreshSecret,               // JWT_REFRESH_SECRET
    { expiresIn: `${config.jwt.refreshTtlDays}d` } // REFRESH_TTL_DAYS
  );
}

// Access Token 검증 (필요하면 나중에 사용)
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.accessSecret);
  } catch (err) {
    return null;
  }
}

// Refresh Token 검증
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (err) {
    return null;
  }
}

// 비밀번호 재설정 토큰 생성
function generateResetToken(userId) {
  if (!config.jwt.resetSecret) {
    throw new Error('JWT_RESET_SECRET is not configured');
  }

  return jwt.sign(
    { id: userId },
    config.jwt.resetSecret,
    { expiresIn: '1h' } // 1시간 유효
  );
}

// 비밀번호 재설정 토큰 검증
function verifyResetToken(token) {
  if (!config.jwt.resetSecret) return null;
  try {
    return jwt.verify(token, config.jwt.resetSecret);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateResetToken,
  verifyResetToken,
};
