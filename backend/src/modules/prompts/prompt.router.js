const router = require('express').Router();
const c = require('./prompt.controller');

// 프롬프트 본문
router.post('/', c.createPrompt);
router.get('/', c.listPrompts);
router.get('/:id', c.getPrompt);
router.patch('/:id', c.updatePrompt);
router.delete('/:id', c.deletePrompt);

// 버전
router.get('/:id/versions', c.listVersions);
router.post('/:id/versions', c.createVersion);
router.get('/:id/versions/:verId', c.getVersion);
router.patch('/:id/versions/:verId', c.updateVersion);
router.delete('/:id/versions/:verId', c.deleteVersion);

// 모델 세팅
router.get('/:id/versions/:verId/model-setting', c.getModelSetting);
router.patch('/:id/versions/:verId/model-setting', c.updateModelSetting);

// 댓글(버전 단위)
router.get('/:id/versions/:verId/comments', c.listComments);
router.post('/:id/versions/:verId/comments', c.createComment);
router.delete('/:id/versions/:verId/comments/:commentId', c.deleteComment);

// 즐겨찾기(버전 단위)
router.post('/:id/versions/:verId/favorite', c.starVersion);
router.delete('/:id/versions/:verId/favorite', c.unstarVersion);

// 포크
router.post('/:id/fork', c.forkPromptFromVersion);

// 태그/카테고리
router.get('/tags', c.listTags);               // ?q=dev 지원
router.get('/categories', c.listCategories);

module.exports = router;
