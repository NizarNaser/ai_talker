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
