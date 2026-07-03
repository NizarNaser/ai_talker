"""
سكريبت لتهيئة قاعدة البيانات (Seed Data).
يقوم بإنشاء 20 تعليقاً افتراضياً لعدة مستخدمين تجريبيين.
"""
import os
import django
from django.utils import timezone
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from translator.models import User, Comment, SiteLike

def seed_data():
    # التأكد من وجود كائن الإعجابات الافتراضي
    like_obj, created = SiteLike.objects.get_or_create(id=1, defaults={'total_likes': 1000})
    if created:
        print("تم إنشاء سجل الإعجابات الافتراضي (1000 إعجاب).")

    # إنشاء مستخدمين تجريبيين
    users = []
    for i in range(5):
        username = f"testuser_{i+1}"
        user, u_created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{username}@example.com",
                'profile_picture': f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}"
            }
        )
        if u_created:
            user.set_password('testpassword123')
            user.save()
        users.append(user)

    print("تم التأكد من وجود المستخدمين التجريبيين.")

    # التعليقات الافتراضية
    comments_text = [
        "أفضل منصة ترجمة جربتها حتى الآن!",
        "الترجمة الصوتية دقيقة جداً وسريعة.",
        "دعم اللهجات العربية ميزة رائعة ومفقودة في الكثير من التطبيقات.",
        "واجهة المستخدم أنيقة ومريحة للعين.",
        "التصميم (Dark Mode) ممتاز.",
        "أتمنى إضافة المزيد من اللهجات مستقبلاً.",
        "سرعة استجابة الموقع مذهلة.",
        "جودة تحويل النص إلى صوت (TTS) طبيعية جداً.",
        "استخدمته في سفري وكان مفيداً جداً.",
        "منصة احترافية وتستحق الدعم.",
        "أعجبني جداً دعم المحادثات الثنائية المباشرة.",
        "تطبيق رائع، لكن يحتاج لبعض التحسينات في اللهجة الموريتانية.",
        "هل هناك خطة لإصدار تطبيق للهواتف الذكية قريباً؟",
        "تسجيل الدخول عبر جوجل سهل وسريع.",
        "ميزة حفظ سجل الترجمات مفيدة لمراجعة الكلمات لاحقاً.",
        "الترجمة تحافظ على السياق بشكل أفضل من محركات الترجمة التقليدية.",
        "تجربة مستخدم (UX) لا تشوبها شائبة.",
        "المنصة تعمل بكفاءة عالية على الهاتف.",
        "شكراً للمطورين على هذا الإنجاز الرائع.",
        "أتمنى لكم التوفيق والنجاح الدائم."
    ]

    # إنشاء 20 تعليقاً
    current_comments = Comment.objects.count()
    if current_comments < 20:
        for i in range(20 - current_comments):
            Comment.objects.create(
                user=random.choice(users),
                content=comments_text[i % len(comments_text)],
                created_at=timezone.now()
            )
        print(f"تم إضافة {20 - current_comments} تعليقاً افتراضياً.")
    else:
        print("التعليقات موجودة مسبقاً.")

if __name__ == '__main__':
    seed_data()
