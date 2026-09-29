/**
 * تحويل نص إلى صوت (MP3) عبر واجهة Google Translate TTS غير الرسمية (نفس ما
 * تستخدمه مكتبة gTTS في بايثون داخلياً)، بلا حاجة لمفتاح API. تُقسَّم النصوص
 * الطويلة لأجزاء ≤200 حرف (حدّ الواجهة) ثم تُدمَج أجزاء الصوت الناتجة.
 */
const axios = require('axios');

const TTS_URL = 'https://translate.google.com/translate_tts';
const MAX_CHARS = 200;

function chunkForTts(text, maxLen) {
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

async function textToSpeechBase64(text, lang) {
  const chunks = chunkForTts(text, MAX_CHARS);
  const buffers = [];
  for (const chunk of chunks) {
    const response = await axios.get(TTS_URL, {
      params: { ie: 'UTF-8', q: chunk, tl: lang, client: 'tw-ob' },
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AiTalkerServer/1.0)' },
    });
    buffers.push(Buffer.from(response.data));
  }
  return Buffer.concat(buffers).toString('base64');
}

module.exports = { textToSpeechBase64 };
