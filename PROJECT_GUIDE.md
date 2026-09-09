# AI Talker - منصة الترجمة الفورية بالذكاء الاصطناعي

## 1. شرح المشروع بالكامل
مشروع **AI Talker** هو منصة ويب احترافية توفر خدمات الترجمة الفورية باستخدام أحدث تقنيات الذكاء الاصطناعي. تتيح المنصة للمستخدمين ترجمة الصوت والنصوص بشكل مباشر ودقيق مع دعم واسع النطاق للغات العالمية واللهجات المحلية والعربية المختلفة، بالإضافة إلى:

- **ترجمة الملفات والمستندات** (Word، PDF) مع الحفاظ على التنسيق الأصلي.
- **ترجمة الصور مع الحفاظ على ستايلها الأصلي**: يستخرج النظام النص من الصورة عبر Tesseract OCR، يترجمه، ثم يعيد رسم الترجمة في نفس مكان النص الأصلي بنفس الألوان التقريبية، بدل إرجاع نص منفصل فقط.
- **التقاط صورة مباشرة من كاميرا الهاتف** لترجمة المستندات فوراً دون الحاجة لحفظها أولاً.
- **تسجيل دخول حقيقي عبر Google** (Google Identity Services) بجانب التسجيل بالبريد/كلمة المرور.
- **واجهة مستخدم متعددة اللغات بالكامل** (عربي، إنجليزي، فرنسي، إسباني، ألماني، صيني، روسي) لكل عناصر الصفحة.

يعتمد الباك اند على Python و Django مع DRF و WebSocket (Channels) للمحادثات الحية. الترجمة الفعلية تعتمد على **Google Translate كمصدر أساسي مع تحول تلقائي إلى MyMemory** كخدمة بديلة عند تعطل أو حظر Google، حتى لا تتوقف الترجمة بالكامل. قاعدة البيانات تدعم **MySQL محلياً افتراضياً**، مع إمكانية التبديل لأي قاعدة بيانات أخرى (مثل PostgreSQL على Neon) في الإنتاج عبر متغير `DATABASE_URL`. تم التركيز على معايير SEO والأداء والأمان (تحديد معدّل الطلبات، إعدادات إنتاج آمنة) واختبارات آلية حقيقية لتكون المنصة جاهزة للإنتاج (Production Ready).

## 2. طريقة تثبيت المشروع محلياً
### المتطلبات المسبقة:
- Python 3.12+
- MySQL Server (محلياً)
- Tesseract OCR (لميزة ترجمة الصور فقط - راجع القسم 5)
- Node.js غير مطلوب؛ الواجهة الأمامية Vanilla HTML/CSS/JS بالكامل

### الخطوات:
1. استنساخ المستودع (أو فتح المجلد).
2. إعداد البيئة الافتراضية للغة البايثون:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. تثبيت الحزم المطلوبة:
   ```bash
   pip install -r requirements.txt
   ```
4. نسخ `backend/.env.example` إلى `backend/.env` وتعديل القيم (راجع تفاصيل كل قسم في هذا الدليل):
   ```bash
   cp backend/.env.example backend/.env
   ```
5. تشغيل المايجريشن (بعد إعداد قاعدة البيانات في القسم 4):
   ```bash
   python manage.py migrate
   python manage.py createsuperuser   # اختياري: لإنشاء حساب مدير
   ```

## 3. طريقة تشغيل المشروع
### الطريقة السريعة (تشغيل الباك اند والواجهة معاً بأمر واحد)
```bash
./run.sh
```
يشغّل Django على المنفذ 8000 والواجهة الأمامية على المنفذ 8001، ويتحقق أولاً أن المنفذين غير مستخدمين من برنامج آخر. لتغيير المنافذ عند التعارض:
```bash
BACKEND_PORT=8010 FRONTEND_PORT=8011 ./run.sh
```

