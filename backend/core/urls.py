"""
توجيه الروابط الرئيسي للمشروع (core urls).
يحتوي على مسارات API وتوثيق Swagger.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
   openapi.Info(
      title="AI Talker API",
      default_version='v1',
      description="توثيق واجهات برمجة التطبيقات لمنصة AI Talker للترجمة الفورية.",
      terms_of_service="https://www.google.com/policies/terms/",
      contact=openapi.Contact(email="contact@aitalker.local"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('translator.urls')),
    
    # Swagger Documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
