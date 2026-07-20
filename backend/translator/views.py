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
from django.shortcuts import get_object_or_404
from .models import User, Translation, SiteLike, Comment
from .serializers import UserSerializer, TranslationSerializer, SiteLikeSerializer, CommentSerializer

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
    """واجهة وهمية لتسجيل الدخول عبر جوجل (سيتم تطويرها لاحقاً لربط OAuth)"""
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        # في التطبيق الحقيقي، سنقوم بالتحقق من token باستخدام مكتبة google.oauth2.id_token
        # إذا كان صحيحاً، نقوم بتسجيل المستخدم وإصدار JWT
        return Response({"message": "تم استلام الطلب", "token": token}, status=status.HTTP_200_OK)

class RegisterView(views.APIView):
    """واجهة لتسجيل مستخدم جديد"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'البريد الإلكتروني وكلمة المرور مطلوبان'}, status=status.HTTP_400_BAD_REQUEST)
        
        # We will use email as username
        if User.objects.filter(username=email).exists():
            # If user exists, we don't return error, we assume they want to login later.
            return Response({'error': 'المستخدم موجود مسبقاً'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.create_user(username=email, email=email, password=password)
        return Response({'message': 'تم إنشاء الحساب بنجاح'}, status=status.HTTP_201_CREATED)

class ContactView(views.APIView):
    """واجهة لإرسال رسائل تواصل معنا عبر البريد الإلكتروني"""
    permission_classes = [AllowAny]

    def post(self, request):
        from django.core.mail import send_mail
        email = request.data.get('email')
        message = request.data.get('message')
        
        if not email or not message:
            return Response({'error': 'البريد والرسالة مطلوبان'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            send_mail(
                subject=f"رسالة تواصل من: {email}",
                message=message,
                from_email=email,
                recipient_list=['admin@aitalker.local'],
                fail_silently=False,
            )
            return Response({'message': 'تم إرسال رسالتك بنجاح. شكراً لتواصلك معنا!'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'حدث خطأ أثناء إرسال الرسالة.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FileUploadTranslateView(views.APIView):
    """واجهة لرفع ملف أو صورة، استخراج النص، وترجمته"""
    permission_classes = [AllowAny] # Or IsAuthenticated depending on requirement

    def post(self, request):
        file_obj = request.FILES.get('file')
        target_lang = request.data.get('target_lang', 'ar') # Default to Arabic
        source_lang = request.data.get('source_lang', 'auto')
        
        if not file_obj:
            return Response({'error': 'لم يتم العثور على ملف في الطلب.'}, status=status.HTTP_400_BAD_REQUEST)
        
        extracted_text = ""
        file_name = file_obj.name.lower()

        try:
            # 1. Extract Text
            if file_name.endswith('.pdf'):
                try:
                    import fitz  # PyMuPDF
                    pdf_doc = fitz.open(stream=file_obj.read(), filetype="pdf")
                    for page_num in range(len(pdf_doc)):
                        page = pdf_doc.load_page(page_num)
                        extracted_text += page.get_text() + "\n"
                except ImportError:
                    return Response({'error': 'مكتبة استخراج النصوص من PDF غير مثبتة في الخادم.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            elif file_name.endswith(('.png', '.jpg', '.jpeg', '.webp')):
                try:
                    import easyocr
                    import numpy as np
                    from PIL import Image
                    import io

                    # Load image
                    image_bytes = file_obj.read()
                    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
                    img_array = np.array(image)
                    
                    # Determine OCR language based on source_lang
                    ocr_langs = ['ar', 'en']
                    if source_lang in ['zh-CN', 'zh']:
                        ocr_langs = ['ch_sim', 'en']
                    elif source_lang == 'zh-TW':
                        ocr_langs = ['ch_tra', 'en']
                    elif source_lang == 'ru':
                        ocr_langs = ['ru', 'en']
                    elif source_lang == 'ja':
                        ocr_langs = ['ja', 'en']
                    elif source_lang == 'ko':
                        ocr_langs = ['ko', 'en']
                    elif source_lang in ['fr', 'es', 'de', 'it', 'pt', 'nl', 'sv', 'tr']:
                        # Use English as base for Latin characters since we don't load all specific Latin models to save memory
                        ocr_langs = ['en']

                    # Initialize EasyOCR with selected languages
                    reader = easyocr.Reader(ocr_langs, gpu=False) 
                    result = reader.readtext(img_array, detail=0)
                    extracted_text = " ".join(result)
                except ImportError:
                    return Response({'error': 'مكتبات التعرف على الصور غير مثبتة في الخادم.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            else:
                return Response({'error': 'نوع الملف غير مدعوم.'}, status=status.HTTP_400_BAD_REQUEST)

            extracted_text = extracted_text.strip()
            if not extracted_text:
                return Response({'error': 'لم يتم العثور على نص في الملف/الصورة.'}, status=status.HTTP_400_BAD_REQUEST)

            # 2. Translate Text
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

            safe_source = map_lang(source_lang)
            safe_target = map_lang(target_lang)
            
            # Fallback for unexpected cases where it might still be 'zh'
            if safe_source == 'zh': safe_source = 'zh-CN'
            if safe_target == 'zh': safe_target = 'zh-CN'
            
            translator = GoogleTranslator(source=safe_source, target=safe_target)
            
            # Text can be long, so chunk it if necessary. Deep-translator handles chunks up to 5000 chars.
            chunk_size = 4500
            translated_chunks = []
            for i in range(0, len(extracted_text), chunk_size):
                chunk = extracted_text[i:i+chunk_size]
                translated_chunks.append(translator.translate(chunk))
                
            translated_text = " ".join(translated_chunks)

            return Response({
                'original_text': extracted_text,
                'translated_text': translated_text,
                'message': 'تم استخراج وترجمة النص بنجاح'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': f'حدث خطأ غير متوقع: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
