/**
 * ينشئ مستخدماً أدمن واحداً (أو يرفع صلاحية مستخدم موجود لأدمن) من متغيرات
 * البيئة ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD. شغّله مرة واحدة بعد
 * npm run db:sync:
 *
 *   ADMIN_USERNAME=admin ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... npm run seed:admin
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models');

(async () => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || username;
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ حدّد ADMIN_PASSWORD في متغيرات البيئة قبل تشغيل هذا السكريبت.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    const passwordHash = await bcrypt.hash(password, 12);
    const [user, created] = await User.findOrCreate({
      where: { username },
      defaults: { email, passwordHash, isAdmin: true },
    });
    if (!created) {
      user.isAdmin = true;
      user.passwordHash = passwordHash;
      user.email = email;
      await user.save();
      console.log(`✅ تم تحديث المستخدم الموجود "${username}" وجعله أدمن.`);
    } else {
      console.log(`✅ تم إنشاء مستخدم أدمن جديد: "${username}".`);
    }
    process.exit(0);
  } catch (e) {
    console.error('❌ فشل إنشاء مستخدم الأدمن:', e.message);
    process.exit(1);
  }
})();
