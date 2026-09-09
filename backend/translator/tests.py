"""
اختبارات آلية لأهم الواجهات والمنطق في تطبيق المترجم:
- نموذج التواصل معنا (إرسال البريد، التحقق من صحة البيانات).
- تسجيل مستخدم جديد.
- تسجيل الدخول عبر Google (بدون استدعاء شبكة حقيقي).
- فحص حالة الخادم.
- أدوات ترجمة الصور (اكتشاف السكربت، تجميع الأسطر).
- المترجم المرن (التحول التلقائي بين Google و MyMemory).
"""
from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status

from .models import User
from .image_style import _detect_script, _group_words_into_lines
from .translate_utils import ResilientTranslator, _chunk_text


class BaseAPITestCase(TestCase):
    def setUp(self):
        # تفريغ الكاش قبل كل اختبار حتى لا يتراكم عداد Throttling بين الاختبارات
        cache.clear()
        self.client = APIClient()


class ContactViewTests(BaseAPITestCase):
    def test_missing_fields_returns_400(self):
        res = self.client.post('/api/contact/', {'email': 'a@b.com'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_email_returns_400(self):
        res = self.client.post('/api/contact/', {'email': 'not-an-email', 'message': 'hi'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                        DEFAULT_FROM_EMAIL='noreply@aitalker.local', CONTACT_EMAIL='owner@aitalker.local')
    def test_valid_message_sends_email_with_correct_headers(self):
        res = self.client.post('/api/contact/', {'email': 'visitor@example.com', 'message': 'Hello there'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertEqual(sent.from_email, 'noreply@aitalker.local')
        self.assertEqual(sent.to, ['owner@aitalker.local'])
        self.assertEqual(sent.reply_to, ['visitor@example.com'])
        self.assertIn('Hello there', sent.body)


class RegisterViewTests(BaseAPITestCase):
    def test_missing_fields_returns_400(self):
        res = self.client.post('/api/auth/register/', {'email': 'a@b.com'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_success(self):
        res = self.client.post('/api/auth/register/', {'email': 'new@example.com', 'password': 'StrongPass123'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='new@example.com').exists())

    def test_register_duplicate_returns_400(self):
        User.objects.create_user(username='dup@example.com', email='dup@example.com', password='x')
        res = self.client.post('/api/auth/register/', {'email': 'dup@example.com', 'password': 'y'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class GoogleLoginViewTests(BaseAPITestCase):
    @override_settings(GOOGLE_CLIENT_ID='')
    def test_returns_503_when_not_configured(self):
        res = self.client.post('/api/auth/google/', {'token': 'whatever'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @override_settings(GOOGLE_CLIENT_ID='test-client-id')
    def test_missing_token_returns_400(self):
        res = self.client.post('/api/auth/google/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(GOOGLE_CLIENT_ID='test-client-id')
    def test_invalid_token_returns_400(self):
        res = self.client.post('/api/auth/google/', {'token': 'not-a-real-jwt'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(GOOGLE_CLIENT_ID='test-client-id')
    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_valid_token_creates_user_and_returns_jwt(self, mock_verify):
        mock_verify.return_value = {'email': 'googleuser@example.com', 'name': 'Google User'}
        res = self.client.post('/api/auth/google/', {'token': 'valid-token'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['email'], 'googleuser@example.com')
        self.assertTrue(User.objects.filter(username='googleuser@example.com').exists())


class HealthCheckViewTests(BaseAPITestCase):
    def test_health_check_ok(self):
        res = self.client.get('/api/health/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'ok')


class ImageStyleUnitTests(TestCase):
    def test_detect_script_variants(self):
        self.assertEqual(_detect_script('Hello world'), 'latin')
        self.assertEqual(_detect_script('مرحبا بالعالم'), 'arabic')
        self.assertEqual(_detect_script('你好世界'), 'han')
        self.assertEqual(_detect_script('こんにちは'), 'kana')
        self.assertEqual(_detect_script('안녕하세요'), 'hangul')
        self.assertEqual(_detect_script('नमस्ते'), 'devanagari')

    def test_group_words_into_lines_groups_by_line_and_computes_box(self):
        ocr_data = {
            'text':      ['Hello', 'World', '', 'Bye'],
            'conf':      ['95', '90', '-1', '88'],
            'block_num': [1, 1, 1, 2],
            'par_num':   [1, 1, 1, 1],
            'line_num':  [1, 1, 1, 1],
            'left':      [10, 60, 0, 10],
            'top':       [20, 22, 0, 100],
            'width':     [40, 45, 0, 30],
            'height':    [15, 13, 0, 15],
        }
        lines = _group_words_into_lines(ocr_data)
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0]['text'], 'Hello World')
        # box = union of both words: left=10, top=20, right=max(60+45,10+40)=105, bottom=max(20+15,22+13)=35
        self.assertEqual(lines[0]['box'], (10, 20, 105, 35))
        self.assertEqual(lines[1]['text'], 'Bye')


class ChunkTextTests(TestCase):
    def test_short_text_returns_single_chunk(self):
        self.assertEqual(_chunk_text('short text', 100), ['short text'])

    def test_long_text_splits_on_word_boundaries(self):
        text = 'word ' * 50  # 250 chars
        chunks = _chunk_text(text, 60)
        self.assertTrue(all(len(c) <= 60 for c in chunks))
        # إعادة تجميع الأجزاء يجب أن يعطي نفس الكلمات دون فقدان أي منها
        self.assertEqual(' '.join(chunks).split(), text.split())


class ResilientTranslatorTests(TestCase):
    def test_uses_google_when_it_succeeds(self):
        rt = ResilientTranslator(source='en', target='ar')
        with patch.object(rt._google, 'translate', return_value='مرحبا') as mock_google, \
             patch.object(rt, '_translate_with_mymemory') as mock_mymemory:
            result = rt.translate('hello')
        self.assertEqual(result, 'مرحبا')
        mock_google.assert_called_once()
        mock_mymemory.assert_not_called()

    def test_falls_back_to_mymemory_when_google_fails(self):
        rt = ResilientTranslator(source='en', target='ar')
        with patch.object(rt._google, 'translate', side_effect=RuntimeError('boom')), \
             patch.object(rt, '_translate_with_mymemory', return_value='مرحبا (احتياطي)') as mock_mymemory:
            result = rt.translate('hello')
        self.assertEqual(result, 'مرحبا (احتياطي)')
        mock_mymemory.assert_called_once()

    def test_returns_original_text_when_both_fail(self):
        rt = ResilientTranslator(source='en', target='ar')
        with patch.object(rt._google, 'translate', side_effect=RuntimeError('boom')), \
             patch.object(rt, '_translate_with_mymemory', side_effect=RuntimeError('boom too')):
            result = rt.translate('hello')
        self.assertEqual(result, 'hello')

    def test_empty_text_returns_as_is_without_calling_apis(self):
        rt = ResilientTranslator(source='en', target='ar')
        with patch.object(rt._google, 'translate') as mock_google:
            result = rt.translate('   ')
        self.assertEqual(result, '   ')
        mock_google.assert_not_called()
