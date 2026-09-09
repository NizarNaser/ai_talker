"""
أدوات ترجمة الصور مع الحفاظ على نفس ستايل وتصميم الصورة الأصلية.

الفكرة: نستخرج مواقع أسطر النص عبر Tesseract OCR، نترجم كل سطر، ثم نمحو
النص الأصلي (بتلوين مكانه بلون الخلفية المحيطة به) ونعيد رسم النص المترجم
في نفس المكان بنفس الحجم التقريبي ولون قريب من لون النص الأصلي، بدلاً من
إرجاع نص عادي منفصل عن الصورة.
"""
import logging

import pytesseract
from PIL import ImageDraw, ImageFont

logger = logging.getLogger(__name__)

# خطوط Noto المثبتة على الخادم عبر حزم fonts-noto-core / fonts-noto-cjk.
# نختار الخط حسب السكربت (نوع الحروف) الفعلي للنص المرسوم وليس فقط حسب
# لغة الهدف، لأنه عند فشل الترجمة نرسم النص الأصلي كما هو (وقد يكون بسكربت
# مختلف تماماً)، وخط عربي مثلاً لا يملك أي حروف لاتينية فيرسمها بشكل مشوّه.
_LATIN_FONT = '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf'
_ARABIC_FONT = '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf'
_DEVANAGARI_FONT = '/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf'
_CJK_FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
_CJK_INDEX = {'ja': 0, 'ko': 1, 'zh-CN': 2, 'zh-TW': 3}

# أقصى عدد أسطر نعالجها في صورة واحدة لتفادي التعليق على الخوادم المجانية
MAX_LINES = 80


def _script_of_char(ch):
    cp = ord(ch)
    if 0x0600 <= cp <= 0x06FF or 0x0750 <= cp <= 0x08FF or 0xFB50 <= cp <= 0xFEFF:
        return 'arabic'
    if 0x0900 <= cp <= 0x097F:
        return 'devanagari'
    if 0x4E00 <= cp <= 0x9FFF or 0x3400 <= cp <= 0x4DBF or 0xF900 <= cp <= 0xFAFF:
        return 'han'
    if 0x3040 <= cp <= 0x30FF:
        return 'kana'
    if 0xAC00 <= cp <= 0xD7A3:
        return 'hangul'
    return None


def _detect_script(text):
    """يحدد سكربت النص من أول حرف مميز فيه (وليس من لغة الهدف المُعلنة)."""
    for ch in text:
        script = _script_of_char(ch)
        if script:
            return script
    return 'latin'


def _font_for_text(text, target_lang):
    """يرجع (مسار الخط، فهرس الخط، هل الاتجاه من اليمين لليسار) حسب سكربت النص الفعلي."""
    script = _detect_script(text)
    if script == 'arabic':
        return _ARABIC_FONT, 0, True
    if script == 'devanagari':
        return _DEVANAGARI_FONT, 0, False
    if script == 'han':
        return _CJK_FONT, _CJK_INDEX.get(target_lang, 2), False
    if script == 'kana':
        return _CJK_FONT, _CJK_INDEX['ja'], False
    if script == 'hangul':
        return _CJK_FONT, _CJK_INDEX['ko'], False
    return _LATIN_FONT, 0, False


def _load_font(text, target_lang, size):
    path, index, is_rtl = _font_for_text(text, target_lang)
    try:
        return ImageFont.truetype(path, size=max(size, 8), index=index), is_rtl
    except Exception:
        return ImageFont.load_default(), is_rtl


def _shape_for_display(text, is_rtl):
    """يشكّل النص العربي (ربط الحروف واتجاه الكتابة) ليظهر بشكل صحيح عند الرسم."""
    if not is_rtl:
        return text
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text


def _luminance(rgb):
    r, g, b = rgb
    return 0.299 * r + 0.587 * g + 0.114 * b


def _pick_background_and_text_colors(image, box):
    """يقدّر لون خلفية المنطقة ولون النص الأصلي بناءً على الألوان السائدة فيها."""
    crop = image.crop(box)
    colors = crop.getcolors(maxcolors=max(crop.width * crop.height, 1))
    if not colors:
        return (255, 255, 255), (0, 0, 0)

    colors.sort(key=lambda c: c[0], reverse=True)
    dominant = [c[1][:3] for c in colors[:6]]
    background = dominant[0]
    bg_lum = _luminance(background)

    text_color, best_diff = None, 0
    for color in dominant[1:]:
        diff = abs(_luminance(color) - bg_lum)
        if diff > best_diff:
            best_diff, text_color = diff, color

    if text_color is None or best_diff < 40:
        text_color = (0, 0, 0) if bg_lum > 128 else (255, 255, 255)

    return background, text_color


