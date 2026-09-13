"""
إعدادات Django لمشروع AI Talker.

يتضمن هذا الملف إعدادات قاعدة البيانات (MySQL)، واجهات برمجة التطبيقات (DRF)،
المصادقة (JWT & Google OAuth)، والمقابس (Channels / WebSockets).
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# تحميل متغيرات البيئة
load_dotenv()

# المسار الأساسي للمشروع
BASE_DIR = Path(__file__).resolve().parent.parent

# وضع التطوير
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

# المفتاح السري: يُسمح بمفتاح افتراضي غير آمن فقط في وضع التطوير (DEBUG=True)
# لتسهيل التشغيل المحلي. في الإنتاج (DEBUG=False) يجب ضبط SECRET_KEY صراحةً،
# وإلا يتوقف تشغيل الخادم بدل العمل بمفتاح معروف للعامة وهو ثغرة أمنية حقيقية.
if DEBUG:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-default-secret-key-for-dev')
else:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise ImproperlyConfigured(
            'يجب ضبط متغير البيئة SECRET_KEY عند تشغيل الخادم بوضع الإنتاج (DEBUG=False).'
        )

# النطاقات المسموح بها: وضع مفتوح (*) في التطوير فقط، وقائمة صريحة في الإنتاج
# لتفادي هجمات Host header injection.
if DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    _allowed_hosts_env = os.environ.get('ALLOWED_HOSTS', '')
    ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_env.split(',') if h.strip()] or [
        'ai-talker-backend.onrender.com',
    ]

# التطبيقات المثبتة
INSTALLED_APPS = [
    'daphne', # يجب أن يكون في البداية لدعم ASGI و WebSockets
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'cloudinary_storage',
    'django.contrib.staticfiles',
    'cloudinary',
    
    # مكتبات خارجية
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_yasg',
    'channels',
    
    # تطبيقات المشروع
    'translator',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware', # يجب أن يكون في الأعلى
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR.parent, 'frontend')], # ربط مجلد الواجهة الأمامية
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

# إعدادات قاعدة البيانات MySQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'ai_talker_db'),
        'USER': os.environ.get('DB_USER', 'root'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'Ilya2006'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    }
}

try:
    import dj_database_url
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        DATABASES['default'] = dj_database_url.parse(db_url, conn_max_age=600)
except ImportError:
    pass


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'ar'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [os.path.join(BASE_DIR.parent, 'frontend')]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# إعدادات REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    # تحديد معدّل الطلبات لمنع إساءة الاستخدام (خصوصاً رفع الملفات الذي يستهلك
    # موارد OCR/الترجمة، ونموذج التواصل الذي قد يُستغل للسبام)
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'upload': '10/hour',
        'contact': '5/hour',
        'auth': '20/hour',
        'stt': '60/hour',
    },
}

# إعدادات JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# إعدادات CORS للسماح بالطلبات من الواجهة الأمامية
# CORS configuration – allow Vercel frontend
CORS_ALLOWED_ORIGINS = [
    "https://ai-talker-five.vercel.app",
    "https://ai-talker-backend.onrender.com",
]
CORS_ALLOW_ALL_ORIGINS = False  # keep explicit list for production
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# CSRF trusted origins (needed for POST requests from Vercel)
CSRF_TRUSTED_ORIGINS = [
    "https://ai-talker-five.vercel.app",
    "https://ai-talker-backend.onrender.com",
]


# إعدادات Django Channels / WebSocket
# InMemoryChannelLayer مناسب لـ Render (بدون Redis) ومستقر للاستخدام الفردي
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

# إعدادات الحماية
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# إعدادات نماذج المستخدم المخصصة إذا لزم الأمر
AUTH_USER_MODEL = 'translator.User'

# إعدادات البريد الإلكتروني (نموذج "تواصل معنا")
# إذا لم تُضبط EMAIL_HOST_USER/EMAIL_HOST_PASSWORD نستخدم console backend
# (يطبع الرسائل في السجلات فقط) حتى لا يتعطل التطوير المحلي بدون بيانات SMTP.
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
    DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'noreply@aitalker.local'

# البريد الذي تصل إليه رسائل نموذج "تواصل معنا" (افتراضياً نفس حساب الإرسال)
CONTACT_EMAIL = os.environ.get('CONTACT_EMAIL', EMAIL_HOST_USER or DEFAULT_FROM_EMAIL)

# معرف عميل Google المستخدم للتحقق من رمز تسجيل الدخول عبر Google Identity Services
# (نفس القيمة يجب وضعها في GOOGLE_CLIENT_ID داخل frontend/js/main.js)
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')

# بريد إلكتروني يُرسَل مع طلبات خدمة MyMemory للترجمة الاحتياطية (translate_utils.py)؛
# MyMemory يضاعف الحصة المجانية اليومية (من 5,000 إلى 10,000 حرف) لكل IP إذا تم إرفاق بريد.
MYMEMORY_CONTACT_EMAIL = os.environ.get('MYMEMORY_CONTACT_EMAIL', '')

# إعدادات Cloudinary لرفع الملفات
import os
CLOUDINARY_STORAGE = {
    'CLOUDINARY_URL': os.environ.get('CLOUDINARY_URL')
}

# إعدادات تخزين الملفات (لـ Django 4.2 والإصدارات الأحدث)
STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# مسار ملفات الميديا (مثل الصوتيات التي يتم إنشاؤها)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
