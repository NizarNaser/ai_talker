"""
طبقة ترجمة موحّدة تُستخدم في كل أنحاء المشروع (الترجمة الفورية، ترجمة
الملفات والصور). تعتمد على Google Translate أساساً، وإن فشل (تعطل مؤقت،
حظر/تقييد على الخادم، عدم توفره لأي سبب) تنتقل تلقائياً إلى MyMemory
كخدمة ترجمة مجانية بديلة، بدل أن تتعطل الترجمة بالكامل.
"""
import logging

from django.conf import settings
from deep_translator import GoogleTranslator, MyMemoryTranslator

logger = logging.getLogger(__name__)

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

    def translate(self, text):
        if not text or not text.strip():
            return text
        try:
            result = self._google.translate(text)
            if result:
                return result
        except Exception as e:
            logger.warning('Google Translate failed, falling back to MyMemory: %s', e)

        try:
            return self._translate_with_mymemory(text)
        except Exception as e:
            logger.warning('MyMemory fallback also failed: %s', e)
            # كلا خدمتي الترجمة المجانيتين فشلتا (على الأغلب حظر/تقييد مؤقت
            # على IP الخادم). سابقاً كان الكود يُرجع النص الأصلي بصمت هنا،
            # فيظهر للمستخدم وكأن الترجمة "نجحت" بينما لم تُترجم الكلمة فعلياً.
            # رفع استثناء يجعل الفشل مرئياً بدل إخفائه.
            raise RuntimeError(
                'تعذّرت الترجمة مؤقتاً؛ خدمات الترجمة المجانية مشغولة حالياً. حاول مرة أخرى بعد قليل.'
            ) from e

    def translate_batch(self, texts):
        return [self.translate(t) for t in texts]