def _group_words_into_lines(ocr_data):
    """يجمّع كلمات OCR إلى أسطر (بحسب block/paragraph/line) مع حساب صندوق كل سطر."""
    groups = {}
    order = []
    for i in range(len(ocr_data['text'])):
        text = ocr_data['text'][i].strip()
        if not text:
            continue
        try:
            conf = float(ocr_data['conf'][i])
        except (TypeError, ValueError):
            conf = -1
        if conf < 0:
            continue

        key = (ocr_data['block_num'][i], ocr_data['par_num'][i], ocr_data['line_num'][i])
        left, top = ocr_data['left'][i], ocr_data['top'][i]
        right, bottom = left + ocr_data['width'][i], top + ocr_data['height'][i]

        if key not in groups:
            groups[key] = {'words': [], 'left': left, 'top': top, 'right': right, 'bottom': bottom}
            order.append(key)

        g = groups[key]
        g['words'].append(text)
        g['left'] = min(g['left'], left)
        g['top'] = min(g['top'], top)
        g['right'] = max(g['right'], right)
        g['bottom'] = max(g['bottom'], bottom)

    return [
        {'text': ' '.join(groups[key]['words']),
         'box': (groups[key]['left'], groups[key]['top'], groups[key]['right'], groups[key]['bottom'])}
        for key in order
    ]


def _fit_font(draw, text, target_lang, max_width, max_height):
    size = max(int(max_height * 0.8), 8)
    font, is_rtl = _load_font(text, target_lang, size)
    while size > 8:
        bbox = draw.textbbox((0, 0), text, font=font)
        if (bbox[2] - bbox[0]) <= max_width and (bbox[3] - bbox[1]) <= max_height:
            break
        size -= 1
        font, is_rtl = _load_font(text, target_lang, size)
    return font, is_rtl


def _translate_lines(texts, translator):
    """
    يترجم كل أسطر الصورة بطلب شبكة واحد (بدمجها بفاصل أسطر) بدلاً من طلب
    منفصل لكل سطر، لأن ذلك أسرع بكثير على الصور الكثيفة (مستند فيه عشرات
    الأسطر) ويقلل احتمال تجاوز مهلة المعالجة على الخوادم المجانية.
    يعود للترجمة سطراً بسطر فقط إذا فشل الدمج (مثلاً لو غيّر المترجم عدد الأسطر).
    """
    if not texts:
        return []

    delimiter = '\n'
    try:
        joined = translator.translate(delimiter.join(texts))
        if joined:
            parts = joined.split(delimiter)
            if len(parts) == len(texts):
                return parts
    except Exception:
        pass

    translations = []
    for t in texts:
        try:
            translations.append(translator.translate(t) or t)
        except Exception:
            translations.append(t)
    return translations


def translate_image_preserving_style(image, tesseract_lang, target_lang, translator):
    """
    يستخرج نص الصورة عبر OCR، يترجمه سطراً بسطر، ثم يعيد رسم الترجمة في نفس
    أماكن النص الأصلي بنفس الألوان التقريبية، للحفاظ على شكل الصورة الأصلي.

    يرجع (original_text, translated_text, stylized_image) حيث stylized_image
    هو كائن PIL.Image جديد، أو None إذا لم يُعثر على أي نص في الصورة.
    """
    ocr_data = pytesseract.image_to_data(image, lang=tesseract_lang, output_type=pytesseract.Output.DICT)
    lines = _group_words_into_lines(ocr_data)[:MAX_LINES]
    if not lines:
        return '', '', None

    texts = [line['text'] for line in lines]
    translations = _translate_lines(texts, translator)

    if len(translations) != len(texts):
        translations = (list(translations) + texts)[:len(texts)]

    result_image = image.convert('RGB').copy()
    draw = ImageDraw.Draw(result_image)

    for line, translated in zip(lines, translations):
        translated = translated or line['text']
        left, top, right, bottom = line['box']
        pad = 2
        box = (
            max(left - pad, 0), max(top - pad, 0),
            min(right + pad, image.width), min(bottom + pad, image.height),
        )
        background, text_color = _pick_background_and_text_colors(image, box)
        draw.rectangle(box, fill=background)

        box_w, box_h = box[2] - box[0], box[3] - box[1]
        font, is_rtl = _fit_font(draw, translated, target_lang, box_w, box_h)
        display_text = _shape_for_display(translated, is_rtl)
        text_bbox = draw.textbbox((0, 0), display_text, font=font)
        text_w, text_h = text_bbox[2] - text_bbox[0], text_bbox[3] - text_bbox[1]

        x = (box[2] - text_w) if is_rtl else box[0]
        y = box[1] + max((box_h - text_h) // 2, 0)
        draw.text((x, y), display_text, font=font, fill=text_color)

    return '\n'.join(texts), '\n'.join(translations), result_image
