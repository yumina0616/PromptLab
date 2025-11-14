const usersService = require('./users.service'); // (복수형)
const { validationResult } = require('express-validator');
const { BadRequestError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError } = require('../../shared/error');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// (TODO: Email 변경 기능) 이메일 전송 서비스
// const { sendEmailChangeVerification } = require('../auth/email'); 

// (유틸) 쿼리 파라미터에서 옵션 추출
const extractListOptions = (query) => ({
  page: parseInt(query.page, 10) || 1,
  limit: parseInt(query.limit, 10) || 20,
  sort: query.sort,
  q: query.q,
  category: query.category,
  action: query.action,
});

// (유틸) 페이지네이션 응답 포맷
const formatPaginatedResponse = (data, page, limit) => ({
  items: data.items,
  page: page,
  limit: limit,
  total: data.total,
});


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
  
  // --- [수정] 3, 4, 5, 6, 7 API (실제 로직 구현) ---

  /**
   * 3) 내가 만든 프롬프트 목록
   * GET /users/:userid/prompts
   */
  getPrompts: async (req, res, next) => {
    try {
      const { userid } = req.params;
      const loggedInUser = req.user; // (optionalAuth)
      const options = extractListOptions(req.query);

      // 1. 대상 유저의 ID 찾기
      const targetUser = await usersService.getUserByUserid(userid);
      if (!targetUser) {
        return next(new NotFoundError('USER_NOT_FOUND', 'Target user not found.'));
      }
      
      // 2. 서비스 호출
      const data = await usersService.getPromptsByUserid(
        targetUser.id, 
        loggedInUser ? loggedInUser.id : null, 
        options
      );

      // 3. 응답 포맷
      res.status(200).json(formatPaginatedResponse(data, options.page, options.limit));

    } catch (error) {
      next(error);
    }
  },

  /**
   * 4) 내가 즐겨찾기한 프롬프트
   * GET /users/:userid/favorites
   */
  getFavorites: async (req, res, next) => {
    console.log('[getFavorites] req.user =', req.user);
    console.log('[getFavorites] params.userid =', req.params.userid);
    try {
      const { userid } = req.params;
      const loggedInUser = req.user; // (optionalAuth)
      const options = extractListOptions(req.query);

      // 1. 대상 유저 ID 찾기
      const targetUser = await usersService.getUserByUserid(userid);
      if (!targetUser) {
        return next(new NotFoundError('USER_NOT_FOUND', 'Target user not found.'));
      }

      // 2. 서비스 호출 (권한 검사는 서비스 내부에서)
      const data = await usersService.getFavoritesByUserid(
        targetUser.id, 
        loggedInUser ? loggedInUser.id : null, 
        options
      );
      
      // 3. 응답 포맷
      res.status(200).json(formatPaginatedResponse(data, options.page, options.limit));

    } catch (error) {
      // (스펙) 본인만 접근 가능
      if (error.message === 'FORBIDDEN') {
        return next(new ForbiddenError('FORBIDDEN', 'You can only view your own favorites.'));
      }
      next(error);
    }
  },

  /**
   * 5) 내가 포크한 프롬프트
   * GET /users/:userid/forks
   */
  getForks: async (req, res, next) => {
    try {
      const { userid } = req.params;
      const loggedInUser = req.user; // (optionalAuth)
      const options = extractListOptions(req.query);

      const targetUser = await usersService.getUserByUserid(userid);
      if (!targetUser) {
        return next(new NotFoundError('USER_NOT_FOUND', 'Target user not found.'));
      }

      const data = await usersService.getForksByUserid(
        targetUser.id, 
        loggedInUser ? loggedInUser.id : null, 
        options
      );
      
      res.status(200).json(formatPaginatedResponse(data, options.page, options.limit));

    } catch (error) {
      if (error.message === 'FORBIDDEN') {
        return next(new ForbiddenError('FORBIDDEN', 'You can only view your own forks.'));
      }
      next(error);
    }
  },

  /**
   * 6) 활동 로그
   * GET /users/:userid/activity
   */
  getActivity: async (req, res, next) => {
    try {
      const { userid } = req.params;
      const loggedInUser = req.user; // (optionalAuth)
      const options = extractListOptions(req.query);

      const targetUser = await usersService.getUserByUserid(userid);
      if (!targetUser) {
        return next(new NotFoundError('USER_NOT_FOUND', 'Target user not found.'));
      }

      const data = await usersService.getActivityByUserid(
        targetUser.id, 
        loggedInUser ? loggedInUser.id : null, 
        options
      );
      
      res.status(200).json(formatPaginatedResponse(data, options.page, options.limit));

    } catch (error) {
      if (error.message === 'FORBIDDEN') {
        return next(new ForbiddenError('FORBIDDEN', 'You can only view your own activity log.'));
      }
      next(error);
    }
  },

  /**
   * 7) 내 데이터 내보내기(요청)
   * GET /users/:userid/export
   */
  exportData: async (req, res, next) => {
    try {
      // (isSelf 미들웨어가 통과했으므로 req.user.id는 본인 ID임)
      const userId = req.user.id;
      
      // (스펙) 비동기 작업 요청
      const job = await usersService.requestExport(userId);
      
      res.status(202).json(job); // (202 Accepted)

    } catch (error) {
      next(error);
    }
  },

};

module.exports = usersController;