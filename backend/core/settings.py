"""
إعدادات Django لمشروع AI Talker.

يتضمن هذا الملف إعدادات قاعدة البيانات (PostgreSQL)، واجهات برمجة التطبيقات (DRF)،
المصادقة (JWT & Google OAuth)، والمقابس (Channels / WebSockets).
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# تحميل متغيرات البيئة
load_dotenv()

# المسار الأساسي للمشروع
BASE_DIR = Path(__file__).resolve().parent.parent

# المفتاح السري (يجب إخفاؤه في الإنتاج)
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-default-secret-key-for-dev')

# وضع التطوير
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']

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

# إعدادات قاعدة البيانات PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
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
}

# إعدادات JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# إعدادات CORS للسماح بالطلبات من الواجهة الأمامية
CORS_ALLOW_ALL_ORIGINS = True # للإنتاج يفضل تحديد النطاقات المسموحة

# إعدادات الحماية
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# إعدادات نماذج المستخدم المخصصة إذا لزم الأمر
AUTH_USER_MODEL = 'translator.User'
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

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
