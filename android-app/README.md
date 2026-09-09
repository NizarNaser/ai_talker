# تطبيق AI Talker لأندرويد

هذا مشروع Android يعرض موقع AI Talker كتطبيق حقيقي (Trusted Web Activity / TWA)
عبر [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) من Google — تطبيق
يفتح الموقع بملء الشاشة داخل Chrome بدون أي شريط عناوين، مبني من نفس ملف
`frontend/manifest.json` الخاص بالموقع.

## التحميل
آخر نسخة APK جاهزة للتثبيت المباشر متوفرة في
[GitHub Releases](https://github.com/NizarNaser/ai_talker/releases) — لا حاجة
لإعادة البناء إلا عند إصدار نسخة جديدة.

## إعادة البناء محلياً
```bash
cd android-app
npx @bubblewrap/cli build
```
يحتاج هذا:
- JDK 17
- Android SDK (مع `cmdline-tools`، `platform-tools`، `build-tools`)
- ملف `android.keystore` (مفتاح التوقيع - **غير موجود في المستودع لأنه سرّي**،
  احتفظ بنسخة منه في مكان آمن؛ بدونه لا يمكن إصدار تحديث بنفس معرّف التطبيق)

بيانات المفتاح (احفظها في مكان آمن، ليست في المستودع):
- Alias: `aitalker`
- بصمة SHA256 المسجّلة في `frontend/.well-known/assetlinks.json`:
  `E2:2F:A2:49:8E:FA:92:F4:2B:05:14:65:27:3F:0C:00:43:6A:75:03:31:19:0F:36:EB:EE:87:2D:52:2D:4F:C6`

## نشر نسخة جديدة
1. حدّث `appVersionCode` و `appVersionName` في `twa-manifest.json`.
2. `npx @bubblewrap/cli build` لإعادة توليد `app-release-signed.apk`.
3. ارفع الملف الناتج كـ Release جديد على GitHub:
   ```bash
   gh release create android-vX.Y.Z app-release-signed.apk --title "AI Talker Android App vX.Y.Z" --notes "..."
   ```
4. حدّث رابط التحميل في `frontend/index.html` (زر "حمّل تطبيق أندرويد مجاناً").

## ملاحظة حول التوثيق (Digital Asset Links)
ملف `frontend/.well-known/assetlinks.json` يجب أن يبقى متطابقاً مع بصمة مفتاح
التوقيع الحالي حتى يفتح التطبيق بدون شريط عنوان (Trusted Web Activity كامل
الثقة). إن تغيّر مفتاح التوقيع مستقبلاً، يجب تحديث هذا الملف بالبصمة الجديدة.
