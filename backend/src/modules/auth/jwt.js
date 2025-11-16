// src/modules/auth/jwt.js
const jwt = require('jsonwebtoken');
const config = require('../../config');

// 안전하게 시크릿/TTL 가져오기
const ACCESS_SECRET =
  (config.jwt && (config.jwt.accessSecret || config.jwt.secret)) ||
  process.env.JWT_ACCESS_SECRET;

const REFRESH_SECRET =
  (config.jwt && (config.jwt.refreshSecret || config.jwt.accessSecret || config.jwt.secret)) ||
  process.env.JWT_REFRESH_SECRET;

const ACCESS_TTL =
  (config.jwt && config.jwt.accessTtl) || 900; // 초 단위

const RESET_SECRET =
  (config.jwt && config.jwt.resetSecret) || process.env.JWT_RESET_SECRET;

// -------------------- Access Token -------------------- //

function generateAccessToken(userId) {
  return jwt.sign(
    { id: userId },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }  // 초
  );
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (err) {
    console.error('[JWT] access verify error:', err.message);
    return null;
  }
}

// -------------------- Refresh Token -------------------- //

function generateRefreshToken(userId) {
  return jwt.sign(
    { id: userId },
    REFRESH_SECRET,
    { expiresIn: '30d' }       // 30일 고정
  );
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    console.error('[JWT] refresh verify error:', err.message);
    return null;
  }
}

// -------------------- Password Reset Token -------------------- //

function generateResetToken(userId) {
  if (!RESET_SECRET) {
    throw new Error('JWT_RESET_SECRET (resetSecret) is not configured');
  }

  return jwt.sign(
    { id: userId },
    RESET_SECRET,
    { expiresIn: '1h' }        // 1시간
  );
}

function verifyResetToken(token) {
  if (!RESET_SECRET) return null;

  try {
    return jwt.verify(token, RESET_SECRET);
  } catch (err) {
    console.error('[JWT] reset verify error:', err.message);
    return null;
  }
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateResetToken,
  verifyResetToken,
};
