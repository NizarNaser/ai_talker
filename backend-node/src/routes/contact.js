const express = require('express');
const { sendContactEmail } = require('../services/emailService');
const { scopedLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', scopedLimiter('contact'), async (req, res) => {
  const { email, message } = req.body || {};
  if (!email || !message) return res.status(400).json({ error: 'البريد والرسالة مطلوبان' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة.' });

  try {
    await sendContactEmail({ fromVisitorEmail: email, message });
    res.json({ message: 'تم إرسال رسالتك بنجاح. شكراً لتواصلك معنا!' });
  } catch (e) {
    console.error('Contact form email error:', e.message);
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال الرسالة.' });
  }
});

module.exports = router;
