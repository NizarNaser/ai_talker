"""
ملف السيريلايزرز (Serializers) لتحويل النماذج إلى JSON.
"""
from rest_framework import serializers
from .models import User, Translation, SiteLike, Comment

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile_picture', 'is_google_auth']

class TranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Translation
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class SiteLikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteLike
        fields = ['total_likes']

class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_picture = serializers.CharField(source='user.profile_picture', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user', 'user_name', 'user_picture', 'content', 'created_at']
        read_only_fields = ['user', 'created_at']