### الطريقة اليدوية
لتشغيل سيرفر الباك اند للتطوير:
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```
للواجهة الأمامية:
```bash
cd frontend
python3 -m http.server 8001
# افتح http://localhost:8001
```

## 4. طريقة إنشاء قاعدة البيانات (MySQL محلياً)
1. تأكد من تشغيل خادم MySQL محلياً.
2. أنشئ قاعدة البيانات ومستخدماً (أو استخدم `root` مباشرة):
   ```sql
   CREATE DATABASE ai_talker_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. اضبط `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` في `backend/.env` لتطابق بيانات اتصالك.
4. شغّل أوامر التهيئة في جانغو:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

> **قاعدة بيانات الإنتاج**: إذا ضبطت متغير `DATABASE_URL` (مثل رابط PostgreSQL من Neon، راجع القسم 6-أ)، فسيُستخدم تلقائياً بدل إعدادات MySQL المحلية بفضل مكتبة `dj-database-url` — لا حاجة لتعديل الكود.

## 5. طريقة إعداد ميزة ترجمة الصور (Tesseract OCR)
هذه الميزة تحتاج محرك Tesseract OCR مثبتاً على مستوى النظام (غير مطلوب لباقي الميزات):
```bash
sudo apt-get install -y tesseract-ocr tesseract-ocr-ara tesseract-ocr-eng \
    tesseract-ocr-fra tesseract-ocr-spa tesseract-ocr-deu \
    tesseract-ocr-chi-sim tesseract-ocr-chi-tra tesseract-ocr-rus \
    tesseract-ocr-jpn tesseract-ocr-kor fonts-noto-core fonts-noto-cjk
```
على خادم الإنتاج (Docker على Render) هذا مُثبّت تلقائياً عبر `Dockerfile` — لا حاجة لأي إعداد يدوي هناك.

## 6. طريقة إعداد تسجيل الدخول بحساب Google
المشروع يستخدم **Google Identity Services** (وليس تدفق OAuth القديم القائم على إعادة التوجيه)، لذلك الإعداد أبسط ولا يحتاج Client Secret:

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/) وأنشئ مشروعاً جديداً (أو استخدم مشروعاً موجوداً).
2. من **APIs & Services → Credentials**، أنشئ **OAuth client ID** من نوع **Web application**.
3. في خانة **Authorized JavaScript origins** أضف روابط موقعك، مثل:
   - `http://localhost:8001` (للتطوير المحلي)
   - `https://ai-talker-five.vercel.app` (أو رابط موقعك الفعلي على Vercel)
4. احفظ، وانسخ **Client ID** الناتج (لا تحتاج Client Secret لهذا التدفق).
5. ضع نفس القيمة في **مكانين**:
   - متغير البيئة `GOOGLE_CLIENT_ID` في `backend/.env` (وفي متغيرات بيئة Render للإنتاج).
   - الثابت `GOOGLE_CLIENT_ID` في أعلى قسم "Google Login Logic" داخل `frontend/js/main.js`.

بدون ضبط القيمة في الطرفين، يبقى زر "المتابعة باستخدام Google" ظاهراً لكنه يعرض رسالة صريحة بأن الميزة غير مفعّلة بعد، بدل تسجيل دخول وهمي.

## 7. طريقة إعداد إرسال البريد (نموذج تواصل معنا)
Gmail لا يقبل كلمة مرور الحساب العادية للإرسال عبر SMTP، ويحتاج **App Password** خاصة:

1. فعّل **التحقق بخطوتين (2-Step Verification)** على حساب Gmail: myaccount.google.com/security
2. اذهب إلى myaccount.google.com/apppasswords وأنشئ كلمة مرور تطبيق جديدة (16 حرفاً).
3. ضع في `backend/.env`:
   ```
   EMAIL_HOST_USER=بريدك@gmail.com
   EMAIL_HOST_PASSWORD=كلمة_المرور_المكوّنة_من_16_حرف
   CONTACT_EMAIL=البريد_الذي_تريد_استقبال_رسائل_الزوار_عليه
   ```

