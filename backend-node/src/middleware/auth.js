const jwt = require('jsonwebtoken');
const { User } = require('../models');

function getSecret() {
  const secret = process.env.SECRET_KEY;
  if (!secret) throw new Error('SECRET_KEY غير مضبوط.');
  return secret;
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, isAdmin: user.isAdmin, type: 'access' }, getSecret(), {
    expiresIn: '1d',
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, getSecret(), { expiresIn: '7d' });
}

// يوازي IsAuthenticatedOrReadOnly الافتراضي في DRF: يحاول قراءة المستخدم من
// التوكن إن وُجد، لكن لا يرفض الطلب إن كان غائباً (تتحقق كل واجهة بنفسها
// إن كانت تتطلب مستخدماً مسجلاً عبر requireAuth أدناه).
async function attachUserIfPresent(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, getSecret());
    if (payload.type !== 'access') return next();
    const user = await User.findByPk(payload.sub);
    if (user) req.user = user;
  } catch (e) {
    // توكن غير صالح/منتهي: يُعامل كطلب غير مسجل الدخول بدل رفضه هنا مباشرة.
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول لتنفيذ هذا الإجراء.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول لتنفيذ هذا الإجراء.' });
  if (!req.user.isAdmin) return res.status(403).json({ error: 'هذا الإجراء متاح للمشرفين فقط.' });
  next();
}

module.exports = { signAccessToken, signRefreshToken, attachUserIfPresent, requireAuth, requireAdmin, getSecret };
