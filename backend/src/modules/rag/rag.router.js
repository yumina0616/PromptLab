const express = require('express');
const { protect } = require('../../middlewares/protect');
const controller = require('./rag.controller');

const router = express.Router();

router.use(protect); // All RAG routes require authentication for now.

router.get('/guidelines', controller.listGuidelines);
router.post('/guidelines', controller.createGuideline);
router.patch('/guidelines/:id', controller.updateGuideline);
router.post('/guidelines/retrieve', controller.retrieveGuidelines);
router.post('/tips', controller.generateTips);

module.exports = router;
