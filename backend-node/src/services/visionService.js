/**
 * أدوات ترجمة الصور مع الحفاظ على نفس ستايل وتصميم الصورة الأصلية.
 *
 * الفكرة: نستخرج مواقع أسطر النص عبر Google Cloud Vision API، نترجم كل سطر،
 * ثم نمحو النص الأصلي (بتلوين مكانه بلون الخلفية المحيطة به) ونعيد رسم النص
 * المترجم في نفس المكان بنفس الحجم التقريبي ولون قريب من لون النص الأصلي.
 *
 * رسم النص يتم عبر @napi-rs/canvas (Skia + HarfBuzz)، الذي يشكّل النصوص
 * المعقّدة (العربية، الهندية...) ويحدّد اتجاهها تلقائياً عند الرسم، فلا
 * حاجة لإعادة تشكيل يدوي (بخلاف نسخة بايثون التي احتاجت arabic-reshaper).
 */
const axios = require('axios');
const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
const MAX_LINES = 80;

const FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');
const FONT_FAMILIES = {
  latin: 'AiTalkerLatin',
  arabic: 'AiTalkerArabic',
  devanagari: 'AiTalkerDevanagari',
  cjk: 'AiTalkerCJK',
};

let fontsRegistered = false;
function ensureFontsRegistered() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'NotoSans-Regular.ttf'), FONT_FAMILIES.latin);
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'NotoSansArabic-Regular.ttf'), FONT_FAMILIES.arabic);
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'NotoSansDevanagari-Regular.ttf'), FONT_FAMILIES.devanagari);
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'NotoSansCJK-Regular.ttc'), FONT_FAMILIES.cjk);
  fontsRegistered = true;
}

function scriptOfChar(ch) {
  const cp = ch.codePointAt(0);
  if ((cp >= 0x0600 && cp <= 0x06ff) || (cp >= 0x0750 && cp <= 0x08ff) || (cp >= 0xfb50 && cp <= 0xfeff)) return 'arabic';
  if (cp >= 0x0900 && cp <= 0x097f) return 'devanagari';
  if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0xf900 && cp <= 0xfaff)) return 'han';
  if (cp >= 0x3040 && cp <= 0x30ff) return 'kana';
  if (cp >= 0xac00 && cp <= 0xd7a3) return 'hangul';
  return null;
}

function detectScript(text) {
  for (const ch of text) {
    const script = scriptOfChar(ch);
    if (script) return script;
  }
  return 'latin';
}

// يرجع {family, isRtl} حسب سكربت النص الفعلي (وليس فقط لغة الهدف المعلنة).
function fontForText(text) {
  const script = detectScript(text);
  if (script === 'arabic') return { family: FONT_FAMILIES.arabic, isRtl: true };
  if (script === 'devanagari') return { family: FONT_FAMILIES.devanagari, isRtl: false };
  if (script === 'han' || script === 'kana' || script === 'hangul') return { family: FONT_FAMILIES.cjk, isRtl: false };
  return { family: FONT_FAMILIES.latin, isRtl: false };
}

function luminance([r, g, b]) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// يقدّر لون خلفية المنطقة ولون النص الأصلي بناءً على الألوان السائدة فيها،
// بنفس منطق نسخة بايثون (أكثر 6 ألوان تكراراً، ثم أبعدها إضاءةً عن الخلفية).
function pickBackgroundAndTextColors(ctx, box) {
  const [left, top, right, bottom] = box;
  const w = Math.max(right - left, 1);
  const h = Math.max(bottom - top, 1);
  const { data } = ctx.getImageData(left, top, w, h);

  const counts = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  if (counts.size === 0) return { background: [255, 255, 255], textColor: [0, 0, 0] };

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const dominant = sorted.slice(0, 6).map(([key]) => key.split(',').map(Number));
  const background = dominant[0];
  const bgLum = luminance(background);

  let textColor = null;
  let bestDiff = 0;
  for (const color of dominant.slice(1)) {
    const diff = Math.abs(luminance(color) - bgLum);
    if (diff > bestDiff) {
      bestDiff = diff;
      textColor = color;
    }
  }
  if (!textColor || bestDiff < 40) {
    textColor = bgLum > 128 ? [0, 0, 0] : [255, 255, 255];
  }
  return { background, textColor };
}

async function fetchVisionDocumentText(imageBuffer, apiKey, langHints) {
  const payload = {
    requests: [{
      image: { content: imageBuffer.toString('base64') },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      imageContext: langHints && langHints.length ? { languageHints: langHints } : {},
    }],
  };
  const response = await axios.post(VISION_API_URL, payload, { params: { key: apiKey }, timeout: 30000 });
  const result = response.data.responses[0];
  if (result.error) throw new Error(result.error.message || 'Vision API error');
  return result.fullTextAnnotation || null;
}

