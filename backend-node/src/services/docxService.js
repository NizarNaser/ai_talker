/**
 * ترجمة ملفات Word (.docx) فقرةً بفقرة، مع الحفاظ على تنسيق المستند (يشمل
 * فقرات الجداول أيضاً لأنها في النهاية عناصر <w:p> عادية في XML الملف).
 *
 * بخلاف نسخة بايثون (python-docx)، نعمل هنا مباشرة على XML الداخلي للملف
 * (كل .docx هو أرشيف zip يحوي word/document.xml) لأن حزم Node لقراءة/تعديل
 * docx محدودة، وهذا النهج أبسط وأكثر ضبطاً للنتيجة.
 */
const JSZip = require('jszip');

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXmlEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

const PARAGRAPH_RE = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
const TEXT_RUN_RE = /<w:t\b([^>]*)>([\s\S]*?)<\/w:t>/g;

function extractParagraphText(paragraphXml) {
  let match;
  let text = '';
  TEXT_RUN_RE.lastIndex = 0;
  while ((match = TEXT_RUN_RE.exec(paragraphXml))) {
    text += decodeXmlEntities(match[2]);
  }
  return text;
}

async function translateDocumentXml(xml, translator) {
  const paragraphs = xml.match(PARAGRAPH_RE) || [];
  const originals = paragraphs.map(extractParagraphText);

  const translations = [];
  for (const text of originals) {
    if (!text.trim()) {
      translations.push(text);
      continue;
    }
    try {
      translations.push((await translator.translate(text)) || text);
    } catch {
      translations.push(text);
    }
  }

  let idx = 0;
  const newXml = xml.replace(PARAGRAPH_RE, (block) => {
    const original = originals[idx];
    const translated = translations[idx];
    idx += 1;
    if (!original.trim()) return block; // فقرة بلا نص، تبقى كما هي

    let first = true;
    return block.replace(TEXT_RUN_RE, (full, attrs) => {
      if (first) {
        first = false;
        const withSpacePreserve = attrs.includes('xml:space') ? attrs : `${attrs} xml:space="preserve"`;
        return `<w:t${withSpacePreserve}>${escapeXml(translated)}</w:t>`;
      }
      return `<w:t${attrs}></w:t>`;
    });
  });

  const nonEmpty = originals.map((t, i) => [t, translations[i]]).filter(([t]) => t.trim());
  return {
    newXml,
    originalText: nonEmpty.map(([t]) => t).join('\n'),
    translatedText: nonEmpty.map(([, t]) => t).join('\n'),
  };
}

/**
 * يترجم ملف .docx (buffer) ويرجع { originalText, translatedText, docxBuffer }.
 */
async function translateDocx(buffer, translator) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXmlPath = 'word/document.xml';
  const xml = await zip.file(documentXmlPath).async('string');

  const { newXml, originalText, translatedText } = await translateDocumentXml(xml, translator);

  zip.file(documentXmlPath, newXml);
  const docxBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  return { originalText, translatedText, docxBuffer };
}

module.exports = { translateDocx };
