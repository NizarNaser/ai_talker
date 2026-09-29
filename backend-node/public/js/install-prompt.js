/**
 * Install App Banner
 * Shows a native "Install" prompt on Chrome/Android (GMS devices).
 * On Huawei / GMS-less devices (where beforeinstallprompt never fires),
 * falls back to a direct APK download so the user still gets the app
 * with its native mic-permission handling.
 */
(function () {
    const DISMISS_KEY = 'aitalker_install_dismissed_at';
    const DISMISS_DAYS = 14;
    const APK_URL = 'apk/ai-talker.apk';

    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.startsWith('android-app://');

    if (isStandalone) return; // already running as installed app

    const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

    const isHuaweiOrNoGMS = /huawei|honor|harmonyos|hmscore/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);

    if (!isAndroid) return; // this banner targets Android/Huawei installs only

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    const banner = document.getElementById('install-banner');
    const titleEl = document.getElementById('install-banner-title');
    const subtitleEl = document.getElementById('install-banner-subtitle');
    const actionBtn = document.getElementById('install-banner-action');
    const closeBtn = document.getElementById('install-banner-close');
    if (!banner) return;

    function dismiss() {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        banner.classList.add('hidden');
    }

    closeBtn.addEventListener('click', dismiss);

    function showApkFallback() {
        titleEl.textContent = 'ثبّت تطبيق AI Talker';
        subtitleEl.textContent = 'لدعم أفضل للميكروفون على أجهزة هواوي';
        actionBtn.textContent = 'تحميل APK';
        actionBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = APK_URL;
            link.download = 'ai-talker.apk';
            document.body.appendChild(link);
            link.click();
            link.remove();
            dismiss();
        };
        banner.classList.remove('hidden');
    }

    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        titleEl.textContent = 'ثبّت تطبيق AI Talker';
        subtitleEl.textContent = 'وصول أسرع من شاشتك الرئيسية';
        actionBtn.textContent = 'تثبيت';
        actionBtn.onclick = async () => {
            banner.classList.add('hidden');
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
        };
        banner.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', dismiss);

    // Huawei/GMS-less browsers never fire beforeinstallprompt, so offer the
    // direct APK after a short wait instead of leaving the user with nothing.
    if (isHuaweiOrNoGMS) {
        setTimeout(() => {
            if (!deferredPrompt) showApkFallback();
        }, 2500);
    }
})();