بدون هذين المتغيرين، يعمل النظام تلقائياً بوضع `console` (يطبع الرسالة في السجلات فقط، مناسب للتطوير المحلي دون إعداد بريد حقيقي).

## 8. حدود معدّل الطلبات (Rate Limiting)
لحماية الخادم وحصة خدمات الترجمة المجانية من إساءة الاستخدام، تم ضبط الحدود التالية (`backend/core/settings.py`):

| الواجهة | الحد |
|---|---|
| رفع ملف/صورة للترجمة | 10 طلبات/ساعة |
| نموذج تواصل معنا | 5 طلبات/ساعة |
| تسجيل حساب / تسجيل دخول بـ Google | 20 طلب/ساعة |
| أي طلب API آخر (زائر غير مسجل) | 100 طلب/ساعة |

تجاوز الحد يُرجع استجابة `429 Too Many Requests` مع رسالة تحدد وقت إعادة المحاولة.

## 9. الدليل الشامل لرفع المشروع مجاناً (خطوة بخطوة)
الباك اند يُنشر عبر **Docker** على **Render** مباشرة من `Dockerfile` في جذر المستودع (لا حاجة لضبط Build/Start Command يدوياً)، وقاعدة البيانات يمكن أن تبقى MySQL محلية للتطوير فقط، بينما يُنصح باستخدام **Neon** (PostgreSQL مُدار) أو أي قاعدة MySQL مُدارة للإنتاج. الواجهة الأمامية والملفات عبر **Vercel** و **Cloudinary**.

