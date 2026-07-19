# AI Talker - منصة الترجمة الفورية بالذكاء الاصطناعي

## 1. شرح المشروع بالكامل
مشروع **AI Talker** هو منصة ويب احترافية توفر خدمات الترجمة الفورية باستخدام أحدث تقنيات الذكاء الاصطناعي. تتيح المنصة للمستخدمين ترجمة الصوت والنصوص بشكل مباشر ودقيق مع دعم واسع النطاق للغات العالمية واللهجات المحلية والعربية المختلفة. يوفر المشروع واجهة مستخدم (UI/UX) بتصميم عصري (Mobile First, Dark/Light Mode, Glassmorphism) متوافق تماماً مع جميع الأجهزة. 
يعتمد الباك اند على Python و Django مع DRF و WebSocket (Channels) للمحادثات الحية، بينما تعتمد قاعدة البيانات على PostgreSQL. تم التركيز على معايير SEO والأداء والأمان لتكون المنصة جاهزة للإنتاج (Production Ready).

## 2. طريقة تثبيت المشروع محلياً
### المتطلبات المسبقة:
- Python 3.13
- PostgreSQL
- Node.js (اختياري للواجهة الأمامية إذا تم استخدام أدوات إضافية)

### الخطوات:
1. استنساخ المستودع (أو فتح المجلد).
2. إعداد البيئة الافتراضية للغة البايثون:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. تثبيت الحزم المطلوبة:
   ```bash
   pip install -r requirements.txt
   ```
4. إنشاء ملف `.env` في مجلد الباك اند بالاعتماد على `.env.example` وتعديل بيانات الاتصال.

## 3. طريقة تشغيل المشروع
لتشغيل سيرفر الباك اند للتطوير:
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```
بالنسبة للواجهة الأمامية (Frontend)، بما أنها مبنية بتقنيات Vanilla (HTML, CSS, JS)، يمكنك فتح ملف `index.html` في المتصفح أو تشغيل سيرفر بسيط:
```bash
cd frontend
python3 -m http.server 8001
```

## 4. طريقة إنشاء قاعدة البيانات
1. تأكد من تشغيل خادم PostgreSQL محلياً.
2. قم بإنشاء قاعدة بيانات جديدة:
   ```sql
   CREATE DATABASE aitalker;
   ```
3. قم بتشغيل أوامر التهيئة في جانغو:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

## 5. طريقة إعداد Google OAuth
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/).
2. أنشئ مشروعاً جديداً.
3. قم بتفعيل واجهة برمجة التطبيقات "Google+ API" و "OAuth 2.0".
4. قم بإنشاء بيانات الاعتماد (Credentials) للحصول على `CLIENT_ID` و `CLIENT_SECRET`.
5. أضف روابط إعادة التوجيه الصحيحة (مثل `http://localhost:8000/api/auth/google/callback`).
6. انسخ القيم والصقها في ملف `.env`.

## 6. الدليل الشامل لرفع المشروع مجاناً (خطوة بخطوة)
لرفع المشروع بالكامل مجاناً، سنستخدم خدمات مجانية ممتازة: **Neon** (لقاعدة البيانات)، **Render** (للباك اند)، و **Vercel / Cloudinary** (للواجهة الأمامية وتخزين الملفات).

