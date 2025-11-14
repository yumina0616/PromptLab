const usersService = require('./users.service'); // (복수형)
const { validationResult } = require('express-validator');
const { BadRequestError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError } = require('../../shared/error');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// (TODO: Email 변경 기능) 이메일 전송 서비스
// const { sendEmailChangeVerification } = require('../auth/email'); 

const usersController = {

  /**
   * 1) 공개 프로필 조회
   * GET /users/:userid
   */
  getProfile: async (req, res, next) => {
    try {
      const { userid } = req.params;
      const loggedInUser = req.user; // (optionalAuth가 주입)

      // 1. DB에서 대상 유저 검색
      const targetUserPublic = await usersService.getPublicProfileByUserid(userid);
      if (!targetUserPublic) {
        return next(new NotFoundError('USER_NOT_FOUND', 'User not found'));
      }

      // 2. 본인 조회인지 확인
      const isSelf = loggedInUser && loggedInUser.userid === targetUserPublic.userid;

      // 3. 본인 조회인 경우, 'GET /me'와 동일한 상세 정보 반환
      if (isSelf) {
        // (보안) loggedInUser 객체를 그대로 사용 (optionalAuth가 최신 정보 주입)
        // (스펙) 'GET /me'와 동일한 상세 필드 포함 (user.service.getUserByIdForProfile이 처리)
        const fullProfile = await usersService.getUserByIdForProfile(loggedInUser.id);
        return res.status(200).json(fullProfile);
      }

      // 4. 타인 조회인 경우
      // (스펙) 프로필이 비공개면 404 (또는 403)
      if (!targetUserPublic.visibility.is_profile_public) {
        return next(new NotFoundError('USER_NOT_FOUND', 'User profile is private.'));
      }

      // (스펙) 이메일 비공개 설정 확인
      if (!targetUserPublic.visibility.show_email) {
        // (user.service.getPublicProfileByUserid 쿼리에서 이미 email은 제외됨)
      }
      
      // 5. 공개 프로필 반환
      res.status(200).json(targetUserPublic);

    } catch (error) {
      next(error);
    }
  },

  /**
   * 2) 프로필 수정
   * PATCH /users/:userid
   * (Auth: protect, isSelf)
   */
  updateProfile: async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('INVALID_FIELD', errors.array()[0].msg);
      }

      const { userid: targetUserid } = req.params;
      const loggedInUserId = req.user.id; // (isSelf가 보장)
      const { email, userid, ...profileData } = req.body;

      // 1. (스펙) userid 변경 처리
      if (userid && userid !== req.user.userid) {
        // 중복 검사
        const existing = await usersService.getUserByUserid(userid);
        if (existing) {
          throw new ConflictError('USERID_TAKEN', 'This userid is already taken.');
        }
        profileData.userid = userid;
      }
      
      // (스펙) 응답 객체 (변경 사항 누적)
      let responseBody = {};

      // 2. (스펙) email 변경 처리
      if (email && email !== req.user.email) {
        // 중복 검사
        const existing = await usersService.getUserByEmail(email);
        if (existing) {
          throw new ConflictError('EMAIL_TAKEN', 'This email is already in use.');
        }
        
        // SQL 스키마 변경(pending_email)이 적용되었다고 가정
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600 * 1000); // 1시간
        await usersService.requestEmailChange(loggedInUserId, email, token, expires);
        
        // (TODO: 이메일 발송)
        // await sendEmailChangeVerification(email, token); 
        console.log(`[Email Change] Token for ${email}: ${token}`);
        
        // (스펙) 응답에 pending_email 필드 추가
        responseBody.pending_email = email;
        responseBody.email_status = "pending_verification";
      }

      // 3. 나머지 프로필 정보 (bio, display_name 등) 업데이트
      if (Object.keys(profileData).length > 0) {
        await usersService.updateProfile(loggedInUserId, profileData);
      }

      // 4. 변경된 최신 프로필 정보 반환
      const updatedUser = await usersService.getUserByIdForProfile(loggedInUserId);
      
      // (스펙) 응답: 변경된 사용자 요약 + 이메일 변경 상태
      res.status(200).json({
        ...updatedUser,
        ...responseBody // (pending_email, email_status 포함)
      });

    } catch (error) {
      next(error);
    }
  },
  
  /**
   * 8) 계정 삭제
   * DELETE /users/:userid
   * (Auth: protect, isSelf)
   */
  deleteAccount: async (req, res, next) => {
    try {
      const { verification_token: currentPassword } = req.body;
      const userId = req.user.id; // (isSelf가 보장)

      if (!currentPassword) {
        throw new BadRequestError('MISSING_VERIFICATION_TOKEN', 'Current password is required to delete the account.');
      }

      // 1. 현재 비밀번호 확인 (OAuth 유저는 password가 없음)
      const user = await usersService.getUserByEmailWithPassword(req.user.email);
      if (!user.password) {
        // (정책) OAuth 유저가 계정 삭제하는 방법 (예: 임시 토큰 발급)
        throw new ForbiddenError('OAUTH_DELETE_NOT_SUPPORTED', 'Account deletion for OAuth users via this method is not supported.');
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new UnauthorizedError('INVALID_CREDENTIALS', 'The provided password does not match.');
      }

      // 2. 계정 삭제 (DB의 ON DELETE CASCADE/SET NULL 정책이 나머지를 처리)
      await usersService.deleteUser(userId);

      // 3. (스펙) 204 No Content
      res.status(204).end();

    } catch (error) {
      next(error);
    }
  },
  
  // --- (TODO) 3, 4, 5, 6, 7 API ---
  // (prompts, favorites, forks, activity, export)
  // 이 API들은 스펙이 복잡하므로 (페이지네이션, 정렬, 쿼리)
  // 우선 "준비 중"인 응답을 반환합니다.

  getPrompts: async (req, res, next) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'API not yet implemented.' }});
  },
  getFavorites: async (req, res, next) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'API not yet implemented.' }});
  },
  getForks: async (req, res, next) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'API not yet implemented.' }});
  },
  getActivity: async (req, res, next) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'API not yet implemented.' }});
  },
  exportData: async (req, res, next) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'API not yet implemented.' }});
  },

};

module.exports = usersController;