### أ. قاعدة بيانات الإنتاج (Neon - مجاني، اختياري)
1. اذهب إلى [Neon.tech](https://neon.tech/) وأنشئ حساباً ومشروعاً جديداً باسم `aitalker-db`.
2. اختر إصدار PostgreSQL المناسب (15 أو أحدث) والمنطقة الأقرب لك.
3. انسخ رابط الاتصال (Connection String) الذي يبدأ بـ `postgresql://` من لوحة التحكم.
4. **لا تشارك هذا الرابط أو تضعه في أي ملف يُرفع لـ Git** — ضعه فقط في متغير `DATABASE_URL` على Render مباشرة (Environment Variables في لوحة التحكم).

### ب. إعداد Cloudinary لتخزين الملفات (بدون بطاقة بنكية)
1. أنشئ حساباً مجانياً على [Cloudinary](https://cloudinary.com/).
2. من لوحة التحكم، انسخ رابط **API Environment variable** (يبدأ بـ `cloudinary://...`).
3. ضعه في متغير `CLOUDINARY_URL`.

### ج. رفع الباك اند (Django) على Render (مجاني، عبر Docker)
1. ارفع كود المشروع بالكامل إلى مستودع GitHub خاص بك.
2. في [Render.com](https://render.com/)، أنشئ **New → Blueprint** واختر المستودع — سيقرأ Render ملف `render.yaml` تلقائياً ويُعد خدمة Docker باسم `ai-talker-backend`.
3. من تبويب **Environment** للخدمة، املأ المتغيرات المطلوبة (المعرّفة بـ `sync: false` في `render.yaml`):
   - `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS` (رابط Render + رابط الواجهة الأمامية مفصولين بفاصلة)
   - `DATABASE_URL` (من الخطوة أ)
   - `CLOUDINARY_URL` (من الخطوة ب)
   - `GOOGLE_CLIENT_ID` (من القسم 6)
   - `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `CONTACT_EMAIL` (من القسم 7)
4. احفظ؛ سيبني Render صورة Docker وينشرها تلقائياً، ويعطيك رابطاً مثل `https://ai-talker-backend.onrender.com`.
5. أي دفعة (push) جديدة لفرع main تُعيد النشر تلقائياً (`autoDeployTrigger: commit`).

### د. رفع الواجهة الأمامية على Vercel (مجاني)
1. أنشئ حساباً على [Vercel](https://vercel.com/) بحساب GitHub.
2. **Add New → Project**، استورد مستودعك.
3. في إعدادات المشروع: **Root Directory** = `frontend`، **Framework Preset** = `Other`.
4. تأكد أن `BACKEND_HOST` في `frontend/js/main.js` يشير لرابط Render الصحيح، وأن رابط Vercel مضاف في `CORS_ALLOWED_ORIGINS` و`CSRF_TRUSTED_ORIGINS` بـ `backend/core/settings.py`.
5. اضغط **Deploy**. ستحصل على رابط مثل `https://ai-talker-five.vercel.app`.

## 10. طريقة إضافة AdSense
1. سجّل موقعك في [Google AdSense](https://www.google.com/adsense/).
2. بعد القبول، ستحصل على سكريبتات الإعلانات.
3. ستجد في `frontend/index.html` عناصر `<div class="ad-banner" data-ad-slot="...">` جاهزة كأماكن للإعلانات (رأسية 728×90، متجاوبة، ومستطيلة 336×280).
4. استبدل محتواها بالشيفرة المقدمة من AdSense.

## 11. طريقة النسخ الاحتياطي
- **قاعدة البيانات**: `mysqldump` محلياً، أو النسخ الاحتياطي التلقائي من لوحة تحكم مزود الاستضافة إذا كنت تستخدم قاعدة بيانات مُدارة (Neon يوفر ذلك لـ PostgreSQL).
- **الملفات (الصوتيات والصور المرفوعة)**: محفوظة في حساب Cloudinary الخاص بك.

## 12. طريقة التحديث والاختبار
1. أجرِ التعديلات محلياً وشغّل الاختبارات الآلية:
   ```bash
   cd backend
   python manage.py test translator
   ```
2. ارفع التعديلات إلى GitHub.
3. Render يسحب التحديثات تلقائياً (Auto Deploy) ويعيد بناء صورة Docker.
4. `migrate` يُنفَّذ تلقائياً عند إقلاع الحاوية (مضمّن في أمر تشغيل `Dockerfile`).

## 13. طريقة الصيانة
- راقب سجلات الأخطاء (Logs) عبر لوحة تحكم Render.
- لإيقاف الخدمة مؤقتاً، أوقفها من لوحة تحكم Render مباشرة.

## 14. سجل التحديثات الرئيسية
- **قاعدة البيانات**: التبديل من SQLite/PostgreSQL الافتراضي إلى MySQL محلياً، مع بقاء `DATABASE_URL` مدعوماً لأي قاعدة بيانات أخرى في الإنتاج.
- **ترجمة الملفات والصور**: استعادة الميزة وتطويرها لتشمل الحفاظ على ستايل الصورة الأصلي (وليس فقط تنسيق المستندات)، مع دعم التقاط صورة من كاميرا الهاتف مباشرة.
- **موثوقية الترجمة**: طبقة `ResilientTranslator` تعتمد Google Translate أساساً وتتحول تلقائياً إلى MyMemory عند فشله، لكل من الترجمة الفورية وترجمة الملفات.
- **تسجيل الدخول بـ Google**: تطبيق حقيقي عبر Google Identity Services يتحقق من التوكن ويصدر JWT، بدل الحساب الوهمي السابق.
- **نموذج تواصل معنا**: إرسال بريد حقيقي عبر Gmail SMTP بدل الطباعة في السجلات فقط.
- **الأمان**: تحديد معدّل الطلبات (Rate Limiting) على كل الواجهات الحساسة، ومنع استخدام `SECRET_KEY`/`ALLOWED_HOSTS` غير آمنين في وضع الإنتاج.
- **الاختبارات**: مجموعة اختبارات آلية حقيقية (`backend/translator/tests.py`) تعمل دون اتصال إنترنت.
- **الترجمة متعددة اللغات للواجهة**: استكمال جميع مفاتيح الترجمة الناقصة (الفوتر، المساحات الإعلانية، النوافذ المنبثقة) لكل اللغات السبع المدعومة في واجهة الموقع.
- **تشغيل مبسّط**: سكريبت `run.sh` لتشغيل الباك اند والواجهة الأمامية معاً بأمر واحد.
