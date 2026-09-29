/**
 * طبقة ترجمة موحّدة تُستخدم في كل أنحاء المشروع (الترجمة الفورية، ترجمة
 * الملفات والصور). أربع طبقات بالترتيب: Google Cloud Translation API الرسمي
 * والمدفوع (إن كان مفتاحه مضبوطاً)، ثم OpenAI API (مدفوع وموثوق)، ثم
 * GoogleTranslator المجاني (استخراج بيانات من صفحة الترجمة العامة، عرضة
 * للحظر/التقييد)، ثم MyMemory كخدمة مجانية أخيرة بديلة، بدل أن تتعطل
 * الترجمة بالكامل عند فشل أي طبقة.
 */
const axios = require('axios');

const CLOUD_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const FREE_GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';

const LANG_NAMES = {
  auto: 'the automatically detected source language',
  ar: 'Arabic', 'ar-eg': 'Egyptian Arabic', 'ar-sa': 'Saudi Arabic',
  en: 'English', fr: 'French', es: 'Spanish', de: 'German', tr: 'Turkish',
  ru: 'Russian', 'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese',
  ja: 'Japanese', ko: 'Korean', hi: 'Hindi', it: 'Italian', pt: 'Portuguese',
  'pt-BR': 'Brazilian Portuguese', nl: 'Dutch', sv: 'Swedish', fa: 'Persian', ur: 'Urdu',
};

// MyMemory تتطلب رموز لغة بصيغة locale (مثل ar-SA) بخلاف Google الذي يقبل
// رموزاً مبسطة (ar).
const MYMEMORY_LANG_MAP = {
  auto: 'auto',
  ar: 'ar-SA', 'ar-eg': 'ar-EG', 'ar-sa': 'ar-SA',
  en: 'en-GB', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', tr: 'tr-TR',
  ru: 'ru-RU', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', ja: 'ja-JP',
  ko: 'ko-KR', hi: 'hi-IN', it: 'it-IT', pt: 'pt-PT', 'pt-BR': 'pt-BR',
  nl: 'nl-NL', sv: 'sv-SE', fa: 'fa-IR', ur: 'ur-PK',
};

const MYMEMORY_MAX_CHARS = 480;

function langName(code) {
  return LANG_NAMES[code] || code;
}

function mymemoryLang(lang) {
  return MYMEMORY_LANG_MAP[lang] || lang;
}

function chunkText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf(' ', maxLen);
    if (cut <= 0) cut = maxLen;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

class ResilientTranslator {
  constructor(source = 'auto', target = 'en') {
    this.source = source;
    this.target = target;
  }

  async translateWithCloudApi(text) {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) return null;
    const params = { key: apiKey };
    const data = { q: text, target: this.target, format: 'text' };
    if (this.source && this.source !== 'auto') data.source = this.source;
    const response = await axios.post(CLOUD_TRANSLATE_API_URL, null, {
      params: { ...params, ...data },
      timeout: 10000,
    });
    return response.data?.data?.translations?.[0]?.translatedText || null;
  }

  async translateWithOpenAI(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const prompt = `Translate the following text from ${langName(this.source)} to ${langName(this.target)}. Reply with ONLY the translated text — no quotes, no explanations, no extra commentary.\n\nText:\n${text}`;
    const response = await axios.post(
      OPENAI_API_URL,
      { model, messages: [{ role: 'user', content: prompt }], temperature: 0.2 },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 }
    );
    return response.data?.choices?.[0]?.message?.content?.trim() || null;
  }

  async translateWithFreeGoogle(text) {
    const response = await axios.get(FREE_GOOGLE_TRANSLATE_URL, {
      params: {
        client: 'gtx',
        sl: this.source || 'auto',
        tl: this.target,
        dt: 't',
        q: text,
      },
      timeout: 10000,
    });
    const segments = response.data?.[0] || [];
    return segments.map((seg) => seg[0]).join('');
  }

  async translateWithMyMemory(text) {
    const chunks = chunkText(text, MYMEMORY_MAX_CHARS);
    const contactEmail = process.env.MYMEMORY_CONTACT_EMAIL || '';
    const translatedChunks = [];
    for (const chunk of chunks) {
      const params = {
        q: chunk,
        langpair: `${mymemoryLang(this.source)}|${mymemoryLang(this.target)}`,
      };
      if (contactEmail) params.de = contactEmail;
      const response = await axios.get(MYMEMORY_API_URL, { params, timeout: 10000 });
      const translated = response.data?.responseData?.translatedText;
      translatedChunks.push(translated || chunk);
    }
    return translatedChunks.join(' ');
  }

  async translate(text) {
    if (!text || !text.trim()) return text;

    try {
      const result = await this.translateWithCloudApi(text);
      if (result) return result;
    } catch (e) {
      console.warn('Google Cloud Translation API failed, falling back:', e.message);
    }

    try {
      const result = await this.translateWithOpenAI(text);
      if (result) return result;
    } catch (e) {
      console.warn('OpenAI API failed, falling back:', e.message);
    }

    try {
      const result = await this.translateWithFreeGoogle(text);
      if (result) return result;
    } catch (e) {
      console.warn('Google Translate (free) failed, falling back to MyMemory:', e.message);
    }

    try {
      return await this.translateWithMyMemory(text);
    } catch (e) {
      console.warn('MyMemory fallback also failed:', e.message);
      // فشلت كل الطبقات الأربع. رفع خطأ صريح بدل إرجاع النص الأصلي بصمت،
      // حتى لا يظهر للمستخدم وكأن الترجمة "نجحت" بينما لم تُترجم فعلياً.
      throw new Error('تعذّرت الترجمة مؤقتاً؛ خدمات الترجمة مشغولة حالياً. حاول مرة أخرى بعد قليل.');
    }
  }

  async translateBatch(texts) {
    const results = [];
    for (const t of texts) results.push(await this.translate(t));
    return results;
  }
}

module.exports = { ResilientTranslator, langName, mymemoryLang, chunkText };
