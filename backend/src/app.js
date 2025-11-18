const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();  // ✅ .env 로드
const cookieParser = require('cookie-parser');
const passport = require('passport');

const setupPassport = require('./modules/auth/passport');
const mainRouter = require('./routes');
const { ApiError, NotFoundError } = require('./shared/error');
const workspaceRouter = require('./modules/workspaces/workspaces.router');
const authRouter = require('./modules/auth/auth.router');
const userRouter = require('./modules/users/users.router');
const promptRouter = require('./modules/prompts/prompt.router');
const playgroundRouter = require('./modules/playground/playground.router');
const modelRouter = require('./modules/models/model.router');
const notificationRouter = require('./modules/notifications/notification.router');
const settingsRouter = require('./modules/settings/settings.router');

const app = express();

// CORS 허용 origin 목록
const allowedOrigins = [
  'http://localhost:5173',                 // 너 로컬
  'http://localhost:3000',                 // 팀장 로컬일 수도 있음
  'https://promptlab-frontend.vercel.app', // 실제 프론트 배포 주소 (필요시 수정)
];

const corsOptions = {
  origin(origin, callback) {
    // Postman / 서버-서버 요청처럼 origin 없는 경우도 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// CORS 미들웨어
app.use(cors(corsOptions));

// 공통 미들웨어
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// 임시 로그인
//app.use(function (req, res, next) {
//  req.user = { id: 13, is_admin: true };
//  next();
//});

// 헬스 체크
app.get('/health', function (req, res) {
  res.json({ ok: true });
});

// 일부 라우터는 베이스 없이 직접 바인딩
app.use('/api/v1/playground', playgroundRouter);
app.use('/api/v1/models', modelRouter);

// Passport.js 초기화
app.use(passport.initialize());
setupPassport(passport);

// 베이스 URL 하위 라우터
app.use('/api/v1', mainRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/prompts', promptRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/settings', settingsRouter);

// 404 처리
app.use((req, res, next) => {
  next(new NotFoundError('NOT_FOUND', 'API endpoint not found'));
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err);

  if (!(err instanceof ApiError)) {
    err = new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
  }

  res.status(err.statusCode).json({
    error: {
      code: err.code,
      message: err.message,
      details: null,
    },
  });
});

module.exports = app;
