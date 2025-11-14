const express = require('express');
const morgan = require('morgan');
require('dotenv').config();  // ✅ .env 로드

const promptRouter = require('./modules/prompts/prompt.router');
const playgroundRouter = require('./modules/playground/playground.router');
const modelRouter = require('./modules/models/model.router');

const app = express();
app.use(express.json());
app.use(morgan('dev'));

// 임시 로그인
app.use(function(req, res, next){
  req.user = { id: 1, is_admin: true };
  next();
});


app.get('/health', function(req,res){ res.json({ ok:true }); });
app.use('/api/v1/prompts', promptRouter);
app.use('/api/v1/playground', playgroundRouter);
app.use('/api/v1/models', modelRouter);

app.use(function(err, req, res, next){
  console.error('❌ Error middleware:', err);
  res.status(err.status || 500).json({ error: err.message });
});

module.exports = app;
