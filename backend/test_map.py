def map_lang(lang):
    if not lang: return 'auto'
    lang_lower = lang.strip().lower()
    if lang_lower in ['zh', 'zh-cn', 'chinese', 'chinese (simplified)']:
        return 'zh-CN'
    if lang_lower in ['zh-tw', 'chinese (traditional)']:
        return 'zh-TW'
    if lang_lower.startswith('ar-'):
        return 'ar'
    return lang

print(map_lang("zh"))
