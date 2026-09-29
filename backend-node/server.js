const path = require('path');

// مسار .env صريح (بدل الاعتماد على process.cwd() الافتراضي في dotenv)، لأن
// Hostinger ينشر جذر المستودع كاملاً ويشغّل "node backend-node/server.js"
// من جذر المستودع، فيصبح cwd جذر المستودع لا مجلد backend-node/ نفسه.
// (في الإنتاج الفعلي على Hostinger لا يوجد ملف .env أصلاً عادة؛ متغيرات
// البيئة تُضبط مباشرة من لوحة hPanel، فهذا السطر يخدم التطوير المحلي فقط.)
require('dotenv').config({ path: path.join(__dirname, '.env') });

// يجب طلبها قبل تعريف أي مسارات: تصحّح Express 4 الذي لا يمرّر رفض
// الـ Promises في معالجات async تلقائياً لـ next(err)، فكان أي خطأ غير
// متوقع فيها يُسقط العملية بدل الوصول لمعالج الأخطاء العام أدناه.
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');

const { sequelize } = require('./src/models');
const { ensureAdminUser } = require('./src/services/adminSeedService');
const { attachUserIfPresent } = require('./src/middleware/auth');
const apiRouter = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 8000;
const FRONTEND_DIR = path.join(__dirname, 'public');
const DB_RETRY_MS = 10000;

app.set('trust proxy', 1);

// CSP مُعطّل هنا لأن هذا التطبيق يخدم موقعاً ثابتاً متعدد الصفحات بسكربتات
// inline قليلة؛ رؤوس الأمان الأخرى (X-Frame-Options، إلخ) تبقى مفعّلة.
// crossOriginOpenerPolicy: القيمة الافتراضية same-origin في helmet تقطع
// الاتصال بين نافذة تسجيل الدخول المنبثقة من Google وصفحة الموقع، فتظهر
// صفحة بيضاء للمستخدم بعد اختيار حسابه بدل إتمام تسجيل الدخول.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// يسمح لسكربت Google Identity Services باستخدام FedCM (واجهة المتصفح الحديثة
// لتسجيل الدخول الموحّد) بدل النافذة المنبثقة القديمة القائمة على postMessage،
// التي تفشل بصمت (تُغلق النافذة بعد اختيار الحساب دون أي خطأ ظاهر، ودون إتمام
// تسجيل الدخول) في المتصفحات التي تحظر الكوكيز من طرف ثالث. بدون هذا الرأس
// يرفض المتصفح تفعيل FedCM حتى لو طلبه السكربت صراحةً.
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'identity-credentials-get=(self)');
  next();
});

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'https://talker.lughaty.cloud')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(attachUserIfPresent);

// يبقى يعمل حتى إن كانت قاعدة البيانات غير متاحة بعد (راجع connectWithRetry أدناه).
app.get('/health', (req, res) => res.json({ status: 'ok', message: 'backend alive' }));

app.use('/api', apiRouter);

// الواجهة الأمامية الثابتة (تعيش هنا داخل backend-node/public وليس في مجلد
// منفصل بجذر المستودع، لأن Hostinger ينشر محتوى backend-node/ فقط ولا يمكن
// اختيار جذر المستودع كمجلد نشر) تُخدَّم من نفس التطبيق على نفس الدومين،
// بلا حاجة لخادم منفصل أو subdomain للـ API.
app.use(express.static(FRONTEND_DIR));

// أي طلب GET لا يطابق مساراً في /api ولا ملفاً ثابتاً موجوداً فعلاً (رابط
// مباشر لصفحة داخلية، تحديث الصفحة على مسار غير جذر...) يُعاد توجيهه للصفحة
// الرئيسية بدل إرجاع JSON 404 غير مفيد لزائر متصفح.
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  }
  next();
});

app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// معالج أخطاء عام: يحوّل أخطاء multer (حجم ملف كبير...) وأي استثناء غير
// متوقع (بما فيها ما ترفعه معالجات async بفضل express-async-errors أعلاه)
// إلى رد JSON بدل صفحة خطأ HTML افتراضية من Express أو إسقاط العملية.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
  }
  console.error('Unhandled error:', err.message, err.parent?.sqlMessage || '');
  res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم.' });
});

// يحاول الاتصال بقاعدة البيانات وإنشاء/تحديث الجداول وزرع مستخدم الأدمن،
// ويعيد المحاولة كل 10 ثوانٍ عند الفشل بدل إسقاط العملية بالكامل (لا وصول
// SSH هنا لإصلاح الإعدادات وإعادة التشغيل يدوياً، فيجب أن يتعافى تلقائياً
// بمجرد أن تصبح قاعدة البيانات متاحة، بينما يبقى /api/health يعمل طوال ذلك).
async function connectWithRetry() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    await sequelize.sync();
    console.log('✅ Database tables synced.');

    await ensureAdminUser();
  } catch (e) {
    console.error('❌ Database setup failed:', e.message, e.parent?.sqlMessage || '');
    setTimeout(connectWithRetry, DB_RETRY_MS);
  }
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err?.message, err?.parent?.sqlMessage || '');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err?.message, err?.parent?.sqlMessage || '');
});

app.listen(PORT, () => {
  console.log(`🚀 AI Talker server running on port ${PORT}`);
  connectWithRetry();
});
