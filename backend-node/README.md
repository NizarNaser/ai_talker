# AI Talker Backend (Node.js / Express)

نسخة الباك-إند المُعاد بناؤها بـ Node.js/Express بدل Django، تخدم الواجهة
الأمامية الثابتة (`public/`) والـ API معاً كتطبيق واحد على نفس الدومين
(`talker.lughaty.cloud`) — بلا حاجة لـ subdomain منفصل للـ API أو لحزم نظام
(Tesseract/ffmpeg).

- **الموقع:** https://talker.lughaty.cloud/
- **الاستضافة:** Hostinger VPS (Ubuntu + nginx كـ reverse proxy + pm2 لتشغيل Node.js)
- **الكود:** https://github.com/NizarNaser/ai_talker (فرع `main`)

الواجهة الأمامية تعيش داخل `backend-node/public/` ويخدمها نفس تطبيق Express،
و`backend-node/package.json` هو نقطة التثبيت/التشغيل الحقيقية (لا يوجد
`package.json` في جذر المستودع).

## الإعداد المحلي

```bash
cd backend-node
npm install
cp .env.example .env   # ثم املأ القيم الحقيقية
npm start
```

يفتح الموقع على `http://localhost:8000` (أو المنفذ المضبوط في `PORT`)، ولوحة
تحكم الأدمن على `/admin.html`. عند أول تشغيل ناجح للاتصال بقاعدة البيانات
يُنشئ الخادم جداول MySQL تلقائياً (`sequelize.sync()`) ويزرع مستخدم أدمن
واحداً تلقائياً إن ضبطتَ `ADMIN_USERNAME`/`ADMIN_PASSWORD` في `.env` ولم يكن
موجوداً بعد — لا حاجة لتشغيل أي سكريبت يدوي منفصل.

سكريبتا `npm run db:sync` و`npm run seed:admin` ما زالا موجودين لإعادة ضبط
الجداول/كلمة مرور الأدمن يدوياً عند الحاجة (محلياً، أو عبر SSH إن توفر).

## البنية

- `package.json` — نقطة التثبيت والتشغيل الفعلية (لا يوجد `package.json`
  في جذر المستودع).
- `server.js` — نقطة الدخول: يشغّل Express، يخدم `public/` كملفات ثابتة
  (مع fallback لأي مسار GET غير API إلى `public/index.html`)، ويصل
  `/api/*`، ويدير الاتصال بقاعدة البيانات (مع إعادة محاولة تلقائية) وزرع
  مستخدم الأدمن.
- `public/` — **الواجهة الأمامية بالكامل** (نُقلت هنا من مجلد `frontend/`
  الذي كان بجذر المستودع، ليخدمها نفس التطبيق على نفس النطاق).
- `src/models/` — نماذج Sequelize (User, Translation, Comment, SiteLike) فوق MySQL.
- `src/routes/` — كل واجهات الـ API (auth، translations، comments، contact، upload-translate، speech-to-text، live-translate، admin).
- `src/services/` — منطق الترجمة (4 طبقات fallback، OpenAI هو المفعّل فعلياً بلا مفتاح Google Cloud)، استخراج نص الصور عبر OpenAI Vision + إعادة الرسم، تحويل الصوت لنص عبر OpenAI Whisper، TTS، ترجمة docx/pdf، البريد، ورفع الملفات العامة إلى Cloudinary، وزرع مستخدم الأدمن.
- `assets/fonts/` — خطوط Noto (Latin/Arabic/Devanagari/CJK) لإعادة رسم النص المترجم على الصور دون الاعتماد على خطوط النظام.
- `scripts/` — `syncDb.js` و`seedAdmin.js` (للاستخدام اليدوي الاختياري؛ يحدثان تلقائياً عند إقلاع الخادم أصلاً).

## الصلابة عند التشغيل

حتى لا يتوقف الموقع بسبب خطأ عابر (ودون الاعتماد فقط على إعادة التشغيل
التلقائية من pm2)، يتعامل `server.js` مع ذلك مباشرة:

