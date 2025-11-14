const express = require('express');

// src/routes.js에서 src/modules/auth/auth.router.js를 바라보는 경로
const authRouter = require('./modules/auth/auth.router');
// src/routes.js에서 src/modules/users/users.router.js를 바라보는 경로
const usersRouter = require('./modules/users/users.router'); // (복수형 s)

const router = express.Router();

// '/api/v1/auth' 경로로 authRouter를 연결
router.use('/auth', authRouter);
// '/api/v1/users' 경로로 usersRouter를 연결
router.use('/users', usersRouter);

module.exports = router;