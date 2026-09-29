/**
 * ترجمة ملفات PDF: استخراج النص فقط ثم إخراجه كملف .docx مترجم جديد.
 *
 * ملاحظة مهمة: نسخة بايثون كانت تستخدم pdf2docx لتحويل PDF إلى docx مع
 * الحفاظ على التخطيط الأصلي (جداول، مواضع نص) قبل ترجمته. لا توجد مكتبة
 * Node.js تكافئ ذلك، فهذه النسخة تستخرج النص فقط (بلا تخطيط الصفحة الأصلي)
 * وتضعه في مستند Word جديد بسيط.
 */
const pdfParse = require('pdf-parse');
const { Document, Packer, Paragraph } = require('docx');

async function translatePdf(buffer, translator) {
  const data = await pdfParse(buffer);
  const rawText = data.text || '';
  const paragraphsText = rawText
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (!paragraphsText.length) {
    return { originalText: '', translatedText: '', docxBuffer: null };
  }

  const translations = [];
  for (const p of paragraphsText) {
    try {
      translations.push((await translator.translate(p)) || p);
    } catch {
      translations.push(p);
    }
  }

  const doc = new Document({
    sections: [{ children: translations.map((t) => new Paragraph({ text: t })) }],
  });
  const docxBuffer = await Packer.toBuffer(doc);

  return {
    originalText: paragraphsText.join('\n'),
    translatedText: translations.join('\n'),
    docxBuffer,
  };
}

module.exports = { translatePdf };
