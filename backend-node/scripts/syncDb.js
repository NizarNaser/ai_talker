require('dotenv').config();
const { sequelize } = require('../src/models');

(async () => {
  try {
    await sequelize.authenticate();
    // ينشئ الجداول الناقصة فقط، لا يحذف/يعدّل بيانات موجودة (بلا alter/force).
    await sequelize.sync();
    console.log('✅ تم إنشاء/تحديث جداول قاعدة البيانات.');
    process.exit(0);
  } catch (e) {
    console.error('❌ فشل مزامنة قاعدة البيانات:', e.message);
    process.exit(1);
  }
})();