### أ. رفع قاعدة البيانات على Neon (مجاني)
1. اذهب إلى موقع [Neon.tech](https://neon.tech/) وقم بإنشاء حساب مجاني.
2. انقر على **New Project**، وسمّه `aitalker-db`.
3. اختر إصدار PostgreSQL المناسب (يفضل 15 أو أحدث) والمنطقة الأقرب لك.
4. بعد إنشاء المشروع، سيظهر لك رابط الاتصال (Connection String) في لوحة التحكم، انسخه (سيبدأ بـ `postgres://`).
5. احتفظ بهذا الرابط، سنحتاجه في الخطوة التالية.

postgresql://neondb_owner:npg_VJuXLw2B4nZc@ep-polished-sound-aia1vcw7.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require

### ب. إعداد Cloudinary لتخزين الملفات (بدون بطاقة بنكية)
بما أن Cloudflare R2 يطلب بطاقة بنكية للتفعيل، فإن **Cloudinary** هو البديل المجاني الأفضل والممتاز لتخزين الملفات الصوتية والصور، ولا يطلب إدخال أي بيانات بنكية.

1. اذهب إلى موقع [Cloudinary](https://cloudinary.com/) وقم بإنشاء حساب مجاني.
2. بمجرد الدخول إلى لوحة التحكم (Dashboard)، ستجد في الشاشة الرئيسية قسماً يسمى **Product Environment Credentials**.
3. قم بنسخ الرابط الموجود بجانب **API Environment variable** (سيبدأ بـ `cloudinary://...`).
4. ستحتاج هذا الرابط لإضافته في ملف المتغيرات `.env` في الباك اند لكي يتمكن Django من رفع الملفات الصوتية مباشرة إلى حسابك.
5. (اختياري) يمكنك تثبيت مكتبة `django-cloudinary-storage` في مشروعك لتسهيل عملية ربط الملفات.

### ج. رفع الباك اند (Django) على Render (مجاني)
1. تأكد من رفع كود المشروع بالكامل إلى مستودع (Repository) خاص بك على **GitHub**.
2. اذهب إلى موقع [Render.com](https://render.com/) وقم بإنشاء حساب.
3. من لوحة التحكم، انقر على **New** ثم اختر **Web Service**.
4. قم بربط حسابك في GitHub، واختر مستودع المشروع الخاص بك.
5. في إعدادات الخدمة، أدخل التفاصيل التالية:
   - **Name**: `ai-talker-backend`
   - **Language**: `Python 3`
   - **Root Directory**: `backend` (لأن كود الباك اند داخل هذا المجلد).
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - **Start Command**: `daphne -b 0.0.0.0 -p 8000 core.asgi:application` (ضروري جداً لدعم الـ WebSocket الخاص بالمحادثة).
6. انزل لأسفل إلى قسم **Environment Variables** (المتغيرات البيئية) وأضف المتغيرات التالية:
   - `DATABASE_URL` = (رابط قاعدة بيانات Neon الذي نسخته في الخطوة الأولى).
   - `SECRET_KEY` = (مفتاح سري لجانغو).
   - `DEBUG` = `False`
   - `ALLOWED_HOSTS` = `*` (أو أضف رابط Render بعد الحصول عليه).
   - مفاتيح Google OAuth ومفاتيح Cloudinary.
7. انقر على **Create Web Service**. سيستغرق البناء دقائق، وسيعطيك Render رابطاً (مثل `https://ai-talker-backend.onrender.com`).

### د. رفع الواجهة الأمامية على Vercel (مجاني وبديل ممتاز)
1. اذهب إلى موقع [Vercel](https://vercel.com/) وقم بإنشاء حساب باستخدام حسابك في GitHub.
2. من لوحة التحكم (Dashboard)، انقر على **Add New...** ثم اختر **Project**.
3. قم باستيراد (Import) مستودع المشروع الخاص بك من GitHub.
4. في إعدادات المشروع (Configure Project):
   - **Project Name**: `ai-talker-frontend`
   - **Framework Preset**: `Other`
   - **Root Directory**: انقر على `Edit` واختر المجلد `frontend` (حيث توجد ملفات الواجهة).
5. **هام جداً:** يجب تعديل رابط الـ API في كود JavaScript الخاص بالواجهة الأمامية ليشير إلى رابط الباك اند الذي أنشأته على Render في الخطوة السابقة، ورفع هذه التعديلات إلى GitHub.
6. انقر على زر **Deploy**.
7. بعد اكتمال البناء، سيُمنح مشروعك رابطاً مجانياً (مثل `https://ai-talker-frontend.vercel.app`).

بهذا يكون مشروعك مرفوعاً بالكامل ليعمل مجاناً على الإنترنت!

## 7. طريقة إضافة AdSense
1. قم بتسجيل موقعك في [Google AdSense](https://www.google.com/adsense/).
2. بعد قبول الموقع، ستحصل على سكريبتات الإعلانات.
3. ستجد في أكواد الواجهة الأمامية (HTML) أماكن مخصصة تحمل تعليقات أو Data Attributes مثل `data-ad-slot`.
4. استبدلها بالشيفرة المقدمة من AdSense.

## 8. طريقة النسخ الاحتياطي
- **قاعدة البيانات**: يتم ذلك إما يدوياً باستخدام أداة `pg_dump` أو آلياً من خلال لوحة تحكم Neon التي توفر نسخاً احتياطياً تلقائياً.
- **الملفات**: تكون محفوظة في حساب Cloudinary الخاص بك والذي يتمتع بموثوقية عالية.

## 9. طريقة التحديث
1. قم بإجراء التعديلات محلياً وتأكد من عمل الاختبارات: `python manage.py test`
2. قم برفع التعديلات إلى المستودع (GitHub).
3. ستقوم خدمات مثل Render و Vercel بسحب التحديثات تلقائياً (Auto Deploy) وإعادة بناء المشروع.
4. في حال وجود تعديلات على قاعدة البيانات، سيتم تنفيذ `migrate` تلقائياً بناءً على إعدادات البناء في Render.

## 10. طريقة الصيانة
- في حالة الصيانة، يمكن تغيير متغير `MAINTENANCE_MODE=True` في Render (إذا كنت أعددته في الكود) لعرض صفحة مؤقتة، أو إيقاف الخدمة مؤقتاً من لوحة التحكم.
- يمكنك دائماً مراقبة سجلات الأخطاء (Logs) عبر لوحة تحكم Render.
