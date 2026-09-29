const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { signAccessToken, signRefreshToken, getSecret } = require('../middleware/auth');
const { scopedLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', scopedLimiter('auth'), async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  }

  const existing = await User.findOne({ where: { username: email } });
  if (existing) {
    return res.status(400).json({ error: 'المستخدم موجود مسبقاً' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ username: email, email, passwordHash });
  return res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
});

router.post('/token', scopedLimiter('auth'), async (req, res) => {
  const { email, username, password } = req.body || {};
  const login = email || username;
  if (!login || !password) {
    return res.status(400).json({ error: 'البريد الإلكتروني/اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const user = await User.findOne({ where: { username: login } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }

  return res.json({ access: signAccessToken(user), refresh: signRefreshToken(user) });
});

router.post('/token/refresh', async (req, res) => {
  const { refresh } = req.body || {};
  if (!refresh) return res.status(400).json({ error: 'رمز التحديث (refresh) مطلوب' });
  try {
    const payload = jwt.verify(refresh, getSecret());
    if (payload.type !== 'refresh') throw new Error('invalid token type');
    const user = await User.findByPk(payload.sub);
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    return res.json({ access: signAccessToken(user), refresh: signRefreshToken(user) });
  } catch (e) {
    return res.status(401).json({ error: 'رمز التحديث غير صالح أو منتهي الصلاحية' });
  }
});

router.post('/google', scopedLimiter('auth'), async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: 'تسجيل الدخول عبر Google غير مُفعّل على الخادم بعد.' });
  }
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'لم يتم إرسال رمز الدخول (token).' });

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: token, audience: clientId });
    const payload = ticket.getPayload();
    const email = payload && payload.email;
    if (!email) return res.status(400).json({ error: 'تعذّر الحصول على البريد الإلكتروني من حساب Google.' });

    const [user] = await User.findOrCreate({
      where: { username: email },
      defaults: { email, isGoogleAuth: true, profilePicture: payload.picture || null },
    });

    return res.json({
      access: signAccessToken(user),
      refresh: signRefreshToken(user),
      email,
      message: 'تم تسجيل الدخول عبر Google بنجاح.',
    });
  } catch (e) {
    console.warn('Invalid Google token:', e.message);
    return res.status(400).json({ error: 'رمز الدخول عبر Google غير صالح أو منتهي الصلاحية.' });
  }
});

module.exports = router;