- **لا يتوقف الخادم أبداً بسبب فشل الاتصال بقاعدة البيانات**: يسجّل الخطأ
  ويعيد المحاولة كل 10 ثوانٍ تلقائياً وللأبد حتى تنجح، بينما يبقى الخادم
  (`/health` و`/api/health/`) يستجيب طوال ذلك.
- **الأخطاء غير المتوقعة داخل معالجات الطلبات async لا تُسقط العملية**:
  `express-async-errors` توصّل أي رفض Promise لمعالج الأخطاء العام (Express
  4 وحده لا يفعل ذلك)، ومُسجِّلا `unhandledRejection`/`uncaughtException`
  يطبعان الخطأ كاملاً (بما فيه `err.parent.sqlMessage` لأخطاء MySQL) بدل
  إسقاط العملية.
- **الجداول وحساب الأدمن يُنشآن تلقائياً عند الإقلاع**، فلا حاجة لتشغيل
  `db:sync`/`seed:admin` يدوياً.

## الفروقات عن نسخة Django السابقة (اطّلع عليها قبل الاعتماد الكامل)

1. **قاعدة بيانات جديدة بالكامل**: لا يوجد ترحيل بيانات من قاعدة MySQL/Django
   القديمة (كان القرار البدء من جديد). المستخدمون القدامى (إن وُجدوا في بيئة
   إنتاج سابقة على Render) غير موجودين هنا ويحتاجون تسجيلاً جديداً.
2. **لوحة الأدمن مبسّطة** (`public/admin.html`): تغطي نفس المهام العملية
   التي كانت تُستخدم فعلياً (الموافقة/رفض/حذف تعليقات، عرض مستخدمين، عرض/حذف
   سجل ترجمات)، لكنها ليست نسخة طبق الأصل من واجهة Django admin التلقائية.
3. **ترجمة PDF أبسط من السابق**: نسخة بايثون استخدمت `pdf2docx` لتحويل PDF
   إلى docx مع الحفاظ على تخطيط الصفحة (جداول، مواضع) قبل الترجمة. لا توجد
   مكتبة Node.js تكافئ ذلك، فهذه النسخة تستخرج نص الـPDF فقط وتضعه في
   مستند Word جديد بسيط (بلا تخطيط الصفحة الأصلي). ترجمة ملفات .docx نفسها
   **تحافظ على التنسيق كاملاً** كما كانت (تعمل مباشرة على XML الملف).
4. **التعرف الصوتي يعتمد الآن حصراً على OpenAI Whisper** (بدل خدمة Google
   المجانية غير الرسمية التي كانت fallback أخيراً في نسخة بايثون)، لتفادي
   الحاجة لـ ffmpeg. كل طلب تفريغ صوتي يستهلك رصيد OpenAI المدفوع.
5. **صلاحيات Sequelize**: عمود `password_hash` يُستخدم بدل `password`، وهاش
   كلمات المرور عبر bcrypt (لا صلة بصيغة PBKDF2 التي كانت في Django، غير
   مهم لأن القرار كان قاعدة بيانات جديدة).

## النشر على Hostinger VPS

nginx يستقبل الطلبات على `talker.lughaty.cloud` (HTTPS عبر Let's Encrypt)
ويمرّرها إلى هذا التطبيق على المنفذ `PORT` (افتراضياً 8000)، وpm2 يبقيه
يعمل ويعيد تشغيله عند الفشل أو بعد إعادة تشغيل الخادم. خطوات الإعداد لأول
مرة (nginx، certbot، pm2) في القسم 7 من [PROJECT_GUIDE.md](../PROJECT_GUIDE.md).

### نشر تحديث جديد

الرفع إلى GitHub لا ينشر تلقائياً. بعد `git push origin main`:

```bash
ssh root@<عنوان-IP-الخادم>
cd ai_talker/backend-node      # مسار المستودع على الخادم
git pull origin main
npm install --omit=dev         # فقط إن تغيّر package.json
pm2 restart ai-talker          # اسم التطبيق كما يظهر في: pm2 list
```

السجلات: `pm2 logs ai-talker`. فحص سريع: `https://talker.lughaty.cloud/api/health/`.
