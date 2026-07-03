"""
ملف النماذج (Models) لتطبيق المترجم.
يحتوي على:
1. نموذج المستخدم المخصص (User) لدعم تسجيل الدخول عبر Google.
2. نموذج الترجمة (Translation) لحفظ السجل.
3. نموذج الإعجابات (Like) لنظام الإعجاب بالموقع.
4. نموذج التعليقات (Comment) لآراء المستخدمين.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """
    نموذج مستخدم مخصص يضيف حقول إضافية مثل صورة الملف الشخصي
    وتسجيل الدخول عبر جوجل.
    """
    profile_picture = models.URLField(max_length=500, blank=True, null=True, verbose_name="صورة الملف الشخصي")
    is_google_auth = models.BooleanField(default=False, verbose_name="مسجل عبر جوجل")

    def __str__(self):
        return self.username


class TranslationHistory(models.fields.Field):
    pass # سيتم استبداله بصنف حقيقي

class Translation(models.Model):
    """
    نموذج لحفظ سجل الترجمات للمستخدمين.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='translations', verbose_name="المستخدم")
    source_language = models.CharField(max_length=10, verbose_name="لغة المصدر")
    target_language = models.CharField(max_length=10, verbose_name="لغة الهدف")
    original_text = models.TextField(verbose_name="النص الأصلي")
    translated_text = models.TextField(verbose_name="النص المترجم")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الترجمة")
    is_favorite = models.BooleanField(default=False, verbose_name="مفضلة")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.source_language} to {self.target_language}"


class SiteLike(models.Model):
    """
    نموذج الإعجاب بالموقع.
    القيمة الافتراضية 1000 إعجاب كما طلب المستخدم.
    """
    total_likes = models.PositiveIntegerField(default=1000, verbose_name="إجمالي الإعجابات")
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"الإعجابات: {self.total_likes}"


class Comment(models.Model):
    """
    نموذج التعليقات للمستخدمين المسجلين.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments', verbose_name="المستخدم")
    content = models.TextField(verbose_name="التعليق")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ التعليق")
    is_approved = models.BooleanField(default=True, verbose_name="موافق عليه")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"تعليق من {self.user.username}"
