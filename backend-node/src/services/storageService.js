const cloudinary = require('cloudinary').v2;

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (process.env.CLOUDINARY_URL) {
    // مكتبة cloudinary تقرأ CLOUDINARY_URL تلقائياً من متغيرات البيئة عند الاستدعاء الأول.
    cloudinary.config(true);
  }
  configured = true;
}

/**
 * يرفع ملفاً عاماً (نوع غير مدعوم للمعالجة) إلى Cloudinary ويرجع رابطه، بديل
 * نسخة بايثون التي كانت تحفظه عبر default_storage (Cloudinary أيضاً في الإنتاج).
 */
async function uploadRawFile(buffer, filename) {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'uploads', public_id: filename },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadRawFile };
