"""
نقطة الدخول التي يبحث عنها Passenger على استضافة Hostinger المشتركة (عبر
ميزة "Setup Python App" في hPanel) لتشغيل تطبيق WSGI. اسم الملف والمتغير
application ثابتان باتفاقية Passenger ولا يجوز تغييرهما.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
