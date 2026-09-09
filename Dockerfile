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

# تثبيت حزم النظام اللازمة لبناء mysqlclient، ومحرك Tesseract OCR
# مع حزم اللغات المدعومة، وخطوط Noto لإعادة رسم النص المترجم على الصور
# (fonts-noto-core لـ Latin/Arabic/Cyrillic..، fonts-noto-cjk للصينية/اليابانية/الكورية)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
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
    fonts-noto-core \
    fonts-noto-cjk \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# التحقق من تثبيت tesseract
RUN tesseract --version

# تثبيت مكتبات Python أولاً (للاستفادة من Docker cache)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# نسخ ملفات التطبيق
COPY backend/ .

# تشغيل Daphne وتطبيق عمليات قاعدة البيانات والملفات الثابتة
CMD bash -c "python manage.py collectstatic --noinput && python manage.py migrate && daphne -b 0.0.0.0 -p $PORT core.asgi:application"
