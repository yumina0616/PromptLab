const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();  // ✅ .env 로드
const cookieParser = require('cookie-parser'); 
const passport = require('passport');
const setupPassport = require('./modules/auth/passport'); // (변경) ./modules/auth/passport
const mainRouter = require('./routes'); // (변경) ./routes
const { ApiError, NotFoundError } = require('./shared/error'); // (변경) ./shared/error
const workspaceRouter = require('./modules/workspaces/workspaces.router');
const authRouter = require('./modules/auth/auth.router');
const userRouter = require('./modules/users/users.router');
const promptRouter = require('./modules/prompts/prompt.router');
const playgroundRouter = require('./modules/playground/playground.router');
const modelRouter = require('./modules/models/model.router');


const app = express();

// 미들웨어 설정
app.use(cors()); 
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());   

// 임시 로그인
app.use(function(req, res, next){
  req.user = { id: 1, is_admin: true };
  next();
});


app.get('/health', function(req,res){ res.json({ ok:true }); });
app.use('/api/v1/playground', playgroundRouter);
app.use('/api/v1/models', modelRouter);


// Passport.js 초기화
app.use(passport.initialize());
setupPassport(passport); 

// --- 베이스 URL /api/v1로 변경 ---
app.use('/api/v1', mainRouter);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/prompts', promptRouter);
app.use('/api/v1/workspaces', workspaceRouter);

// 404 처리 미들웨어
app.use((req, res, next) => {
  next(new NotFoundError('NOT_FOUND', 'API endpoint not found'));
});

// --- 글로벌 에러 핸들러 (PDF 스펙) ---
app.use((err, req, res, next) => {
  console.error(err);
  
  // ApiError가 아닌 경우 기본 500 에러로 변환
  if (!(err instanceof ApiError)) {
    err = new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error');
  }

  // PDF 에러 포맷
  res.status(err.statusCode).json({
    error: {
      code: err.code,
      message: err.message,
      details: null // PDF 스펙에 따라 null
    }
  });
});

module.exports = app;
