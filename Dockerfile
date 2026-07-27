# ===================================================================
# Dockerfile لتطبيق AI Talker Backend
# يثبّت Tesseract OCR على مستوى النظام ثم يشغّل Django/Daphne
# ===================================================================

FROM python:3.12-slim

# منع التفاعل أثناء تثبيت الحزم
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# تثبيت Tesseract OCR وحزم اللغات المطلوبة
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-ara \
        tesseract-ocr-eng \
        tesseract-ocr-fra \
        tesseract-ocr-spa \
        tesseract-ocr-deu \
        tesseract-ocr-chi-sim \
        tesseract-ocr-chi-tra \
        tesseract-ocr-rus \
        tesseract-ocr-jpn \
        tesseract-ocr-kor \
        libsm6 \
        libxext6 \
        libgomp1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# التحقق من تثبيت tesseract
RUN tesseract --version

# تحديد مجلد العمل
WORKDIR /app

# تثبيت مكتبات Python أولاً (للاستفادة من Docker cache)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# نسخ ملفات التطبيق
COPY backend/ .

# تشغيل Daphne وتطبيق عمليات قاعدة البيانات والملفات الثابتة
CMD bash -c "python manage.py collectstatic --noinput && python manage.py migrate && daphne -b 0.0.0.0 -p $PORT core.asgi:application"
