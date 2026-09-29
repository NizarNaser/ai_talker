const express = require('express');
const { ResilientTranslator } = require('../services/translateService');
const { textToSpeechBase64 } = require('../services/ttsService');
const { scopedLimiter } = require('../middleware/rateLimit');

const router = express.Router();

function mapLang(lang) {
  if (!lang) return 'auto';
  const lower = String(lang).trim().toLowerCase();
  if (['zh', 'zh-cn', 'chinese', 'chinese (simplified)', 'zh-hans', 'zh-chs'].includes(lower)) return 'zh-CN';
  if (['zh-tw', 'chinese (traditional)', 'zh-hant', 'zh-cht'].includes(lower)) return 'zh-TW';
  if (lower.startsWith('ar-') || lower === 'ar') return 'ar';
  if (['pt-br', 'pt_br', 'portuguese (brazil)'].includes(lower)) return 'pt-BR';
  if (['pt-pt', 'pt_pt', 'portuguese (portugal)'].includes(lower)) return 'pt';
  return String(lang).trim().replace(/_/g, '-');
}

router.post('/', scopedLimiter('stt'), async (req, res) => {
  const { source_lang: sourceLang = 'ar', target_lang: targetLang = 'en', text = '', mode = 'replace' } = req.body || {};

  let srcLang = mapLang(sourceLang);
  let tgtLang = mapLang(targetLang);
  if (srcLang === 'zh') srcLang = 'zh-CN';
  if (tgtLang === 'zh') tgtLang = 'zh-CN';

  let translatedText;
  try {
    translatedText = await new ResilientTranslator(srcLang, tgtLang).translate(text);
  } catch (e) {
    return res.json({
      original: text,
      source_lang: sourceLang,
      target_lang: targetLang,
      mode,
      status: 'error',
      message: e.message,
    });
  }

  let audioB64 = '';
  try {
    const ttsLang = tgtLang === 'zh' ? 'zh-CN' : tgtLang;
    audioB64 = await textToSpeechBase64(translatedText, ttsLang);
  } catch (e) {
    console.warn('TTS Error:', e.message);
  }

  res.json({
    original: text,
    translated: translatedText,
    audio_base64: audioB64,
    source_lang: sourceLang,
    target_lang: targetLang,
    mode,
    status: 'success',
  });
});

module.exports = router;
