"""
ملف الإدارة (Admin) لتسجيل النماذج في لوحة تحكم جانغو.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Translation, SiteLike, Comment

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('المعلومات الإضافية', {'fields': ('profile_picture', 'is_google_auth')}),
    )

@admin.register(Translation)
class TranslationAdmin(admin.ModelAdmin):
    list_display = ('user', 'source_language', 'target_language', 'created_at', 'is_favorite')
    list_filter = ('source_language', 'target_language', 'is_favorite')
    search_fields = ('original_text', 'translated_text', 'user__username')

@admin.register(SiteLike)
class SiteLikeAdmin(admin.ModelAdmin):
    list_display = ('total_likes', 'last_updated')

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'is_approved')
    list_filter = ('is_approved',)
