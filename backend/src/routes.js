const express = require('express');
const router = express.Router();

const promptRouter = require('./modules/prompts/prompt.router');

router.use('/prompts', promptRouter);

module.exports = router;
const authRouter = require('./modules/auth/auth.router');
// src/routes.js에서 src/modules/users/users.router.js를 바라보는 경로
const usersRouter = require('./modules/users/users.router'); // (복수형 s)
const ragRouter = require('./modules/rag/rag.router');

// '/api/v1/auth' 경로로 authRouter를 연결
router.use('/auth', authRouter);
// '/api/v1/users' 경로로 usersRouter를 연결
router.use('/users', usersRouter);
router.use('/rag', ragRouter);

module.exports = router;
