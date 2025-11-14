const { verifyAccessToken } = require('../modules/auth/jwt');
const userService = require('../modules/users/users.service'); // (복수형 s)
const { UnauthorizedError, ForbiddenError } = require('../shared/error');

/**
 * [인가] 요청의 :userid가 현재 로그인한 사용자와 일치하는지 확인합니다.
 * (주의) 반드시 'protect' 미들웨어 뒤에 사용해야 합니다.
 */
const isSelf = (req, res, next) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('UNAUTHORIZED', 'Authentication required'));
    }
    
    // URL 파라미터의 :userid (문자열)와
    // 토큰에서 가져온 req.user.userid (문자열)를 비교합니다.
    if (req.user.userid === req.params.userid) {
      return next(); // 1. 본인 맞음 (통과)
    }

    // (TODO: 관리자 권한 확인)
    // if (req.user.role === 'admin') { return next(); }

    // 3. 본인도, 관리자도 아님 (권한 없음)
    return next(new ForbiddenError('FORBIDDEN', 'You are not authorized to perform this action on this user.'));
  
  } catch (error) {
    next(error);
  }
};

/**
 * [인증] 선택적 로그인 (로그인 안해도 되지만, 하면 req.user 주입)
 * 'GET /users/:userid' (공개 프로필) 같은 곳에서 사용
 */
const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(); // 토큰 없으면 그냥 통과 (req.user는 없음)
  }

  try {
    const decoded = verifyAccessToken(token); 
    if (!decoded) {
      return next(); // 토큰이 유효하지 않아도 (만료 등) 그냥 통과
    }

    // 토큰이 유효하면, DB에서 사용자 정보를 가져와 주입
    req.user = await userService.getUserByIdForProfile(decoded.id);
    next();

  } catch (error) {
    // 예상치 못한 에러가 나도, 인증이 필수는 아니므로 통과
    next();
  }
};

module.exports = { 
  isSelf,
  optionalAuth 
};