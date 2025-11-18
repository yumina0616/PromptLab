const bcrypt = require('bcryptjs');
const userService = require('../users/users.service');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  generateResetToken,
  verifyResetToken,
} = require('./jwt');
const { sendPasswordResetEmail } = require('./email');
const { BadRequestError, UnauthorizedError, ConflictError } = require('../../shared/error');
const config = require('../../config'); // expires_in을 위해

const authService = {
  /**
   * 회원가입 (Register)
   */
  register: async ({ email, password, userid, displayName }) => {
    // 1. 이메일 중복 확인
    const emailExists = await userService.getUserByEmailWithPassword(email);
    if (emailExists) {
      throw new ConflictError('EMAIL_TAKEN', 'This email is already registered.');
    }
    // 2. UserID 중복 확인
    const useridExists = await userService.getUserByUserid(userid);
    if (useridExists) {
      throw new ConflictError('USERID_TAKEN', 'This userid is already taken.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 3. DB에 사용자 생성 (PDF 스펙 필드)
    const user = await userService.createUser({ 
      email, 
      hashedPassword, 
      userid, 
      displayName 
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await userService.updateRefreshToken(user.id, refreshToken);

    // 4. PDF 스펙 응답 반환
    return { 
      user: user, // { id, email, userid, display_name }
      accessToken: accessToken, 
      expiresIn: config.jwt.accessTtl,
      refreshToken: refreshToken, // (컨트롤러에서 쿠키로 설정하기 위해)
    };
  },

  /**
   * 로그인 (Login)
   */
  login: async (email, password) => {
    const user = await userService.getUserByEmailWithPassword(email);
    if (!user || !user.password) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await userService.updateRefreshToken(user.id, refreshToken);

    // PDF 스펙 응답 반환
    return { 
      user: { // PDF 스펙에 맞는 필드
        id: user.id,
        email: user.email,
        userid: user.userid,
        display_name: user.display_name
      },
      accessToken: accessToken, 
      expiresIn: config.jwt.accessTtl,
      refreshToken: refreshToken,
    };
  },

  /**
   * 토큰 재발급 (Refresh)
   */
  refresh: async (token) => {
    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }

    const user = await userService.getUserByIdWithRefreshToken(decoded.id);
    if (!user || user.refresh_token !== token) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN', 'Refresh token mismatch or user not found');
    }

    const accessToken = generateAccessToken(user.id);
    
    // PDF 스펙 응답 반환
    return { 
      accessToken: accessToken,
      expiresIn: config.jwt.accessTtl
    };
  },




  /**
   * 로그아웃 (Logout)
   */
/**
 * 로그아웃 (Logout)
 */
  logout: async (refreshToken) => {
    // Refresh Token이 없으면 아무것도 안함
    if (!refreshToken) {
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);  // ✅ 올바른 변수 사용
    if (!decoded) {
      // 이미 만료/깨진 토큰이면 그냥 조용히 무시
      return;
    }

    // DB에서 Refresh Token을 무효화
    await userService.updateRefreshToken(decoded.id, null);

    // PDF 스펙 204용: 반환값 없음
  },


  /**
   * 비밀번호 변경 (Change Password)
   */
// 수정 버전
/**
 * 비밀번호 변경 (Change Password)
 */
  changePassword: async (userId, currentPassword, newPassword) => {
    // id로 유저 + 패스워드 가져오기
    const user = await userService.getUserByIdWithPassword(userId);
    if (!user || !user.password) {
      throw new BadRequestError('OAUTH_USER', 'OAuth users cannot change password this way.');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid current password');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await userService.updatePassword(user.id, hashedPassword);
  },



  /**
   * 비밀번호 재설정 요청 (Reset Request)
   */
  requestPasswordReset: async (email) => {
    const user = await userService.getUserByEmailWithPassword(email);
    if (!user || !user.password) {
      // (PDF 스펙) 이메일이 없거나 OAuth 유저여도 204를 반환 (보안)
      console.warn(`Password reset attempt for non-local account: ${email}`);
      return;
    }

    const resetToken = generateResetToken(user.id);
    await sendPasswordResetEmail(email, resetToken);
  },

  /**
   * 비밀번호 재설정 확정 (Reset Confirm)
   */
  confirmPasswordReset: async (token, newPassword) => {
    const decoded = verifyResetToken(token);
    if (!decoded) {
      throw new UnauthorizedError('INVALID_OR_EXPIRED_TOKEN', 'Invalid or expired password reset token');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await userService.updatePassword(decoded.id, hashedPassword);

    // 보안: 비번 재설정 시 해당 유저의 리프레시 토큰 무효화
    await userService.updateRefreshToken(decoded.id, null);
  },
  
  /**
   * OAuth 연동 해제
   */
  unlinkOauth: async (userId, provider) => {
    // id 기준으로, 비밀번호 있는(local) 유저인지 확인
    const user = await userService.getUserByIdWithPassword(userId);

    if (!user || !user.password) {
      throw new BadRequestError(
        'LAST_LOGIN_METHOD',
        'Cannot unlink the only login method. Please set a password first.'
      );
    }

    await userService.deleteOauthAccount(userId, provider);
  },

};

module.exports = authService;