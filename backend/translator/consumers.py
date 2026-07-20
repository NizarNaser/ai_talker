"""
ملف الـ Consumers لمعالجة اتصالات WebSocket الخاصة بالترجمة الفورية.
هنا يتم استقبال النص/الصوت، إرساله لنموذج الذكاء الاصطناعي، وإرجاع النتيجة.
"""
import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer

class TranslationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """عند اتصال العميل بالـ WebSocket"""
        await self.accept()
        await self.send(text_data=json.dumps({
            'status': 'connected',
            'message': 'تم الاتصال بخادم الترجمة الفورية بنجاح.'
        }))

    async def disconnect(self, close_code):
        """عند انقطاع الاتصال"""
        pass

    async def receive(self, text_data):
        """استقبال البيانات من العميل (النص أو إشارات الصوت)"""
        try:
            data = json.loads(text_data)
            source_lang = data.get('source_lang', 'ar')
            target_lang = data.get('target_lang', 'en')
            text = data.get('text', '')
            mode = data.get('mode', 'replace') # استقبال النمط (استبدال أم إضافة)

            # تم الاستبدال واستخدام deep-translator للقيام بترجمة حقيقية مجانية
            from deep_translator import GoogleTranslator
            
            def map_lang(lang):
                if not lang: return 'auto'
                lang_lower = str(lang).strip().lower()
                if lang_lower in ['zh', 'zh-cn', 'chinese', 'chinese (simplified)', 'zh-hans']:
                    return 'zh-CN'
                if lang_lower in ['zh-tw', 'chinese (traditional)', 'zh-hant']:
                    return 'zh-TW'
                if lang_lower.startswith('ar-'):
                    return 'ar'
                return str(lang).strip()

            src_lang = map_lang(source_lang)
            tgt_lang = map_lang(target_lang)
            
            # Fallback for unexpected cases where it might still be 'zh'
            if src_lang == 'zh': src_lang = 'zh-CN'
            if tgt_lang == 'zh': tgt_lang = 'zh-CN'

            def perform_translation():
                try:
                    res_text = GoogleTranslator(source=src_lang, target=tgt_lang).translate(text)
                    audio_b64 = ""
                    try:
                        from gtts import gTTS
                        import base64
                        import io
                        tts_lang = tgt_lang
                        # gTTS supports zh-CN and zh-TW directly
                        if tgt_lang == 'zh': tts_lang = 'zh-CN'
                        tts = gTTS(text=res_text, lang=tts_lang)
                        fp = io.BytesIO()
                        tts.write_to_fp(fp)
                        fp.seek(0)
                        audio_b64 = base64.b64encode(fp.read()).decode('utf-8')
                    except Exception as tts_e:
                        print(f"TTS Error: {tts_e}")
                    
                    return res_text, audio_b64
                except Exception as e:
                    return f"خطأ في الترجمة: {str(e)}", ""
            
            translated_text, audio_b64 = await asyncio.to_thread(perform_translation)

            await self.send(text_data=json.dumps({
                'original': text,
                'translated': translated_text,
                'audio_base64': audio_b64,
                'source_lang': source_lang,
                'target_lang': target_lang,
                'mode': mode,
                'status': 'success'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'status': 'error',
                'message': str(e)
            }))
