"""
طبقة ترجمة موحّدة تُستخدم في كل أنحاء المشروع (الترجمة الفورية، ترجمة
الملفات والصور). ثلاث طبقات بالترتيب: Google Cloud Translation API الرسمي
والمدفوع (إن كان مفتاحه مضبوطاً؛ موثوق وبلا حدود استخدام مجانية مشتركة)،
ثم GoogleTranslator المجاني (استخراج بيانات من صفحة الترجمة العامة، عرضة
للحظر/التقييد)، ثم MyMemory كخدمة مجانية أخيرة بديلة، بدل أن تتعطل
الترجمة بالكامل عند فشل أي طبقة.
"""
import logging

import requests
from django.conf import settings
from deep_translator import GoogleTranslator, MyMemoryTranslator

logger = logging.getLogger(__name__)

_CLOUD_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2'

# MyMemory تتطلب رموز لغة بصيغة locale (مثل ar-SA) بخلاف Google الذي يقبل
# رموزاً مبسطة (ar). هذا الجدول يحوّل رموز المشروع البسيطة لما تفهمه MyMemory.
_MYMEMORY_LANG_MAP = {
    'auto': 'auto',
    'ar': 'ar-SA', 'ar-eg': 'ar-EG', 'ar-sa': 'ar-SA',
    'en': 'en-GB', 'fr': 'fr-FR', 'es': 'es-ES', 'de': 'de-DE', 'tr': 'tr-TR',
    'ru': 'ru-RU', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'ja': 'ja-JP',
    'ko': 'ko-KR', 'hi': 'hi-IN', 'it': 'it-IT', 'pt': 'pt-PT', 'pt-BR': 'pt-BR',
    'nl': 'nl-NL', 'sv': 'sv-SE', 'fa': 'fa-IR', 'ur': 'ur-PK',
}

# الحد الأقصى لطول النص المسموح به في طلب واحد لخدمة MyMemory هو 500 حرف
_MYMEMORY_MAX_CHARS = 480


def _mymemory_lang(lang):
    return _MYMEMORY_LANG_MAP.get(lang, lang)


def _chunk_text(text, max_len):
    """يقسّم النص إلى أجزاء لا تتجاوز الطول الأقصى، مع تفضيل القطع عند الفراغات."""
    if len(text) <= max_len:
        return [text]
    chunks = []
    remaining = text
    while len(remaining) > max_len:
        cut = remaining.rfind(' ', 0, max_len)
        if cut <= 0:
            cut = max_len
        chunks.append(remaining[:cut])
        remaining = remaining[cut:].lstrip()
    if remaining:
        chunks.append(remaining)
    return chunks


class ResilientTranslator:
    """
    مترجم يحاول Google Translate أولاً، وعند فشله ينتقل تلقائياً لخدمة
    MyMemory المجانية البديلة، حتى تستمر الترجمة في العمل دون توقف كامل
    عند تعطل أو حظر Google بشكل مؤقت.
    """

    def __init__(self, source='auto', target='en'):
        self.source = source
        self.target = target
        self._google = GoogleTranslator(source=source, target=target)
        self._mymemory = None

    def _get_mymemory(self):
        if self._mymemory is None:
            contact_email = getattr(settings, 'MYMEMORY_CONTACT_EMAIL', '')
            kwargs = {'email': contact_email} if contact_email else {}
            self._mymemory = MyMemoryTranslator(
                source=_mymemory_lang(self.source), target=_mymemory_lang(self.target), **kwargs
            )
        return self._mymemory

    def _translate_with_mymemory(self, text):
        mm = self._get_mymemory()
        chunks = _chunk_text(text, _MYMEMORY_MAX_CHARS)
        translated_chunks = [mm.translate(chunk) or chunk for chunk in chunks]
        return ' '.join(translated_chunks)

    def _translate_with_cloud_api(self, text):
        api_key = getattr(settings, 'GOOGLE_TRANSLATE_API_KEY', '')
        if not api_key:
            return None
        payload = {'q': text, 'target': self.target, 'format': 'text'}
        if self.source and self.source != 'auto':
            payload['source'] = self.source
        response = requests.post(
            _CLOUD_TRANSLATE_API_URL, params={'key': api_key}, data=payload, timeout=10
        )
        response.raise_for_status()
        return response.json()['data']['translations'][0]['translatedText']

    def translate(self, text):
        if not text or not text.strip():
            return text

        # الطبقة الأولى: Google Cloud Translation API الرسمي (مدفوع)، إن كان
        # مفتاحه مضبوطاً. أكثر موثوقية من الخدمتين المجانيتين تحته لأنه غير
        # عرضة لتقييد/حظر الاستخدام المشترك على IP خوادم Render.
        try:
            result = self._translate_with_cloud_api(text)
            if result:
                return result
        except Exception as e:
            logger.warning('Google Cloud Translation API failed, falling back: %s', e)

        try:
            result = self._google.translate(text)
            if result:
                return result
        except Exception as e:
            logger.warning('Google Translate (free) failed, falling back to MyMemory: %s', e)

        try:
            return self._translate_with_mymemory(text)
        except Exception as e:
            logger.warning('MyMemory fallback also failed: %s', e)
            # فشلت كل الطبقات الثلاث (أو الطبقتين المجانيتين إن لم يُضبط مفتاح
            # Cloud API). سابقاً كان الكود يُرجع النص الأصلي بصمت هنا، فيظهر
            # للمستخدم وكأن الترجمة "نجحت" بينما لم تُترجم الكلمة فعلياً. رفع
            # استثناء يجعل الفشل مرئياً بدل إخفائه.
            raise RuntimeError(
                'تعذّرت الترجمة مؤقتاً؛ خدمات الترجمة مشغولة حالياً. حاول مرة أخرى بعد قليل.'
            ) from e

    def translate_batch(self, texts):
        return [self.translate(t) for t in texts]
