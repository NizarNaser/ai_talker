# AI Talker Backend (Node.js / Express)

نسخة الباك-إند المُعاد بناؤها بـ Node.js/Express بدل Django، تخدم الواجهة
الأمامية الثابتة (`../frontend`) والـ API معاً كتطبيق واحد على نفس الدومين
(`talker.lughaty.cloud`) — بلا حاجة لـ subdomain منفصل للـ API أو لدعم
WebSocket/Docker/حزم نظام (Tesseract/ffmpeg)، فهي متوافقة مع استضافة
Hostinger المشتركة (Node.js App عبر Passenger).

**مهم:** نقطة التثبيت والتشغيل الفعلية هي `package.json` في **جذر
المستودع** (وليس `backend-node/package.json`، الذي بقي فقط كمرجع/توافق) —
لأن Hostinger ينشر مجلد الجذر المحدد فقط، وهذا المجلد يجب أن يكون جذر
المستودع كاملاً حتى يجد `backend-node/server.js` مجلد `../frontend` بجانبه.

## الإعداد المحلي

```bash
# من جذر المستودع (وليس من داخل backend-node/)
npm install
cp backend-node/.env.example backend-node/.env   # ثم املأ القيم الحقيقية
npm start   # يشغّل backend-node/server.js
```

يفتح الموقع على `http://localhost:8000` (أو المنفذ المضبوط في `PORT`)، ولوحة
تحكم الأدمن على `/admin.html`. عند أول تشغيل ناجح للاتصال بقاعدة البيانات
يُنشئ الخادم جداول MySQL تلقائياً (`sequelize.sync()`) ويزرع مستخدم أدمن
واحداً تلقائياً إن ضبطتَ `ADMIN_USERNAME`/`ADMIN_PASSWORD` في `.env` ولم يكن
موجوداً بعد — لا حاجة لتشغيل أي سكريبت يدوي منفصل.

سكريبتا `scripts/db:sync` و`scripts/seed:admin` (عبر `node backend-node/scripts/syncDb.js`
و`node backend-node/scripts/seedAdmin.js`) ما زالا موجودين لإعادة ضبط
الجداول/كلمة مرور الأدمن يدوياً عند الحاجة (محلياً، أو عبر SSH إن توفر).

## البنية

- **`package.json` في جذر المستودع** — يحمل كل الاعتماديات (dependencies)،
  و`main`/`start` يشيران لـ `backend-node/server.js`. هذا ما تُثبَّت منه
  الحزم فعلياً (`npm install` من الجذر)؛ `backend-node/package.json` نسخة
  متطابقة تُبقي `backend-node/` قابلاً للعمل كوحدة مستقلة، لكنها ليست ما
  يُستخدم في الإنتاج.
- `backend-node/server.js` — نقطة الدخول: يشغّل Express، يخدم `../frontend`
  كملفات ثابتة، ويصل `/api/*`، ويدير الاتصال بقاعدة البيانات (مع إعادة
  محاولة تلقائية) وزرع مستخدم الأدمن.
- `backend-node/src/models/` — نماذج Sequelize (User, Translation, Comment, SiteLike) فوق MySQL.
- `backend-node/src/routes/` — كل واجهات الـ API (auth، translations، comments، contact، upload-translate، speech-to-text، live-translate، admin).
- `backend-node/src/services/` — منطق الترجمة (4 طبقات fallback)، OCR الصور عبر Google Vision + إعادة الرسم، تحويل الصوت لنص عبر OpenAI Whisper، TTS، ترجمة docx/pdf، البريد، ورفع الملفات العامة إلى Cloudinary، وزرع مستخدم الأدمن.
- `backend-node/assets/fonts/` — خطوط Noto (Latin/Arabic/Devanagari/CJK) لإعادة رسم النص المترجم على الصور دون الاعتماد على خطوط النظام.
- `backend-node/scripts/` — `syncDb.js` و`seedAdmin.js` (للاستخدام اليدوي الاختياري؛ يحدثان تلقائياً عند إقلاع الخادم أصلاً).

## الصلابة عند التشغيل بلا SSH (Hostinger)

بما أن استضافة Hostinger هنا بلا SSH لتشغيل سكريبتات أو إعادة تشغيل يدوية
عند الفشل، يتعامل `server.js` مع ذلك مباشرة:

- **لا يتوقف الخادم أبداً بسبب فشل الاتصال بقاعدة البيانات**: يسجّل الخطأ
  ويعيد المحاولة كل 10 ثوانٍ تلقائياً وللأبد حتى تنجح، بينما يبقى الخادم
  (`/health` و`/api/health/`) يستجيب طوال ذلك.
- **الأخطاء غير المتوقعة داخل معالجات الطلبات async لا تُسقط العملية**:
  `express-async-errors` توصّل أي رفض Promise لمعالج الأخطاء العام (Express
  4 وحده لا يفعل ذلك)، ومُسجِّلا `unhandledRejection`/`uncaughtException`
  يطبعان الخطأ كاملاً (بما فيه `err.parent.sqlMessage` لأخطاء MySQL) بدل
  إسقاط العملية.
- **الجداول وحساب الأدمن يُنشآن تلقائياً عند الإقلاع**، فلا حاجة لتشغيل
  `db:sync`/`seed:admin` يدوياً في بيئة بلا SSH.

## الفروقات عن نسخة Django السابقة (اطّلع عليها قبل الاعتماد الكامل)

1. **قاعدة بيانات جديدة بالكامل**: لا يوجد ترحيل بيانات من قاعدة MySQL/Django
   القديمة (كان القرار البدء من جديد). المستخدمون القدامى (إن وُجدوا في بيئة
   إنتاج سابقة على Render) غير موجودين هنا ويحتاجون تسجيلاً جديداً.
2. **لوحة الأدمن مبسّطة** (`frontend/admin.html`): تغطي نفس المهام العملية
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

## النشر على Hostinger (Business Web Hosting)

1. من hPanel: أنشئ **Node.js App** جديد، وجّهه لـ **جذر المستودع كاملاً**
   بعد سحبه عبر Git (وليس لمجلد `backend-node/` فقط)، واضبط "Startup file"
   = `backend-node/server.js` (أو استخدم `npm start` إن كانت الواجهة تدعم ذلك).
2. أضف كل المتغيرات من `backend-node/.env.example` في إعدادات التطبيق على
   hPanel (بيانات MySQL الخاصة بـ Hostinger، `SECRET_KEY` عشوائي قوي،
   `OPENAI_API_KEY`، `GOOGLE_TRANSLATE_API_KEY`،
   `CORS_ALLOWED_ORIGINS=https://talker.lughaty.cloud`، وكذلك
   `ADMIN_USERNAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` لإنشاء حساب الأدمن تلقائياً).
3. شغّل `npm install` من جذر المشروع (يقرأ `package.json` في الجذر).
4. شغّل/أعد تشغيل التطبيق. لا حاجة لأي خطوة يدوية أخرى — الجداول وحساب
   الأدمن يُنشآن تلقائياً عند أول إقلاع ناجح للاتصال بقاعدة البيانات (راجع
   قسم "الصلابة عند التشغيل بلا SSH" أعلاه).

لا حاجة لمجلد `public_html` منفصل للواجهة الأمامية ولا لأي إعداد Python —
Node.js App الواحد هذا يخدم كل شيء على `talker.lughaty.cloud` مباشرة.
