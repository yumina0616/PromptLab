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

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// 미들웨어
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());   

// 임시 로그인
app.use(function(req, res, next){
  req.user = { id: 3, is_admin: true };
  next();
});

app.get('/health', function(req,res){ res.json({ ok:true }); });
app.use('/api/v1/playground', playgroundRouter);
app.use('/api/v1/models', modelRouter);

// Passport.js 초기화
app.use(passport.initialize());
setupPassport(passport);

// 베이스 URL
app.use('/api/v1', mainRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/prompts', promptRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/notifications', notificationRouter);

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
      details: null
    }
  });
});



module.exports = app;
