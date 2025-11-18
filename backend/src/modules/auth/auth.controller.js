const authService = require('./auth.service');
const userService = require('../users/users.service'); // UserService 추가
const jwt = require('jsonwebtoken'); // jwt 추가 (토큰 생성용)
const config = require('../../config');
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, { expiresIn: config.jwt.accessTtl });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshTtl });
};
const { validationResult } = require('express-validator');
const { BadRequestError, ApiError, UnauthorizedError } = require('../../shared/error');
const passport = require('passport');

// (PDF 스펙) HttpOnly 쿠키 설정
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // https에서만
    sameSite: 'strict',
    maxAge: config.jwt.refreshTtl * 1000, // ms
  });
};

const authController = {
  // POST /register
  register: async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('VALIDATION_ERROR', errors.array()[0].msg);
      }
      
      const data = await authService.register(req.body);
      
      setRefreshTokenCookie(res, data.refreshToken);
      
      // (PDF 스펙)
      res.status(201).json({
        user: data.user,
        access_token: data.accessToken,
        expires_in: data.expiresIn,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /login
  login: async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('VALIDATION_ERROR', errors.array()[0].msg);
      }

      const { email, password } = req.body;
      const data = await authService.login(email, password);
      
      setRefreshTokenCookie(res, data.refreshToken);
      
      // (PDF 스펙)
      res.status(200).json({
        access_token: data.accessToken,
        expires_in: data.expiresIn,
        user: data.user,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /refresh

// POST /refresh
  refresh: async (req, res, next) => {
    try {
      // 1순위: Body, 2순위: 쿠키
      const token = req.body.refresh_token || req.cookies.refresh_token;

      if (!token) {
        throw new UnauthorizedError('INVALID_REFRESH_TOKEN', 'No refresh token provided');
      }

      const data = await authService.refresh(token);

      res.status(200).json({
        access_token: data.accessToken,
        expires_in: data.expiresIn,
      });
    } catch (error) {
      next(error);
    }
  },



  // POST /logout

  logout: async (req, res, next) => {
    try {
      const refreshToken =
        (req.cookies && req.cookies.refresh_token) ||
        (req.body && req.body.refresh_token) ||
        null;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.cookie('refresh_token', '', {
        httpOnly: true,
        expires: new Date(0),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // GET /me
  getMe: (req, res, next) => {
    // protect 미들웨어에서 req.user에 이미 정보를 담아둠
    res.status(200).json(req.user);
  },

  // GET /session
  getSession: (req, res, next) => {
    // protect 미들웨어에서 남은 만료 시간을 계산해둠
    res.status(200).json({
      authenticated: true,
      expires_in: Math.floor(req.tokenExpiryRemaining),
    });
  },

  // --- OAuth ---
  oauthStart: (req, res, next) => {
    const provider = req.params.provider;
    if (provider === 'google') {
      passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
    } else if (provider === 'github') {
      passport.authenticate('github', { scope: ['read:user', 'user:email'], session: false })(req, res, next);
    } else {
      next(new BadRequestError('INVALID_PROVIDER', 'Invalid provider'));
    }
  },

  googleCallback: (req, res, next) => {
    // (PDF 스펙) OAuth 콜백 성공 시 로그인과 동일하게 토큰 발급
    try {
      const user = req.user;
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      userService.updateRefreshToken(user.id, refreshToken); // 비동기
      
      setRefreshTokenCookie(res, refreshToken);
      // (PDF 스펙) 프론트 콜백으로 리다이렉트 (토큰 전달)
      res.redirect(`${config.appUrl}/auth/callback?access_token=${accessToken}&expires_in=${config.jwt.accessTtl}`);
    } catch (error) {
      next(error);
    }
  },
  githubCallback: (req, res, next) => { /* (googleCallback과 동일) */ },

  unlinkOauth: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { provider } = req.params;
      if (!['google', 'github'].includes(provider)) {
        throw new BadRequestError('INVALID_PROVIDER', 'Invalid provider');
      }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
      await authService.unlinkOauth(userId, provider);
      
      // (PDF 스펙)
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // 3. OAuth (누락된 함수 및 콜백 수정)

  // (라우터 39줄에서 요구함) - 기존의 주석 /* (googleCallback과 동일) */을 대체
  githubCallback: async (req, res, next) => { 
    try {
      if (!req.user) throw new ApiError('OAUTH_AUTH_FAILED', 'GitHub authentication failed');
      
      const user = req.user;
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      await userService.updateRefreshToken(user.id, refreshToken);
      
      setRefreshTokenCookie(res, refreshToken);
      // (PDF 스펙) 프론트 콜백으로 리다이렉트 (토큰 전달)
      res.redirect(`${config.appUrl}/auth/callback?access_token=${accessToken}&expires_in=${config.jwt.accessTtl}`);
    } catch (error) {
      next(error);
    }
  },

  // (라우터 48줄에서 요구함) - 이전 에러의 진짜 원인
  linkOauthStart: (req, res, next) => {
    // protect 미들웨어를 통과했으므로 실제 passport 미들웨어를 실행합니다.
    const { provider } = req.params;

    if (provider === 'google') {
      passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
    } else if (provider === 'github') {
      passport.authenticate('github', { scope: ['read:user', 'user:email'], session: false })(req, res, next);
    } else {
      next(new BadRequestError('INVALID_PROVIDER', 'Invalid provider'));
    }
  },


  // 5. Profile & Session (라우터 52/53줄에서 요구하는 이름으로 통일)

  // (라우터 52줄에서 요구함)
  getProfile: (req, res) => {
    // req.user는 protect 미들웨어에서 JWT Payload 정보를 담고 있습니다.
    res.status(200).json(req.user);
  },

  // (라우터 53줄에서 요구함)
  checkSession: (req, res) => {
    // protect 미들웨어 통과 후 실행
    res.status(200).json({ 
      is_valid: true,
      user: req.user // 사용자 정보를 함께 반환
    });
  },

  // --- Password Management ---

// auth.controller.js

// auth.controller.js

  changePassword: async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('VALIDATION_ERROR', errors.array()[0].msg);
      }

      // protect 미들웨어에서 넣어준 유저 id
      const userId = req.user.id;

      // 스펙: current_password / new_password
      const { current_password, new_password } = req.body;

      await authService.changePassword(userId, current_password, new_password);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },





  requestPasswordReset: async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new BadRequestError('VALIDATION_ERROR', errors.array()[0].msg);
      
      await authService.requestPasswordReset(req.body.email);
      // (PDF 스펙)
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  confirmPasswordReset: async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new BadRequestError('VALIDATION_ERROR', errors.array()[0].msg);
      
      const { token, new_password } = req.body;
      await authService.confirmPasswordReset(token, new_password);
      
      // (PDF 스펙)
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

module.exports = authController;