require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');

const { sequelize } = require('./src/models');
const { attachUserIfPresent } = require('./src/middleware/auth');
const apiRouter = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 8000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

app.set('trust proxy', 1);

// CSP مُعطّل هنا لأن هذا التطبيق يخدم موقعاً ثابتاً متعدد الصفحات بسكربتات
// inline قليلة؛ رؤوس الأمان الأخرى (X-Frame-Options، إلخ) تبقى مفعّلة.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'https://talker.lughaty.cloud')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(attachUserIfPresent);

app.get('/health', (req, res) => res.json({ status: 'ok', message: 'backend alive' }));

app.use('/api', apiRouter);

// الواجهة الأمامية الثابتة (نفس مجلد frontend/) تُخدَّم من نفس التطبيق على
// نفس الدومين، بلا حاجة لخادم منفصل أو subdomain للـ API.
app.use(express.static(FRONTEND_DIR));

app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// معالج أخطاء عام: يحوّل أخطاء multer (حجم ملف كبير...) وأي استثناء غير
// متوقع إلى رد JSON بدل صفحة خطأ HTML افتراضية من Express.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم.' });
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');
  } catch (e) {
    console.error('❌ Unable to connect to the database:', e.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 AI Talker server running on port ${PORT}`);
  });
}

start();
