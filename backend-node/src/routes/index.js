const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/translations', require('./translations'));
router.use('/comments', require('./comments'));
router.use('/', require('./site')); // site-like/
router.use('/contact', require('./contact'));
router.use('/upload-translate', require('./uploadTranslate'));
router.use('/speech-to-text', require('./speechToText'));
router.use('/live-translate', require('./liveTranslate'));
router.use('/health', require('./health'));
router.use('/admin', require('./admin'));

module.exports = router;
