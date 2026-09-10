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
                    import pytesseract
                    from PIL import Image
                    import io
                    import base64
                    import shutil as _shutil
                    from .image_style import translate_image_preserving_style

                    # تحديد مسار tesseract تلقائياً (Render يثبته في /usr/bin)
                    _tess_path = _shutil.which('tesseract')
                    if not _tess_path:
                        import os as _os
                        for _candidate in ['/usr/bin/tesseract', '/usr/local/bin/tesseract']:
                            if _os.path.isfile(_candidate):
                                _tess_path = _candidate
                                break
                    if _tess_path:
                        pytesseract.pytesseract.tesseract_cmd = _tess_path
                        logger.info('✅ Tesseract found at: %s', _tess_path)
                    else:
                        logger.error('❌ Tesseract binary not found')
                        return Response(
                            {'error': 'محرك التعرف على النصوص (Tesseract) غير مثبت على الخادم.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE
                        )

                    image = Image.open(io.BytesIO(file_bytes)).convert('RGB')
                    file_bytes = None  # تحرير الذاكرة فوراً

                    # تصغير الصورة لتوفير الذاكرة على Render
                    max_dim = 1600
                    w, h = image.size
                    if w > max_dim or h > max_dim:
                        ratio = min(max_dim / w, max_dim / h)
                        image = image.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
                        logger.info('🖼️ Resized image from %dx%d to %dx%d', w, h, int(w*ratio), int(h*ratio))

                    # تحويل رمز اللغة إلى صيغة Tesseract
                    tesseract_lang_map = {
                        'ar': 'ara', 'en': 'eng', 'fr': 'fra', 'es': 'spa',
                        'de': 'deu', 'ru': 'rus', 'zh-CN': 'chi_sim', 'zh-TW': 'chi_tra',
                        'ja': 'jpn', 'ko': 'kor', 'it': 'ita', 'pt': 'por',
                        'nl': 'nld', 'sv': 'swe', 'tr': 'tur', 'hi': 'hin',
                        'auto': 'ara+eng',
                    }
                    tess_lang = tesseract_lang_map.get(safe_source, 'ara+eng')

                    # استخراج النص وترجمته مع إعادة رسمه على نفس مكانه في الصورة
                    # للحفاظ على شكل وستايل الصورة الأصلية (بدلاً من نص منفصل فقط)
                    extracted_text, translated_text, stylized_image = translate_image_preserving_style(
                        image, tess_lang, safe_target, translator
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

                except ImportError:
                    return Response({'error': 'مكتبة pytesseract غير مثبتة في الخادم.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
        logger = logging.getLogger(__name__)
        audio_file = request.FILES.get('audio')
        language = request.data.get('language') or 'ar-SA'

        if not audio_file:
            return Response({'error': 'لم يتم إرسال تسجيل صوتي.'}, status=status.HTTP_400_BAD_REQUEST)

        max_audio_size = 8 * 1024 * 1024  # 8 MiB
        if audio_file.size > max_audio_size:
            return Response({'error': 'حجم التسجيل الصوتي كبير جداً.'}, status=status.HTTP_400_BAD_REQUEST)

        import os
        import tempfile
        import speech_recognition as sr
        from pydub import AudioSegment

        src_path = None
        wav_path = None
        try:
            suffix = os.path.splitext(audio_file.name or 'audio.webm')[1] or '.webm'
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as src_f:
                for chunk in audio_file.chunks():
                    src_f.write(chunk)
                src_path = src_f.name

            wav_path = src_path + '.wav'
            AudioSegment.from_file(src_path).set_channels(1).set_frame_rate(16000).export(wav_path, format='wav')

            recognizer = sr.Recognizer()
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)

            text = recognizer.recognize_google(audio_data, language=language)
            return Response({'text': text}, status=status.HTTP_200_OK)

        except sr.UnknownValueError:
            return Response({'error': 'لم يتم التعرف على أي كلام في التسجيل. حاول التحدث بوضوح أكبر.'}, status=status.HTTP_400_BAD_REQUEST)
        except sr.RequestError as e:
            logger.error('STT service error: %s', str(e))
            return Response({'error': 'تعذّر الوصول لخدمة التعرف الصوتي حالياً. حاول لاحقاً.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error('STT error: %s', str(e))
            return Response({'error': f'حدث خطأ أثناء تحويل الصوت إلى نص: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            for p in (src_path, wav_path):
                if p and os.path.exists(p):
                    try:
                        os.remove(p)
                    except OSError:
                        pass


class HealthCheckView(views.APIView):
    """Simple health check endpoint to verify HTTP server reachability."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'status': 'ok',
            'message': 'Backend HTTP server is reachable',
            'ws_test_path': '/ws/translate/'
        })
