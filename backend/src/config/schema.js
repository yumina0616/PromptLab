const { z } = require('zod');

// CJS (require) 방식의 Zod 스키마
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // DB
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // JWT (Auth)
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('18000').transform(Number), // (초 단위)
  JWT_REFRESH_SECRET: z.string().min(32),
  REFRESH_TTL_DAYS: z.string().default('30').transform(Number),

  // JWT (Password Reset) - [수정] optional() 추가
  // .env에 값이 없어도 서버가 켜질 수 있게 허용
  JWT_RESET_SECRET: z.string().min(32).optional(),
  
  // JWT (Link Account) - [수정] optional() 추가
  JWT_LINK_SECRET: z.string().min(32).optional(),

  // Email (Nodemailer) - [수정] optional() 추가
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional().transform(Number),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Google OAuth - [수정] optional() 추가
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  // GitHub OAuth - [수정] optional() 추가
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),
});

module.exports = configSchema;