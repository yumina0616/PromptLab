const { verifyAccessToken } = require('../modules/auth/jwt');
const userService = require('../modules/users/users.service');
const { UnauthorizedError } = require('../shared/error');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('UNAUTHORIZED', 'Not authorized, no token'));
  }

  try {
    const decoded = verifyAccessToken(token); 
    if (!decoded) {
      return next(new UnauthorizedError('TOKEN_EXPIRED', 'Not authorized, token failed or expired'));
    }

    // DB에서 사용자 정보 조회 (PDF 스펙 '내 정보 조회'에 필요한 필드)
    req.user = await userService.getUserByIdForProfile(decoded.id);
    if (!req.user) {
      return next(new UnauthorizedError('USER_NOT_FOUND', 'User not found'));
    }
    
    // [신규] 'GET /session'을 위한 토큰 만료 시간 계산
    // decoded.exp는 초(seconds) 단위 타임스탬프
    const nowInSeconds = Math.floor(Date.now() / 1000);
    req.tokenExpiryRemaining = decoded.exp - nowInSeconds;

    next();
  } catch (error) {
    // verifyAccessToken이 만료 외의 에러를 뱉을 경우
    return next(new UnauthorizedError('UNAUTHORIZED', error.message));
  }
};

module.exports = { protect };