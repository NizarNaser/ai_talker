/**
 * لوحة تحكم بسيطة (مكافئ مصغّر لـ Django admin السابق): تسجيل دخول الأدمن،
 * الموافقة/رفض/حذف التعليقات، عرض المستخدمين، وعرض/حذف سجل الترجمات.
 */
const API_BASE = '/api';
let accessToken = sessionStorage.getItem('admin_access') || null;

const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const loginError = document.getElementById('login-error');

function authHeaders() {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
    });
    if (res.status === 401 || res.status === 403) {
        showLogin('انتهت صلاحية الجلسة أو لا تملك صلاحية الوصول.');
        throw new Error('unauthorized');
    }
    return res;
}

function showApp() {
    loginScreen.style.display = 'none';
    app.style.display = 'block';
    loadAll();
}

function showLogin(message) {
    accessToken = null;
    sessionStorage.removeItem('admin_access');
    app.style.display = 'none';
    loginScreen.style.display = 'block';
    loginError.textContent = message || '';
}

document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    loginError.textContent = '';
    if (!username || !password) {
        loginError.textContent = 'الرجاء إدخال اسم المستخدم وكلمة المرور.';
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/auth/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            loginError.textContent = data.error || 'فشل تسجيل الدخول.';
            return;
        }
        accessToken = data.access;
        // نتحقق من صلاحية الأدمن فعلياً بطلب محمي، لا نثق بالتوكن وحده.
        const check = await fetch(`${API_BASE}/admin/users/`, { headers: authHeaders() });
        if (!check.ok) {
            loginError.textContent = 'هذا الحساب لا يملك صلاحية الأدمن.';
            accessToken = null;
            return;
        }
        sessionStorage.setItem('admin_access', accessToken);
        showApp();
    } catch (e) {
        loginError.textContent = 'تعذّر الاتصال بالخادم.';
    }
});

document.getElementById('logout-btn').addEventListener('click', () => showLogin());

async function loadAll() {
    await Promise.all([loadComments(), loadUsers(), loadTranslations()]);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

function formatDate(iso) {
    try { return new Date(iso).toLocaleString('ar-EG'); } catch { return iso; }
}

async function loadComments() {
    const res = await apiFetch('/admin/comments/');
    const rows = await res.json();
    const body = document.getElementById('comments-body');
    if (!rows.length) {
        body.innerHTML = '<tr class="empty-row"><td colspan="5">لا توجد تعليقات</td></tr>';
        return;
    }
    body.innerHTML = rows.map((c) => `
        <tr data-id="${c.id}">
            <td>${escapeHtml(c.user_name)}</td>
            <td>${escapeHtml(c.content)}</td>
            <td><span class="badge ${c.is_approved ? 'badge-yes' : 'badge-no'}">${c.is_approved ? 'موافَق عليه' : 'قيد المراجعة'}</span></td>
            <td>${formatDate(c.created_at)}</td>
            <td>
                ${c.is_approved
                    ? `<button class="btn btn-reject" data-action="reject" data-id="${c.id}">رفض</button>`
                    : `<button class="btn btn-approve" data-action="approve" data-id="${c.id}">موافقة</button>`}
                <button class="btn btn-delete" data-action="delete-comment" data-id="${c.id}">حذف</button>
            </td>
        </tr>
    `).join('');
}

async function loadUsers() {
    const res = await apiFetch('/admin/users/');
    const rows = await res.json();
    const body = document.getElementById('users-body');
    if (!rows.length) {
        body.innerHTML = '<tr class="empty-row"><td colspan="6">لا يوجد مستخدمون</td></tr>';
        return;
    }
    body.innerHTML = rows.map((u) => `
        <tr>
            <td>${u.id}</td>
            <td>${escapeHtml(u.username)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${u.isGoogleAuth ? 'نعم' : 'لا'}</td>
            <td>${u.isAdmin ? '<span class="badge badge-yes">أدمن</span>' : ''}</td>
            <td>${formatDate(u.created_at)}</td>
        </tr>
    `).join('');
}

async function loadTranslations() {
    const res = await apiFetch('/admin/translations/');
    const rows = await res.json();
    const body = document.getElementById('translations-body');
    if (!rows.length) {
        body.innerHTML = '<tr class="empty-row"><td colspan="6">لا يوجد سجل ترجمات</td></tr>';
        return;
    }
    body.innerHTML = rows.map((t) => `
        <tr data-id="${t.id}">
            <td>${escapeHtml(t.user_name)}</td>
            <td>${escapeHtml(t.source_language)}</td>
            <td>${escapeHtml(t.target_language)}</td>
            <td>${escapeHtml((t.original_text || '').slice(0, 80))}</td>
            <td>${formatDate(t.created_at)}</td>
            <td><button class="btn btn-delete" data-action="delete-translation" data-id="${t.id}">حذف</button></td>
        </tr>
    `).join('');
}

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    try {
        if (action === 'approve') {
            await apiFetch(`/admin/comments/${id}/`, { method: 'PATCH', body: JSON.stringify({ is_approved: true }) });
            await loadComments();
        } else if (action === 'reject') {
            await apiFetch(`/admin/comments/${id}/`, { method: 'PATCH', body: JSON.stringify({ is_approved: false }) });
            await loadComments();
        } else if (action === 'delete-comment') {
            if (!confirm('حذف هذا التعليق نهائياً؟')) return;
            await apiFetch(`/admin/comments/${id}/`, { method: 'DELETE' });
            await loadComments();
        } else if (action === 'delete-translation') {
            if (!confirm('حذف سجل الترجمة هذا نهائياً؟')) return;
            await apiFetch(`/admin/translations/${id}/`, { method: 'DELETE' });
            await loadTranslations();
        }
    } catch (err) {
        // apiFetch already redirects to login on 401/403؛ أي خطأ آخر نتجاهله هنا بصمت بسيط
    }
});

if (accessToken) {
    fetch(`${API_BASE}/admin/users/`, { headers: authHeaders() }).then((res) => {
        if (res.ok) showApp();
        else showLogin();
    }).catch(() => showLogin());
} else {
    showLogin();
}
