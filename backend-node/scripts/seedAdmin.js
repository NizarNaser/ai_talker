/**
 * ينشئ مستخدماً أدمن واحداً (أو يرفع صلاحية مستخدم موجود لأدمن ويحدّث كلمة
 * مروره) من متغيرات البيئة ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD. شغّله
 * يدوياً محلياً (أو عبر SSH إن توفر) بعد npm run db:sync:
 *
 *   ADMIN_USERNAME=admin ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... npm run seed:admin
 *
 * ملاحظة: server.js ينشئ نفس المستخدم تلقائياً عند الإقلاع إن لم يكن موجوداً
 * (بلا تحديث قسري)، فهذا السكريبت ضروري فقط لإعادة ضبط كلمة مرور الأدمن يدوياً.
 */
require('dotenv').config();
const { sequelize } = require('../src/models');
const { ensureAdminUser } = require('../src/services/adminSeedService');

(async () => {
  if (!process.env.ADMIN_PASSWORD) {
    console.error('❌ حدّد ADMIN_PASSWORD في متغيرات البيئة قبل تشغيل هذا السكريبت.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    await ensureAdminUser({ forceUpdate: true });
    process.exit(0);
  } catch (e) {
    console.error('❌ فشل إنشاء مستخدم الأدمن:', e.message);
    process.exit(1);
  }
})();
