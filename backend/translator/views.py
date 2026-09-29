"""
ملف واجهات برمجة التطبيقات (Views).
يحتوي على:
1. جلب وإنشاء الترجمات.
2. جلب وإضافة التعليقات.
3. الإعجاب بالموقع.
4. تسجيل الدخول باستخدام Google.
"""
from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from .models import User, Translation, SiteLike, Comment
from .serializers import TranslationSerializer, CommentSerializer
import logging
import requests

class TranslationViewSet(viewsets.ModelViewSet):
    """واجهة لإدارة الترجمات الخاصة بالمستخدم"""
    serializer_class = TranslationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Translation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CommentViewSet(viewsets.ModelViewSet):
    """واجهة لعرض وإضافة التعليقات"""
    serializer_class = CommentSerializer
    
    def get_permissions(self):
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        return Comment.objects.filter(is_approved=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SiteLikeView(views.APIView):
    """واجهة للتعامل مع الإعجابات بالموقع"""
    permission_classes = [AllowAny]

    def get(self, request):
        like_obj, created = SiteLike.objects.get_or_create(id=1)
        return Response({'total_likes': like_obj.total_likes})

    def post(self, request):
        like_obj, created = SiteLike.objects.get_or_create(id=1)
        like_obj.total_likes += 1
        like_obj.save()
        return Response({'total_likes': like_obj.total_likes, 'message': 'تم إضافة الإعجاب بنجاح.'})


class GoogleLoginView(views.APIView):
    """واجهة تسجيل الدخول عبر Google: تتحقق من ID token الصادر عن Google Identity
    Services، ثم تنشئ (أو تجلب) المستخدم المرتبط بالبريد وتصدر له توكن JWT."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        from django.conf import settings

        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
        if not client_id:
            return Response(
                {'error': 'تسجيل الدخول عبر Google غير مُفعّل على الخادم بعد.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        token = request.data.get('token')
        if not token:
            return Response({'error': 'لم يتم إرسال رمز الدخول (token).'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests
            from rest_framework_simplejwt.tokens import RefreshToken

            idinfo = google_id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
            email = idinfo.get('email')
            if not email:
                return Response({'error': 'تعذّر الحصول على البريد الإلكتروني من حساب Google.'}, status=status.HTTP_400_BAD_REQUEST)

            user, _ = User.objects.get_or_create(username=email, defaults={'email': email})
            refresh = RefreshToken.for_user(user)

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'email': email,
                'message': 'تم تسجيل الدخول عبر Google بنجاح.',
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            logging.getLogger(__name__).warning('Invalid Google token: %s', e)
            return Response({'error': 'رمز الدخول عبر Google غير صالح أو منتهي الصلاحية.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logging.getLogger(__name__).error('Google login error: %s', e)
            return Response({'error': 'حدث خطأ أثناء التحقق من حساب Google.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RegisterView(views.APIView):
    """واجهة لتسجيل مستخدم جديد"""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'البريد الإلكتروني وكلمة المرور مطلوبان'}, status=status.HTTP_400_BAD_REQUEST)
        
        # We will use email as username
        if User.objects.filter(username=email).exists():
            # If user exists, we don't return error, we assume they want to login later.
            return Response({'error': 'المستخدم موجود مسبقاً'}, status=status.HTTP_400_BAD_REQUEST)
            
        User.objects.create_user(username=email, email=email, password=password)
        return Response({'message': 'تم إنشاء الحساب بنجاح'}, status=status.HTTP_201_CREATED)

class ContactView(views.APIView):
    """واجهة لإرسال رسائل تواصل معنا عبر البريد الإلكتروني"""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contact'

    def post(self, request):
        from django.conf import settings
        from django.core.mail import EmailMessage
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError

        email = request.data.get('email')
        message = request.data.get('message')

        if not email or not message:
            return Response({'error': 'البريد والرسالة مطلوبان'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_email(email)
        except ValidationError:
            return Response({'error': 'صيغة البريد الإلكتروني غير صحيحة.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # from_email يجب أن يكون حساب SMTP نفسه (لا يمكن الإرسال باسم بريد الزائر)،
            # ونضع بريد الزائر في reply_to حتى يصل الرد إليه مباشرة عند الضغط على "رد".
            EmailMessage(
                subject=f"رسالة تواصل من: {email}",
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[settings.CONTACT_EMAIL],
                reply_to=[email],
            ).send(fail_silently=False)
            return Response({'message': 'تم إرسال رسالتك بنجاح. شكراً لتواصلك معنا!'}, status=status.HTTP_200_OK)
        except Exception as e:
            logging.getLogger(__name__).error('Contact form email error: %s', e)
            return Response({'error': 'حدث خطأ أثناء إرسال الرسالة.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class FileUploadTranslateView(views.APIView):
    """واجهة لرفع ملف أو صورة، استخراج النص، وترجمته مع الحفاظ على التنسيق للمستندات والستايل للصور"""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'upload'

    def post(self, request):
        logger = logging.getLogger(__name__)
        logger.info('📥 Received file upload request from %s', request.META.get('REMOTE_ADDR'))
        file_obj = request.FILES.get('file')
        target_lang = request.data.get('target_lang', 'ar')
        source_lang = request.data.get('source_lang', 'auto')

        if not file_obj:
            return Response({'error': 'لم يتم العثور على ملف في الطلب.'}, status=status.HTTP_400_BAD_REQUEST)

        # Preliminary checks
        logger.info('📎 File: %s, Size: %s bytes', file_obj.name, file_obj.size)
        max_file_size = 5 * 1024 * 1024  # 5 MiB
        if file_obj.size > max_file_size:
            logger.warning('File size %s exceeds limit %s', file_obj.size, max_file_size)
            return Response({'error': 'حجم الملف كبير جداً. أقصى حجم مسموح هو 8 MiB.'}, status=status.HTTP_400_BAD_REQUEST)

        extracted_text = ""
        translated_text = ""
        translated_file_base64 = None
        translated_file_format = None
        file_name = file_obj.name.lower()
        file_bytes = file_obj.read()
        # Track processing time to avoid long hangs
        import time
        processing_start = time.time()
        max_processing_seconds = 120  # تمت الزيادة إلى 120 ثانية لأن الـ OCR والترجمة قد يستغرقان وقتاً على الخوادم المجانية

        def check_timeout():
            if time.time() - processing_start > max_processing_seconds:
                raise TimeoutError(f'Processing time exceeded {max_processing_seconds} seconds')


        try:
            # Setup Translator
            from .translate_utils import ResilientTranslator

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

            safe_source = map_lang(source_lang)
            safe_target = map_lang(target_lang)
            if safe_source == 'zh': safe_source = 'zh-CN'
            if safe_target == 'zh': safe_target = 'zh-CN'

            translator = ResilientTranslator(source=safe_source, target=safe_target)

            def process_docx(bytes_data):
                import docx
                import io
                import base64
                doc = docx.Document(io.BytesIO(bytes_data))
                full_original = []
                full_translated = []

                # Helper to translate safely
                def translate_text(text):
                    if not text.strip(): return text
                    try:
                        res = translator.translate(text)
                        return res if res else text
                    except Exception:
                        return text

                for p in doc.paragraphs:
                    if p.text.strip():
                        original = p.text
                        full_original.append(original)
                        trans = translate_text(original)
                        full_translated.append(trans)
                        p.text = trans

                for table in doc.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            for p in cell.paragraphs:
                                if p.text.strip():
                                    original = p.text
                                    full_original.append(original)
                                    trans = translate_text(original)
                                    full_translated.append(trans)
                                    p.text = trans

                output = io.BytesIO()
                doc.save(output)
                return "\n".join(full_original), "\n".join(full_translated), base64.b64encode(output.getvalue()).decode('utf-8')

            # Process Document Types
            if file_name.endswith('.docx'):
                try:
                    extracted_text, translated_text, translated_file_base64 = process_docx(file_bytes)
                    translated_file_format = 'docx'
                    check_timeout()
                except Exception as e:
                    return Response({'error': f'حدث خطأ أثناء معالجة ملف Word: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            elif file_name.endswith('.pdf'):
                try:
                    import tempfile
                    import os
                    from pdf2docx import Converter

                    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_file:
                        pdf_file.write(file_bytes)
                        pdf_path = pdf_file.name

                    docx_path = pdf_path + '.docx'
                    try:
                        cv = Converter(pdf_path)
                        cv.convert(docx_path, start=0, end=None)
                        cv.close()

                        with open(docx_path, 'rb') as f:
                            docx_bytes = f.read()

                        extracted_text, translated_text, translated_file_base64 = process_docx(docx_bytes)
                        translated_file_format = 'docx' # Returns a docx
                        check_timeout()
                    finally:
                        if os.path.exists(pdf_path): os.remove(pdf_path)
                        if os.path.exists(docx_path): os.remove(docx_path)
                except ImportError:
                    return Response({'error': 'مكتبات تحويل PDF غير مثبتة في الخادم (pdf2docx).'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                except Exception as e:
                    return Response({'error': f'حدث خطأ أثناء معالجة ملف PDF: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            elif file_name.endswith(('.png', '.jpg', '.jpeg', '.webp')):
                try:
                    from PIL import Image
                    import io
                    import base64
                    from django.conf import settings as _settings
                    from .image_style import translate_image_preserving_style

                    vision_api_key = getattr(_settings, 'GOOGLE_TRANSLATE_API_KEY', '')
                    if not vision_api_key:
                        return Response(
                            {'error': 'خدمة استخراج نص الصور (Google Cloud Vision) غير مضبوطة على الخادم.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE
                        )

                    image = Image.open(io.BytesIO(file_bytes)).convert('RGB')
                    file_bytes = None  # تحرير الذاكرة فوراً

                    # تصغير الصورة لتوفير الذاكرة ولتقليل حجم الطلب المرسل لـ Vision API
                    max_dim = 1600
                    w, h = image.size
                    if w > max_dim or h > max_dim:
                        ratio = min(max_dim / w, max_dim / h)
                        image = image.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
                        logger.info('🖼️ Resized image from %dx%d to %dx%d', w, h, int(w*ratio), int(h*ratio))

                    # تحويل رمز اللغة إلى صيغة Vision API (BCP-47 مبسّط)
                    vision_lang_map = {
                        'ar': 'ar', 'en': 'en', 'fr': 'fr', 'es': 'es',
                        'de': 'de', 'ru': 'ru', 'zh-CN': 'zh', 'zh-TW': 'zh-Hant',
                        'ja': 'ja', 'ko': 'ko', 'it': 'it', 'pt': 'pt',
                        'nl': 'nl', 'sv': 'sv', 'tr': 'tr', 'hi': 'hi',
                    }
                    lang_hints = [vision_lang_map[safe_source]] if safe_source in vision_lang_map else None

                    resized_buf = io.BytesIO()
                    image.save(resized_buf, format='PNG')
                    image_bytes_for_vision = resized_buf.getvalue()

                    # استخراج النص وترجمته مع إعادة رسمه على نفس مكانه في الصورة
                    # للحفاظ على شكل وستايل الصورة الأصلية (بدلاً من نص منفصل فقط)
                    extracted_text, translated_text, stylized_image = translate_image_preserving_style(
                        image, image_bytes_for_vision, lang_hints, safe_target, translator, vision_api_key
                    )
                    del image

                    if not extracted_text:
                        return Response({'error': 'لم يتم العثور على نص في الصورة. تأكد أن الصورة واضحة وتحتوي على نص مقروء.'}, status=status.HTTP_400_BAD_REQUEST)

                    if stylized_image is not None:
                        buf = io.BytesIO()
                        stylized_image.save(buf, format='PNG')
                        translated_file_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
                        translated_file_format = 'png'

                    check_timeout()

                except Exception as e:
                    logger.error('OCR error: %s', str(e))
                    return Response({'error': f'خطأ في معالجة الصورة: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            else:
                # For unsupported file types: save the file to the configured storage
                # (Cloudinary or local MEDIA storage) and return a download URL so the
                # frontend can still upload arbitrary files even if we don't process them.
                try:
                    from django.core.files.base import ContentFile
                    from django.core.files.storage import default_storage
                    import os
                    import uuid

                    uploads_dir = 'uploads'
                    base_name = file_obj.name
                    save_path = os.path.join(uploads_dir, base_name)
                    # ensure unique path
                    if default_storage.exists(save_path):
                        name, ext = os.path.splitext(base_name)
                        save_path = os.path.join(uploads_dir, f"{name}_{uuid.uuid4().hex}{ext}")

                    default_storage.save(save_path, ContentFile(file_bytes))
                    file_url = default_storage.url(save_path)

                    return Response({
                        'message': 'تم رفع الملف بنجاح (نوع غير مدعوم للمعالجة).',
                        'file_url': file_url,
                    }, status=status.HTTP_200_OK)
                except Exception as e:
                    return Response({'error': f'فشل رفع الملف: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                'original_text': extracted_text,
                'translated_text': translated_text,
                'translated_file_base64': translated_file_base64,
                'translated_file_format': translated_file_format,
                'message': 'تم استخراج وترجمة النص بنجاح'
            }, status=status.HTTP_200_OK)

        except TimeoutError as te:
            logger.warning('Processing timeout: %s', str(te))
            return Response({'error': 'انتهت مهلة معالجة الملف. يرجى رفع ملف أصغر أو تجربة مرة أخرى.'}, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except Exception as e:
            return Response({'error': f'حدث خطأ غير متوقع: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SpeechToTextView(views.APIView):
    """واجهة لتحويل تسجيل صوتي إلى نص عبر الخادم.

    تُستخدم كبديل لتعرّف الكلام المدمج في المتصفح (Web Speech API)، الذي لا يعمل
    على أجهزة هواوي وأي جهاز أندرويد بدون خدمات جوجل (GMS): محرك التعرف الصوتي في
    أندرويد يعتمد على تطبيق Google نفسه على الجهاز، بينما هذه الواجهة تستقبل الصوت
    فقط (getUserMedia يعمل على كل الأجهزة) وتقوم الخادم بطلب التفريغ النصي، فلا
    علاقة للأمر بوجود خدمات جوجل على جهاز المستخدم."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'stt'

    def post(self, request):
        from django.conf import settings

        logger = logging.getLogger(__name__)
        audio_file = request.FILES.get('audio')
        language = request.data.get('language') or 'ar-SA'

        if not audio_file:
            return Response({'error': 'لم يتم إرسال تسجيل صوتي.'}, status=status.HTTP_400_BAD_REQUEST)

        max_audio_size = 8 * 1024 * 1024  # 8 MiB
        if audio_file.size > max_audio_size:
            return Response({'error': 'حجم التسجيل الصوتي كبير جداً.'}, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(settings, 'OPENAI_API_KEY', '')
        if not api_key:
            return Response({'error': 'خدمة التعرف الصوتي غير مضبوطة على الخادم.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            response = requests.post(
                'https://api.openai.com/v1/audio/transcriptions',
                headers={'Authorization': f'Bearer {api_key}'},
                # OpenAI Whisper يقبل ملف الصوت مباشرة (webm/ogg/mp3/wav...) دون
                # أي تحويل محلي، فلا حاجة لـ ffmpeg هنا كما كان الحال سابقاً.
                files={'file': (audio_file.name or 'audio.webm', audio_file.read(), audio_file.content_type or 'application/octet-stream')},
                data={
                    'model': 'whisper-1',
                    'language': (language or 'ar').split('-')[0],
                },
                timeout=30,
            )
            response.raise_for_status()
            text = (response.json().get('text') or '').strip()
            if not text:
                return Response({'error': 'لم يتم التعرف على أي كلام في التسجيل. حاول التحدث بوضوح أكبر.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'text': text}, status=status.HTTP_200_OK)
        except requests.HTTPError as e:
            logger.error('STT service error: %s', str(e))
            return Response({'error': 'تعذّر الوصول لخدمة التعرف الصوتي حالياً. حاول لاحقاً.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error('STT error: %s', str(e))
            return Response({'error': f'حدث خطأ أثناء تحويل الصوت إلى نص: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LiveTranslateView(views.APIView):
    """واجهة الترجمة الفورية (نص لنص + صوت الناتج)، بديل HTTP لاتصال WebSocket
    السابق (translator/consumers.py، الذي أُزيل مع إزالة Channels/Daphne لأن
    الاستضافة المشتركة لا تدعم اتصالات WebSocket الدائمة). كل تبادل هو رسالة
    واحدة مستقلة أصلاً (لا بث صوتي متواصل)، فتحويلها لطلب HTTP عادي لا يفقد
    أي وظيفة."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'stt'

    def post(self, request):
        source_lang = request.data.get('source_lang', 'ar')
        target_lang = request.data.get('target_lang', 'en')
        text = request.data.get('text', '')
        mode = request.data.get('mode', 'replace')

        from .translate_utils import ResilientTranslator

        def map_lang(lang):
            """تحويل رموز اللغات المختلفة إلى رموز مدعومة من المترجم"""
            if not lang:
                return 'auto'
            lang_lower = str(lang).strip().lower()

            if lang_lower in ['zh', 'zh-cn', 'chinese', 'chinese (simplified)', 'zh-hans', 'zh-chs']:
                return 'zh-CN'
            if lang_lower in ['zh-tw', 'chinese (traditional)', 'zh-hant', 'zh-cht']:
                return 'zh-TW'
            if lang_lower.startswith('ar-') or lang_lower == 'ar':
                return 'ar'
            if lang_lower in ['pt-br', 'pt_br', 'portuguese (brazil)']:
                return 'pt-BR'
            if lang_lower in ['pt-pt', 'pt_pt', 'portuguese (portugal)']:
                return 'pt'
            return str(lang).strip().replace('_', '-')

        src_lang = map_lang(source_lang)
        tgt_lang = map_lang(target_lang)
        if src_lang == 'zh':
            src_lang = 'zh-CN'
        if tgt_lang == 'zh':
            tgt_lang = 'zh-CN'

        try:
            translated_text = ResilientTranslator(source=src_lang, target=tgt_lang).translate(text)
        except Exception as e:
            return Response({
                'original': text,
                'source_lang': source_lang,
                'target_lang': target_lang,
                'mode': mode,
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_200_OK)

        audio_b64 = ""
        try:
            from gtts import gTTS
            import base64
            import io
            tts_lang = tgt_lang
            if tgt_lang == 'zh':
                tts_lang = 'zh-CN'
            tts = gTTS(text=translated_text, lang=tts_lang)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            audio_b64 = base64.b64encode(fp.read()).decode('utf-8')
        except Exception as tts_e:
            logging.getLogger(__name__).warning('TTS Error: %s', tts_e)

        return Response({
            'original': text,
            'translated': translated_text,
            'audio_base64': audio_b64,
            'source_lang': source_lang,
            'target_lang': target_lang,
            'mode': mode,
            'status': 'success',
        }, status=status.HTTP_200_OK)


class HealthCheckView(views.APIView):
    """Simple health check endpoint to verify HTTP server reachability."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'status': 'ok',
            'message': 'Backend HTTP server is reachable',
        })