function wordBox(word) {
  const xs = word.boundingBox.vertices.map((v) => v.x || 0);
  const ys = word.boundingBox.vertices.map((v) => v.y || 0);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function wordText(word) {
  return (word.symbols || []).map((s) => s.text || '').join('');
}

function wordEndsLine(word) {
  const symbols = word.symbols || [];
  if (!symbols.length) return false;
  const brk = symbols[symbols.length - 1]?.property?.detectedBreak?.type;
  return brk === 'LINE_BREAK' || brk === 'EOL_SURE_SPACE';
}

// يجمّع كلمات Vision API إلى أسطر بالاعتماد على تجميع الفقرات وعلامات فواصل
// الأسطر التي يرجعها Vision، مع حساب صندوق إحداثيات كل سطر.
function groupWordsIntoLines(annotation) {
  const lines = [];
  if (!annotation) return lines;

  for (const page of annotation.pages || []) {
    for (const block of page.blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        let words = [];
        let box = null;
        for (const word of paragraph.words || []) {
          const text = wordText(word).trim();
          if (text) {
            words.push(text);
            const [wl, wt, wr, wb] = wordBox(word);
            box = box ? [Math.min(box[0], wl), Math.min(box[1], wt), Math.max(box[2], wr), Math.max(box[3], wb)] : [wl, wt, wr, wb];
          }
          if (wordEndsLine(word) && words.length) {
            lines.push({ text: words.join(' '), box });
            words = [];
            box = null;
          }
        }
        if (words.length) lines.push({ text: words.join(' '), box });
      }
    }
  }
  return lines;
}

function translateLines(texts, translator) {
  // يترجم كل الأسطر بطلب واحد (مدموجة بفاصل أسطر) بدل طلب منفصل لكل سطر،
  // ويعود للترجمة سطراً بسطر فقط إذا فشل الدمج (مثلاً لو غيّر المترجم عدد الأسطر).
  if (!texts.length) return [];
  const delimiter = '\n';
  return translator.translate(texts.join(delimiter)).then(
    (joined) => {
      if (joined) {
        const parts = joined.split(delimiter);
        if (parts.length === texts.length) return parts;
      }
      return Promise.all(texts.map((t) => translator.translate(t).catch(() => t)));
    },
    () => Promise.all(texts.map((t) => translator.translate(t).catch(() => t)))
  );
}

// يبحث عن أكبر حجم خط يجعل النص يتّسع داخل الصندوق (max_width x max_height).
function fitFont(ctx, text, family, maxWidth, maxHeight) {
  let size = Math.max(Math.floor(maxHeight * 0.8), 8);
  ctx.font = `${size}px ${family}`;
  let metrics = ctx.measureText(text);
  let textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  while (size > 8 && (metrics.width > maxWidth || textHeight > maxHeight)) {
    size -= 1;
    ctx.font = `${size}px ${family}`;
    metrics = ctx.measureText(text);
    textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  }
  return { size, metrics };
}

/**
 * يستخرج نص الصورة عبر Google Cloud Vision API، يترجمه سطراً بسطر، ثم يعيد
 * رسم الترجمة في نفس أماكن النص الأصلي بنفس الألوان التقريبية.
 *
 * يرجع { originalText, translatedText, stylizedImageBuffer } حيث
 * stylizedImageBuffer هو PNG buffer، أو null إذا لم يُعثر على أي نص.
 */
async function translateImagePreservingStyle(imageBuffer, langHints, translator, apiKey) {
  ensureFontsRegistered();

  const annotation = await fetchVisionDocumentText(imageBuffer, apiKey, langHints);
  const lines = groupWordsIntoLines(annotation).slice(0, MAX_LINES);
  if (!lines.length) return { originalText: '', translatedText: '', stylizedImageBuffer: null };

  const texts = lines.map((l) => l.text);
  let translations = await translateLines(texts, translator);
  if (translations.length !== texts.length) {
    translations = texts.map((t, i) => translations[i] ?? t);
  }

  const image = await loadImage(imageBuffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  for (let i = 0; i < lines.length; i++) {
    const translated = translations[i] || lines[i].text;
    const [left, top, right, bottom] = lines[i].box;
    const pad = 2;
    const box = [
      Math.max(left - pad, 0), Math.max(top - pad, 0),
      Math.min(right + pad, image.width), Math.min(bottom + pad, image.height),
    ];
    const { background, textColor } = pickBackgroundAndTextColors(ctx, box);

    ctx.fillStyle = `rgb(${background[0]},${background[1]},${background[2]})`;
    ctx.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);

    const boxW = box[2] - box[0];
    const boxH = box[3] - box[1];
    const { family, isRtl } = fontForText(translated);
    const { size } = fitFont(ctx, translated, family, boxW, boxH);

    ctx.font = `${size}px ${family}`;
    ctx.fillStyle = `rgb(${textColor[0]},${textColor[1]},${textColor[2]})`;
    ctx.direction = isRtl ? 'rtl' : 'ltr';
    ctx.textAlign = isRtl ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    const x = isRtl ? box[2] : box[0];
    const y = box[1] + boxH / 2;
    ctx.fillText(translated, x, y);
  }

  return {
    originalText: texts.join('\n'),
    translatedText: translations.join('\n'),
    stylizedImageBuffer: canvas.toBuffer('image/png'),
  };
}

module.exports = {
  translateImagePreservingStyle,
  groupWordsIntoLines,
  detectScript,
  fontForText,
  pickBackgroundAndTextColors,
  fitFont,
  ensureFontsRegistered,
};
