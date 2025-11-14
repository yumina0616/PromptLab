// src/modules/models/model.router.js
const router = require('express').Router();
const c = require('./model.controller');

// 모델 목록 / 상세
router.get('/', c.listModels);
router.get('/:id', c.getModel);

// 모델 단발 테스트 (운영자 전용)
router.post('/test', c.testModel);

module.exports = router;
