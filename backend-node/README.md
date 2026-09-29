# AI Talker Backend (Node.js / Express)

نسخة الباك-إند المُعاد بناؤها بـ Node.js/Express بدل Django، تخدم الواجهة
الأمامية الثابتة (`../frontend`) والـ API معاً كتطبيق واحد على نفس الدومين
(`talker.lughaty.cloud`) — بلا حاجة لـ subdomain منفصل للـ API أو لدعم
WebSocket/Docker/حزم نظام (Tesseract/ffmpeg)، فهي متوافقة مع استضافة
Hostinger المشتركة (Node.js App عبر Passenger).

## الإعداد المحلي

```bash
cd backend-node
npm install
cp .env.example .env   # ثم املأ القيم الحقيقية في .env
npm run db:sync        # ينشئ جداول قاعدة البيانات (MySQL يجب أن تكون قائمة ومُنشأة القاعدة مسبقاً)
npm run seed:admin      # ينشئ مستخدم الأدمن الوحيد (يقرأ ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD من .env)
npm start                # أو: npm run dev (يعيد التشغيل تلقائياً عند التعديل)
```

يفتح الموقع على `http://localhost:8000` (أو المنفذ المضبوط في `PORT`)، ولوحة
تحكم الأدمن على `/admin.html`.

## البنية

- `server.js` — نقطة الدخول: يشغّل Express، يخدم `../frontend` كملفات ثابتة، ويصل `/api/*`.
- `src/models/` — نماذج Sequelize (User, Translation, Comment, SiteLike) فوق MySQL.
- `src/routes/` — كل واجهات الـ API (auth، translations، comments، contact، upload-translate، speech-to-text، live-translate، admin).
- `src/services/` — منطق الترجمة (4 طبقات fallback)، OCR الصور عبر Google Vision + إعادة الرسم، تحويل الصوت لنص عبر OpenAI Whisper، TTS، ترجمة docx/pdf، البريد، ورفع الملفات العامة إلى Cloudinary.
- `assets/fonts/` — خطوط Noto (Latin/Arabic/Devanagari/CJK) لإعادة رسم النص المترجم على الصور دون الاعتماد على خطوط النظام.
- `scripts/` — `syncDb.js` (إنشاء الجداول) و`seedAdmin.js` (إنشاء مستخدم أدمن).

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

1. من hPanel: أنشئ **Node.js App** جديد، وجّهه لمجلد هذا المشروع بعد سحبه
   عبر Git (`root/backend-node`)، واضبط "Startup file" = `server.js`.
2. أضف كل المتغيرات من `.env.example` في إعدادات التطبيق على hPanel (بيانات
   MySQL الخاصة بـ Hostinger، `SECRET_KEY` عشوائي قوي، `OPENAI_API_KEY`،
   `GOOGLE_TRANSLATE_API_KEY`، `CORS_ALLOWED_ORIGINS=https://talker.lughaty.cloud`، إلخ).
3. بعد أول نشر: شغّل `npm install`، ثم `npm run db:sync`، ثم `npm run seed:admin` مرة واحدة (عبر SSH أو "Run script" في hPanel).
4. أعد تشغيل التطبيق (Restart) من hPanel.

لا حاجة لمجلد `public_html` منفصل للواجهة الأمامية ولا لأي إعداد Python —
Node.js App الواحد هذا يخدم كل شيء على `talker.lughaty.cloud` مباشرة.
