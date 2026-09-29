const express = require('express');
const multer = require('multer');
const { ResilientTranslator } = require('../services/translateService');
const { translateDocx } = require('../services/docxService');
const { translatePdf } = require('../services/pdfService');
const { translateImagePreservingStyle } = require('../services/visionService');
const { uploadRawFile } = require('../services/storageService');
const { scopedLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const MAX_PROCESSING_MS = 120000;
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
class TimeoutError extends Error {}

function mapLang(lang) {
  if (!lang) return 'auto';
  const lower = String(lang).trim().toLowerCase();
  if (['zh', 'zh-cn', 'chinese', 'chinese (simplified)', 'zh-hans'].includes(lower)) return 'zh-CN';
  if (['zh-tw', 'chinese (traditional)', 'zh-hant'].includes(lower)) return 'zh-TW';
  if (lower.startsWith('ar-')) return 'ar';
  return String(lang).trim();
}

const VISION_LANG_MAP = {
  ar: 'ar', en: 'en', fr: 'fr', es: 'es', de: 'de', ru: 'ru',
  'zh-CN': 'zh', 'zh-TW': 'zh-Hant', ja: 'ja', ko: 'ko', it: 'it', pt: 'pt',
  nl: 'nl', sv: 'sv', tr: 'tr', hi: 'hi',
};

router.post('/', scopedLimiter('upload'), upload.single('file'), async (req, res) => {
  const fileObj = req.file;
  const targetLang = req.body.target_lang || 'ar';
  const sourceLang = req.body.source_lang || 'auto';

  if (!fileObj) return res.status(400).json({ error: 'لم يتم العثور على ملف في الطلب.' });

  console.log(`📥 Upload: ${fileObj.originalname}, ${fileObj.size} bytes`);

  const fileName = fileObj.originalname.toLowerCase();

  let safeSource = mapLang(sourceLang);
  let safeTarget = mapLang(targetLang);
  if (safeSource === 'zh') safeSource = 'zh-CN';
  if (safeTarget === 'zh') safeTarget = 'zh-CN';
  const translator = new ResilientTranslator(safeSource, safeTarget);

  try {
    if (fileName.endsWith('.docx')) {
      const { originalText, translatedText, docxBuffer } = await withTimeout(
        translateDocx(fileObj.buffer, translator), MAX_PROCESSING_MS
      );
      return res.json({
        original_text: originalText,
        translated_text: translatedText,
        translated_file_base64: docxBuffer.toString('base64'),
        translated_file_format: 'docx',
        message: 'تم استخراج وترجمة النص بنجاح',
      });
    }

    if (fileName.endsWith('.pdf')) {
      const { originalText, translatedText, docxBuffer } = await withTimeout(
        translatePdf(fileObj.buffer, translator), MAX_PROCESSING_MS
      );
      if (!docxBuffer) {
        return res.status(400).json({ error: 'لم يتم العثور على نص في ملف الـPDF.' });
      }
      return res.json({
        original_text: originalText,
        translated_text: translatedText,
        translated_file_base64: docxBuffer.toString('base64'),
        translated_file_format: 'docx',
        message: 'تم استخراج وترجمة النص بنجاح',
      });
    }

    if (/\.(png|jpe?g|webp)$/.test(fileName)) {
      const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'خدمة استخراج نص الصور (Google Cloud Vision) غير مضبوطة على الخادم.' });
      }
      const langHints = VISION_LANG_MAP[safeSource] ? [VISION_LANG_MAP[safeSource]] : null;

      const { originalText, translatedText, stylizedImageBuffer } = await withTimeout(
        translateImagePreservingStyle(fileObj.buffer, langHints, translator, apiKey), MAX_PROCESSING_MS
      );

      if (!originalText) {
        return res.status(400).json({ error: 'لم يتم العثور على نص في الصورة. تأكد أن الصورة واضحة وتحتوي على نص مقروء.' });
      }

      return res.json({
        original_text: originalText,
        translated_text: translatedText,
        translated_file_base64: stylizedImageBuffer ? stylizedImageBuffer.toString('base64') : null,
        translated_file_format: stylizedImageBuffer ? 'png' : null,
        message: 'تم استخراج وترجمة النص بنجاح',
      });
    }

    // نوع ملف غير مدعوم للمعالجة: نرفعه كما هو ونرجع رابط تحميله.
    try {
      const fileUrl = await uploadRawFile(fileObj.buffer, fileObj.originalname);
      return res.json({ message: 'تم رفع الملف بنجاح (نوع غير مدعوم للمعالجة).', file_url: fileUrl });
    } catch (e) {
      return res.status(500).json({ error: `فشل رفع الملف: ${e.message}` });
    }
  } catch (e) {
    if (e instanceof TimeoutError) {
      return res.status(504).json({ error: 'انتهت مهلة معالجة الملف. يرجى رفع ملف أصغر أو تجربة مرة أخرى.' });
    }
    console.error('Upload processing error:', e);
    return res.status(500).json({ error: `حدث خطأ غير متوقع: ${e.message}` });
  }
});

module.exports = router;
