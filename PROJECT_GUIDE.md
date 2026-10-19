# AI Talker - منصة الترجمة الفورية بالذكاء الاصطناعي

- **الموقع:** https://talker.lughaty.cloud/
- **الاستضافة:** خادم Hostinger VPS (Ubuntu + nginx + Node.js عبر pm2)
- **الكود:** https://github.com/NizarNaser/ai_talker (فرع `main`)

## 1. شرح المشروع بالكامل
مشروع **AI Talker** هو منصة ويب احترافية توفر خدمات الترجمة الفورية باستخدام أحدث تقنيات الذكاء الاصطناعي. تتيح المنصة للمستخدمين ترجمة الصوت والنصوص بشكل مباشر ودقيق مع دعم واسع النطاق للغات العالمية واللهجات العربية، بالإضافة إلى:

- **ترجمة صوتية من الطرفين**: لكل مربع نص ميكروفون خاص، فيتكلم كل طرف بلغته وتظهر الترجمة في المربع الآخر. على الأجهزة التي لا تدعم التعرف الصوتي في المتصفح (مثل هواتف Huawei بدون خدمات جوجل) يُسجَّل الصوت ويُرسل للخادم لتحويله إلى نص عبر OpenAI Whisper.
- **وضع المحادثة المباشرة**: يتحدث الطرفان بالتناوب دون الضغط على أي زر، ويكتشف التطبيق نهاية الكلام تلقائياً ويعرض المحادثة مترجمة.
- **ترجمة الملفات والمستندات** (Word، PDF). ملفات Word تحافظ على تنسيقها الأصلي.
- **ترجمة الصور مع الحفاظ على ستايلها الأصلي**: يُستخرج النص عبر OpenAI Vision، ثم تُرسم الترجمة مكان النص الأصلي.
- **التقاط صورة مباشرة من كاميرا الهاتف** لترجمة المستندات فوراً.
- **تسجيل دخول حقيقي عبر Google** (Google Identity Services) بجانب التسجيل بالبريد/كلمة المرور.
- **واجهة متعددة اللغات** (عربي، إنجليزي، فرنسي، إسباني، ألماني، صيني، روسي).
- **تطبيق أندرويد** (TWA) في مجلد `android-app/` يفتح نفس الموقع.

**التقنيات:** تطبيق واحد بـ **Node.js/Express** في مجلد `backend-node/` يخدم الواجهة الأمامية (`backend-node/public/`، HTML/CSS/JS بدون أطر) والـ API (`/api/*`) معاً على نفس النطاق. قاعدة البيانات **MySQL** عبر Sequelize. الترجمة وتحويل الصوت إلى نص وقراءة الصور تعتمد على **OpenAI** (مع طبقات ترجمة بديلة عند الفشل). تفاصيل البنية في [backend-node/README.md](backend-node/README.md).

> مجلد `backend/` (Django) وملفات `Dockerfile` و`Procfile` و`render.yaml` و`run.sh` من النسخة القديمة التي كانت على Render وVercel، ولم تعد مستخدمة في الإنتاج.

## 2. طريقة تثبيت المشروع وتشغيله محلياً
### المتطلبات المسبقة:
- Node.js 18 أو أحدث
- MySQL Server

### الخطوات:
```bash
cd backend-node
npm install
cp .env.example .env   # ثم املأ القيم الحقيقية
npm start              # أو: npm run dev لإعادة التشغيل تلقائياً عند تعديل الكود
```
يفتح الموقع على `http://localhost:8000`، ولوحة تحكم الأدمن على `/admin.html`.

## 3. طريقة إنشاء قاعدة البيانات (MySQL)
1. أنشئ قاعدة البيانات:
   ```sql
   CREATE DATABASE ai_talker_node CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. اضبط `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` في `backend-node/.env`.
3. شغّل الخادم. الجداول تُنشأ تلقائياً عند الإقلاع، وحساب الأدمن يُنشأ تلقائياً إن ضبطت `ADMIN_USERNAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`.

## 4. طريقة إعداد تسجيل الدخول بحساب Google
المشروع يستخدم **Google Identity Services**، فلا يحتاج Client Secret:

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/) وأنشئ مشروعاً (أو استخدم مشروعاً موجوداً).
2. من **APIs & Services → Credentials**، أنشئ **OAuth client ID** من نوع **Web application**.
3. في خانة **Authorized JavaScript origins** أضف:
   - `https://talker.lughaty.cloud`
   - `http://localhost:8000` (للتطوير المحلي)
4. انسخ **Client ID** وضعه في مكانين:
   - متغير البيئة `GOOGLE_CLIENT_ID` في `backend-node/.env` (على الخادم وعلى جهازك).
   - الثابت `GOOGLE_CLIENT_ID` في قسم "Google Login Logic" داخل `backend-node/public/js/main.js`.

## 5. طريقة إعداد إرسال البريد (نموذج تواصل معنا)
Gmail يحتاج **App Password** خاصة وليس كلمة مرور الحساب:

1. فعّل **التحقق بخطوتين** على حساب Gmail: myaccount.google.com/security
2. أنشئ كلمة مرور تطبيق من myaccount.google.com/apppasswords (16 حرفاً).
3. ضع في `backend-node/.env`:
   ```
   EMAIL_HOST_USER=بريدك@gmail.com
   EMAIL_HOST_PASSWORD=كلمة_المرور_المكوّنة_من_16_حرف
   CONTACT_EMAIL=البريد_الذي_تريد_استقبال_رسائل_الزوار_عليه
   ```

## 6. حدود معدّل الطلبات (Rate Limiting)
مضبوطة في `backend-node/src/middleware/rateLimit.js` لكل عنوان IP:

| الواجهة | الحد |
|---|---|
| رفع ملف/صورة للترجمة | 10 طلبات/ساعة |
| نموذج تواصل معنا | 5 طلبات/ساعة |
| تسجيل حساب / تسجيل الدخول | 20 طلب/ساعة |
| تحويل الصوت إلى نص والترجمة الصوتية | 60 طلب/ساعة |

تجاوز الحد يُرجع `429 Too Many Requests`.

## 7. النشر على Hostinger VPS (أول مرة)
الموقع يعمل على خادم Hostinger VPS: يستقبل **nginx** الطلبات على `talker.lughaty.cloud` (مع شهادة HTTPS) ويمرّرها إلى تطبيق Node.js الذي يديره **pm2**.

1. اتصل بالخادم:
   ```bash
   ssh root@<عنوان-IP-الخادم>
   ```
2. ثبّت Node.js 18+ وMySQL وnginx وpm2 (`npm install -g pm2`)، وأنشئ قاعدة البيانات (القسم 3).
3. انسخ المستودع وثبّت الحزم:
   ```bash
   git clone https://github.com/NizarNaser/ai_talker.git
   cd ai_talker/backend-node
   npm install --omit=dev
   cp .env.example .env   # واملأ القيم الحقيقية (OPENAI_API_KEY، بيانات MySQL، SECRET_KEY...)
   ```
4. شغّل التطبيق عبر pm2 واجعله يعمل تلقائياً بعد إعادة تشغيل الخادم:
   ```bash
   pm2 start server.js --name ai-talker
   pm2 save
   pm2 startup   # ونفّذ الأمر الذي يطبعه
   ```
5. اضبط nginx ليمرّر الطلبات إلى منفذ التطبيق (`PORT` في `.env`، افتراضياً 8000):
   ```nginx
   server {
       server_name talker.lughaty.cloud;
       client_max_body_size 25M;   # لرفع الملفات والصور والتسجيلات الصوتية

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
6. فعّل HTTPS عبر Let's Encrypt:
   ```bash
   certbot --nginx -d talker.lughaty.cloud
   ```
7. تأكد أن سجل DNS من نوع `A` للنطاق `talker.lughaty.cloud` يشير إلى عنوان IP الخادم.

## 8. طريقة التحديث (نشر تعديل جديد)
الرفع إلى GitHub **لا ينشر تلقائياً**. بعد كل تعديل:

1. على جهازك: احفظ التعديلات وارفعها إلى GitHub:
   ```bash
   git push origin main
   ```
2. على الخادم: اسحب التعديلات وأعد تشغيل التطبيق:
   ```bash
   ssh root@<عنوان-IP-الخادم>
   cd ai_talker/backend-node   # مسار المستودع على الخادم
   git pull origin main
   npm install --omit=dev      # فقط إن تغيّر package.json
   pm2 restart ai-talker       # اسم التطبيق كما يظهر في: pm2 list
   ```
3. تحقّق من الموقع: https://talker.lughaty.cloud/

> عند تعديل `js/main.js` أو `css/style.css` ارفع رقم الإصدار في رابطهما داخل `index.html` (مثل `main.js?v=5` ← `v=6`) حتى تحمّل المتصفحات النسخة الجديدة بدل النسخة المخزنة.

## 9. طريقة الصيانة
- **حالة التطبيق:** `pm2 status`
- **السجلات (Logs):** `pm2 logs ai-talker` (وسجلات nginx في `/var/log/nginx/`)
- **إعادة التشغيل / الإيقاف:** `pm2 restart ai-talker` / `pm2 stop ai-talker`
- **فحص سريع:** `https://talker.lughaty.cloud/api/health/`

## 10. طريقة النسخ الاحتياطي
- **قاعدة البيانات:** على الخادم:
  ```bash
  mysqldump -u <المستخدم> -p ai_talker_node > backup-$(date +%F).sql
  ```
  ويمكن أيضاً تفعيل النسخ الاحتياطي (Snapshots) للـ VPS من لوحة Hostinger.
- **الملفات المرفوعة:** محفوظة في حساب Cloudinary.
- **الكود:** محفوظ على GitHub.
- **ملف `.env`:** غير موجود على GitHub، فاحتفظ بنسخة منه في مكان آمن.

## 11. طريقة إضافة AdSense
1. سجّل موقعك في [Google AdSense](https://www.google.com/adsense/).
2. ستجد في `backend-node/public/index.html` عناصر `<div class="ad-banner" data-ad-slot="...">` جاهزة كأماكن للإعلانات.
3. استبدل محتواها بالشيفرة المقدمة من AdSense. ملف `backend-node/public/ads.txt` يُخدم من جذر الموقع.

google ads :helpinbusiness.count@gmail.com
