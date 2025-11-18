const dotenv = require('dotenv');
const path = require('path');
const configSchema = require('./schema'); // (Zod 스키마)

dotenv.config({ path: path.join(__dirname, '../../.env') });

// zod의 .parse()를 사용하여 process.env 검증 및 변환
let envVars;
try {
  // .parse()는 스키마에 정의되지 않은 값은 무시함
  envVars = configSchema.parse(process.env);
} catch (error) {
  // Zod 에러가 Joi보다 더 자세함
  throw new Error(`Config validation error: ${error.format()}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  appUrl: envVars.APP_URL,
  
  // DB
  databaseUrl: envVars.DATABASE_URL,

  // JWT
  jwt: {
    accessSecret: envVars.JWT_ACCESS_SECRET,
    accessTtl: envVars.JWT_ACCESS_TTL, // 18000 (초)
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshTtl: envVars.REFRESH_TTL_DAYS * 24 * 60 * 60, // (초)
    
    // [수정] .env에 있을 때만 값을 할당
    resetSecret: envVars.JWT_RESET_SECRET || null,
    linkSecret: envVars.JWT_LINK_SECRET || null,
  },

  // [수정] .env에 EMAIL_HOST가 있는 경우에만 email 객체 생성
  email: envVars.EMAIL_HOST ? {
    host: envVars.EMAIL_HOST,
    port: envVars.EMAIL_PORT,
    user: envVars.EMAIL_USER,
    pass: envVars.EMAIL_PASS,
    from: envVars.EMAIL_FROM,
  } : null, // 없으면 null

  // [수정] .env에 GOOGLE_CLIENT_ID가 있는 경우에만 oauth.google 객체 생성
  oauth: {
    google: envVars.GOOGLE_CLIENT_ID ? {
      clientId: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      callbackUrl: envVars.GOOGLE_CALLBACK_URL,
    } : null, // 없으면 null
    github: envVars.GITHUB_CLIENT_ID ? {
      clientId: envVars.GITHUB_CLIENT_ID,
      clientSecret: envVars.GITHUB_CLIENT_SECRET,
      callbackUrl: envVars.GITHUB_CALLBACK_URL,
    } : null, // 없으면 null
  },
};

module.exports = config;