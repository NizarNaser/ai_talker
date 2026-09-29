const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { scopedLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/', scopedLimiter('stt'), upload.single('audio'), async (req, res) => {
  const audioFile = req.file;
  const language = req.body.language || 'ar-SA';

  if (!audioFile) return res.status(400).json({ error: 'لم يتم إرسال تسجيل صوتي.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'خدمة التعرف الصوتي غير مضبوطة على الخادم.' });

  try {
    const form = new FormData();
    form.append('file', audioFile.buffer, { filename: audioFile.originalname || 'audio.webm', contentType: audioFile.mimetype });
    form.append('model', 'whisper-1');
    form.append('language', (language || 'ar').split('-')[0]);

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });

    const text = (response.data.text || '').trim();
    if (!text) return res.status(400).json({ error: 'لم يتم التعرف على أي كلام في التسجيل. حاول التحدث بوضوح أكبر.' });
    res.json({ text });
  } catch (e) {
    if (e.response) {
      console.error('STT service error:', e.response.status, e.response.data);
      return res.status(503).json({ error: 'تعذّر الوصول لخدمة التعرف الصوتي حالياً. حاول لاحقاً.' });
    }
    console.error('STT error:', e.message);
    res.status(500).json({ error: `حدث خطأ أثناء تحويل الصوت إلى نص: ${e.message}` });
  }
});

module.exports = router;
