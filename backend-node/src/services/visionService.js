/**
 * أدوات ترجمة الصور مع الحفاظ على نفس ستايل وتصميم الصورة الأصلية.
 *
 * الفكرة: نستخرج مواقع أسطر النص عبر OpenAI Vision (بدل Google Cloud Vision،
 * لإلغاء أي اعتماد على Google Cloud/حساب فوترة)، نترجم كل سطر، ثم نمحو النص
 * الأصلي (بتلوين مكانه بلون الخلفية المحيطة به) ونعيد رسم النص المترجم في
 * نفس المكان بنفس الحجم التقريبي ولون قريب من لون النص الأصلي.
 *
 * رسم النص يتم عبر @napi-rs/canvas (Skia + HarfBuzz)، الذي يشكّل النصوص
 * المعقّدة (العربية، الهندية...) ويحدّد اتجاهها تلقائياً عند الرسم، فلا
 * حاجة لإعادة تشكيل يدوي (بخلاف نسخة بايثون التي احتاجت arabic-reshaper).
 */
const axios = require('axios');
const path = require('path');
const sharp = require('sharp');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * يستخرج أسطر النص المرئي في الصورة عبر OpenAI Vision (بدون ترجمة أو تصحيح)،
 * مع صندوق إحداثيات كل سطر بالبكسل. يرجع مصفوفة { text, box } حيث box هو
 * [left, top, right, bottom] بالبكسل، أو null إن كان صندوق ذلك السطر غير
 * صالح (يُحتفظ بالنص رغم ذلك ليظهر في النص المستخرج/المترجم النهائي).
 */
async function extractImageLinesWithOpenAI(imageBuffer, langHints) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY غير مضبوط على الخادم.');
  }

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (!width || !height) {
    throw new Error('تعذّر قراءة أبعاد الصورة.');
  }
  const format = metadata.format === 'jpg' ? 'jpeg' : (metadata.format || 'png');
  const dataUrl = `data:image/${format};base64,${imageBuffer.toString('base64')}`;

  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
  const langHintText = langHints && langHints.length
    ? ` The text is likely written in: ${langHints.join(', ')}.`
    : '';
  const prompt = 'Detect every line of visible text in this image, in natural reading order. '
    + 'For each line, extract its text EXACTLY as written — do not translate it and do not correct '
    + 'spelling or grammar.' + langHintText + ' For each line also give its bounding box as RELATIVE '
    + 'coordinates (numbers between 0 and 1) of the image width/height: x (left edge), y (top edge), '
    + 'w (width), h (height).\n\n'
    + 'Respond with ONLY a JSON object in exactly this shape, no other text:\n'
    + '{"lines":[{"text":"...","box":{"x":0.12,"y":0.30,"w":0.40,"h":0.05}}]}\n'
    + 'If there is no readable text in the image, respond with {"lines":[]}.';

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      }],
      response_format: { type: 'json_object' },
      temperature: 0,
    },
    { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('رد فارغ من OpenAI Vision.');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error('تعذّر تفسير رد OpenAI Vision كـ JSON.');
  }

  const rawLines = Array.isArray(parsed.lines) ? parsed.lines : [];
  const lines = [];
  for (const raw of rawLines) {
    const text = typeof raw?.text === 'string' ? raw.text.trim() : '';
    if (!text) continue; // تجاهل أي سطر بلا نص

    let box = null;
    const b = raw?.box;
    if (
      b && typeof b.x === 'number' && typeof b.y === 'number'
      && typeof b.w === 'number' && typeof b.h === 'number'
      && b.w > 0 && b.h > 0
    ) {
      const left = clamp(b.x * width, 0, width);
      const top = clamp(b.y * height, 0, height);
      const right = clamp((b.x + b.w) * width, 0, width);
      const bottom = clamp((b.y + b.h) * height, 0, height);
      if (right > left && bottom > top) box = [left, top, right, bottom];
    }
    // صندوق غير صالح: يُتجاهل كصندوق لكن يبقى النص للناتج النصي النهائي.

    lines.push({ text, box });
  }

  return lines.slice(0, MAX_LINES);
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

// يُرفع عند فشل استخراج نص الصورة (مفتاح OpenAI غير مضبوط أو فشل الطلب)،
// ليميّزه المسار (route) عن أي خطأ آخر غير متوقع ويرجع رسالة عربية واضحة
// بدل خطأ 500 عام.
class ImageExtractionError extends Error {}

/**
 * يستخرج نص الصورة عبر OpenAI Vision، يترجمه سطراً بسطر، ثم يعيد رسم الترجمة
 * في نفس أماكن النص الأصلي بنفس الألوان التقريبية.
 *
 * يرجع { originalText, translatedText, stylizedImageBuffer } حيث
 * stylizedImageBuffer هو PNG buffer، أو null إذا لم يُعثر على أي نص، أو إذا
 * لم يكن لأي سطر مستخرج صندوق إحداثيات صالح لإعادة الرسم.
 */
async function translateImagePreservingStyle(imageBuffer, langHints, translator) {
  ensureFontsRegistered();

  let lines;
  try {
    lines = await extractImageLinesWithOpenAI(imageBuffer, langHints);
  } catch (e) {
    console.error('OpenAI image text extraction failed:', e.message);
    throw new ImageExtractionError('تعذّر استخراج النص من الصورة حالياً');
  }

  if (!lines.length) return { originalText: '', translatedText: '', stylizedImageBuffer: null };

  const texts = lines.map((l) => l.text);
  let translations = await translateLines(texts, translator);
  if (translations.length !== texts.length) {
    translations = texts.map((t, i) => translations[i] ?? t);
  }

  const originalText = texts.join('\n');
  const translatedText = translations.join('\n');

  if (!lines.some((l) => l.box)) {
    // لا صناديق صالحة لأي سطر: نرجع النص فقط بدون صورة معدّلة.
    return { originalText, translatedText, stylizedImageBuffer: null };
  }

  const image = await loadImage(imageBuffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].box) continue;

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

  return { originalText, translatedText, stylizedImageBuffer: canvas.toBuffer('image/png') };
}

module.exports = {
  translateImagePreservingStyle,
  ImageExtractionError,
  extractImageLinesWithOpenAI,
  detectScript,
  fontForText,
  pickBackgroundAndTextColors,
  fitFont,
  ensureFontsRegistered,
};
