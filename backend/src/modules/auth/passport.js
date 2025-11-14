const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const config = require('../../config');
const userService = require('../users/users.service');
const { BadRequestError } = require('../../shared/error');

// passport.js 설정을 초기화하는 함수
module.exports = (passport) => {

  // --- Google OAuth Strategy ---
  passport.use(new GoogleStrategy(
    {
      clientID: config.oauth.google.clientId,
      clientSecret: config.oauth.google.clientSecret,
      callbackURL: config.oauth.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos } = profile;
        const email = emails[0].value;
        const profileImageUrl = photos[0].value;

        // 1. 기존 OAuth 계정 확인
        let oauthAccount = await userService.getOauthAccount('google', id);
        
        if (oauthAccount) {
          // 이미 계정이 있으면 로그인 처리
          const user = await userService.getUserByIdForProfile(oauthAccount.user_id);
          return done(null, { user }); // 로그인 성공 (user 객체 전달)
        }

        // 2. 이메일로 기존 유저 확인
        let user = await userService.getUserByEmail(email);

        if (user && user.login_type !== 'google') {
          // (정책) 이미 'local'이나 'github'로 가입된 이메일
           if (user.login_type === 'local') {
             // (계정 연결) -> 여기서는 '계정 연결'이 아닌 '로그인' 플로우이므로 에러 대신,
             // 혹은 자동으로 연결해줄 수 있으나, 우선은 명확한 '로그인' 플로우만 처리.
             // 이 로직은 '계정 연결' API에서 처리해야 함.
             // 여기서는 '로그인' 시도이므로,
             // "이미 'local'로 가입됨"을 알리거나, '계정 연결'을 유도해야 함.
             // 우선은 기존 유저 정보를 반환 (로그인 성공으로 간주)
             console.warn(`OAuth login attempt for existing local user: ${email}`);
           } else {
             // 깃헙 유저 등
           }
        }
        
        if (!user) {
          // 3. 신규 유저 생성 (User 테이블)
          user = await userService.createOauthUser({
            email: email,
            displayName: displayName,
            profileImageUrl: profileImageUrl,
            loginType: 'google',
            // userid는 자동생성하거나, email 앞부분을 따거나, 별도 처리 필요
            // PDF 스펙상 userid가 NOT NULL, UNIQUE 이므로 임시 ID 생성
            userid: `google_${id.substring(0, 10)}` 
          });
        }

        // 4. 신규 OAuth 계정 생성 (oauth_account 테이블)
        await userService.createOauthAccount({
          userId: user.id,
          provider: 'google',
          providerUserId: id,
          accessToken, // (저장 선택)
          refreshToken, // (저장 선택)
        });
        
        // 최종 user 객체 반환
        const finalUser = await userService.getUserByIdForProfile(user.id);
        return done(null, { user: finalUser });

      } catch (error) {
        return done(error, false);
      }
    }
  ));

  // --- GitHub OAuth Strategy ---
  passport.use(new GitHubStrategy(
    {
      clientID: config.oauth.github.clientId,
      clientSecret: config.oauth.github.clientSecret,
      callbackURL: config.oauth.github.callbackUrl,
      scope: ['user:email'], // 이메일 스코프 필수
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos, username } = profile;
        const email = emails[0].value;
        const profileImageUrl = photos[0].value;

        // (Google과 동일한 로직 반복)
        let oauthAccount = await userService.getOauthAccount('github', id);
        
        if (oauthAccount) {
          const user = await userService.getUserByIdForProfile(oauthAccount.user_id);
          return done(null, { user });
        }
        
        let user = await userService.getUserByEmail(email);
        
        if (user && user.login_type !== 'github') {
           console.warn(`OAuth login attempt for existing non-github user: ${email}`);
        }
        
        if (!user) {
          user = await userService.createOauthUser({
            email: email,
            displayName: displayName || username, // 깃헙은 displayName이 null일 수 있음
            profileImageUrl: profileImageUrl,
            loginType: 'github',
            userid: username || `github_${id}` // 깃헙 username을 userid로 활용
          });
        }

        await userService.createOauthAccount({
          userId: user.id,
          provider: 'github',
          providerUserId: id,
          accessToken,
          refreshToken,
        });

        const finalUser = await userService.getUserByIdForProfile(user.id);
        return done(null, { user: finalUser });

      } catch (error) {
        return done(error, false);
      }
    }
  ));
  
  // (참고) Passport는 기본적으로 세션을 사용하려 하지만,
  // 우리는 JWT를 쓸 것이므로 serialize/deserializeUser는 구현하지 않습니다.
};