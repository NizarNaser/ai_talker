# ===================================================================
# Dockerfile لتطبيق AI Talker Backend
# يثبّت Tesseract OCR على مستوى النظام ثم يشغّل Django/Daphne
# ===================================================================

FROM python:3.12-slim

# منع التفاعل أثناء تثبيت الحزم
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1



# تحديد مجلد العمل
WORKDIR /app

# تثبيت مكتبات Python أولاً (للاستفادة من Docker cache)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# نسخ ملفات التطبيق
COPY backend/ .

# تشغيل Daphne وتطبيق عمليات قاعدة البيانات والملفات الثابتة
CMD bash -c "python manage.py collectstatic --noinput && python manage.py migrate && daphne -b 0.0.0.0 -p $PORT core.asgi:application"
