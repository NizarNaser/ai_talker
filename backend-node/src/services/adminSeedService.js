/**
 * ينشئ مستخدماً أدمن واحداً من متغيرات البيئة ADMIN_USERNAME/ADMIN_EMAIL/
 * ADMIN_PASSWORD. مستخدَمة من مكانين:
 *  - server.js عند كل إقلاع (forceUpdate=false): تُنشئ الأدمن فقط إن لم يكن
 *    موجوداً بعد (ضرورية لأن Hostinger هنا بلا SSH لتشغيل سكريبت يدوي).
 *  - scripts/seedAdmin.js عبر CLI محلياً (forceUpdate=true): يرفع مستخدماً
 *    موجوداً لأدمن ويحدّث كلمة مروره عند الطلب الصريح.
 */
const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function ensureAdminUser({ forceUpdate = false } = {}) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null; // بلا ADMIN_PASSWORD، لا يُنشأ أي مستخدم أدمن تلقائياً

  const email = process.env.ADMIN_EMAIL || username;
  const passwordHash = await bcrypt.hash(password, 12);

  const [user, created] = await User.findOrCreate({
    where: { username },
    defaults: { email, passwordHash, isAdmin: true },
  });

  if (created) {
    console.log(`✅ تم إنشاء مستخدم أدمن جديد: "${username}".`);
  } else if (forceUpdate) {
    user.isAdmin = true;
    user.passwordHash = passwordHash;
    user.email = email;
    await user.save();
    console.log(`✅ تم تحديث المستخدم الموجود "${username}" وجعله أدمن.`);
  }

  return user;
}

module.exports = { ensureAdminUser };
