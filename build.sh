#!/usr/bin/env bash
# build.sh - سكريبت البناء على Render
# يُثبّت Tesseract OCR على مستوى النظام ثم مكتبات Python
set -e

echo "==> Installing Tesseract OCR system packages..."
apt-get update -qq
apt-get install -y -qq \
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
    libxext6

echo "==> Tesseract version: $(tesseract --version 2>&1 | head -1)"
echo "==> Installing Python dependencies..."
pip install -r backend/requirements.txt
echo "==> Build complete."
