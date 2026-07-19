"""
ملف توجيه الروابط (URLs) لتطبيق المترجم.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TranslationViewSet, CommentViewSet, SiteLikeView, GoogleLoginView, RegisterView, ContactView, FileUploadTranslateView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'translations', TranslationViewSet, basename='translation')
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
    path('site-like/', SiteLikeView.as_view(), name='site-like'),
    path('contact/', ContactView.as_view(), name='contact'),
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),
    path('upload-translate/', FileUploadTranslateView.as_view(), name='upload-translate'),
    # JWT Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
