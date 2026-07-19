/**
 * AI Talker - Main JavaScript File
 * Handles UI interactions, API calls, WebSockets, and Speech Recognition.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Remove Loader
    const loader = document.getElementById('loader');
    setTimeout(() => {
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }
    }, 1000);

    // --- UI Translation System ---
    const langNames = {
        ar: {
            group_arabic: "اللغة العربية واللهجات",
            group_global: "اللغات العالمية",
            lang_ar: "العربية (الفصحى)", lang_ar_eg: "العربية (المصرية)", lang_ar_sa: "العربية (السعودية)", lang_ar_sy: "العربية (السورية)", lang_ar_lb: "العربية (اللبنانية)", lang_ar_jo: "العربية (الأردنية)", lang_ar_ps: "العربية (الفلسطينية)", lang_ar_iq: "العربية (العراقية)", lang_ar_ae: "العربية (الإماراتية)", lang_ar_kw: "العربية (الكويتية)", lang_ar_qa: "العربية (القطرية)", lang_ar_bh: "العربية (البحرينية)", lang_ar_om: "العربية (العمانية)", lang_ar_ye: "العربية (اليمنية)", lang_ar_dz: "العربية (الجزائرية)", lang_ar_ma: "العربية (المغربية)", lang_ar_tn: "العربية (التونسية)", lang_ar_ly: "العربية (الليبية)", lang_ar_mr: "العربية (الموريتانية)",
            lang_en: "الإنجليزية (English)", lang_fr: "الفرنسية (Français)", lang_es: "الإسبانية (Español)", lang_de: "الألمانية (Deutsch)", lang_tr: "التركية (Türkçe)", lang_ru: "الروسية (Русский)", lang_zh: "الصينية المبسطة (简体中文)", lang_zh_tw: "الصينية التقليدية (繁體中文)", lang_ja: "اليابانية (日本語)", lang_ko: "الكورية (한국어)", lang_hi: "الهندية (हिन्दी)", lang_it: "الإيطالية (Italiano)", lang_pt: "البرتغالية (Português)", lang_nl: "الهولندية (Nederlands)", lang_sv: "السويدية (Svenska)", lang_fa: "الفارسية (فارسی)", lang_ur: "الأردية (اردو)"
        },
        en: {
            group_arabic: "Arabic & Dialects",
            group_global: "Global Languages",
            lang_ar: "Arabic (Standard)", lang_ar_eg: "Arabic (Egyptian)", lang_ar_sa: "Arabic (Saudi)", lang_ar_sy: "Arabic (Syrian)", lang_ar_lb: "Arabic (Lebanese)", lang_ar_jo: "Arabic (Jordanian)", lang_ar_ps: "Arabic (Palestinian)", lang_ar_iq: "Arabic (Iraqi)", lang_ar_ae: "Arabic (Emirati)", lang_ar_kw: "Arabic (Kuwaiti)", lang_ar_qa: "Arabic (Qatari)", lang_ar_bh: "Arabic (Bahraini)", lang_ar_om: "Arabic (Omani)", lang_ar_ye: "Arabic (Yemeni)", lang_ar_dz: "Arabic (Algerian)", lang_ar_ma: "Arabic (Moroccan)", lang_ar_tn: "Arabic (Tunisian)", lang_ar_ly: "Arabic (Libyan)", lang_ar_mr: "Arabic (Mauritanian)",
            lang_en: "English", lang_fr: "French", lang_es: "Spanish", lang_de: "German", lang_tr: "Turkish", lang_ru: "Russian", lang_zh: "Chinese (Simplified)", lang_zh_tw: "Chinese (Traditional)", lang_ja: "Japanese", lang_ko: "Korean", lang_hi: "Hindi", lang_it: "Italian", lang_pt: "Portuguese", lang_nl: "Dutch", lang_sv: "Swedish", lang_fa: "Persian", lang_ur: "Urdu"
        },
        fr: {
            group_arabic: "Arabe & Dialectes",
            group_global: "Langues Mondiales",
            lang_ar: "Arabe (Standard)", lang_ar_eg: "Arabe (Égyptien)", lang_ar_sa: "Arabe (Saoudien)", lang_ar_sy: "Arabe (Syrien)", lang_ar_lb: "Arabe (Libanais)", lang_ar_jo: "Arabe (Jordanien)", lang_ar_ps: "Arabe (Palestinien)", lang_ar_iq: "Arabe (Irakien)", lang_ar_ae: "Arabe (Émirati)", lang_ar_kw: "Arabe (Koweïtien)", lang_ar_qa: "Arabe (Qatari)", lang_ar_bh: "Arabe (Bahreïni)", lang_ar_om: "Arabe (Omanais)", lang_ar_ye: "Arabe (Yéménite)", lang_ar_dz: "Arabe (Algérien)", lang_ar_ma: "Arabe (Marocain)", lang_ar_tn: "Arabe (Tunisien)", lang_ar_ly: "Arabe (Libyen)", lang_ar_mr: "Arabe (Mauritanien)",
            lang_en: "Anglais", lang_fr: "Français", lang_es: "Espagnol", lang_de: "Allemand", lang_tr: "Turc", lang_ru: "Russe", lang_zh: "Chinois (Simplifié)", lang_zh_tw: "Chinois (Traditionnel)", lang_ja: "Japonais", lang_ko: "Coréen", lang_hi: "Hindi", lang_it: "Italien", lang_pt: "Portugais", lang_nl: "Néerlandais", lang_sv: "Suédois", lang_fa: "Persan", lang_ur: "Ourdou"
        }
    };
    // Fallback for other languages to English
    ['es', 'de', 'zh', 'ru'].forEach(l => langNames[l] = langNames.en);

    const translations = {
        ar: {
            ...langNames.ar,
            nav_home: "الرئيسية",
            nav_translator: "المترجم",
            nav_features: "المميزات",
            nav_comments: "الآراء",
            login: "تسجيل الدخول",
            hero_title: "الترجمة الفورية لم تكن يوماً بهذه السهولة",
            hero_subtitle: "تحدث، اكتب، وترجم لأكثر من 100 لغة وما يزيد عن 20 لهجة عربية بدقة الذكاء الاصطناعي.",
            source_placeholder: "اكتب النص هنا أو اضغط على الميكروفون للتحدث...",
            target_placeholder: "ستظهر الترجمة هنا...",
            translate_now: "ترجم الآن",
            live_conversation: "وضع المحادثة المباشرة",
            like_site: "إعجاب بالموقع",
            user_reviews: "آراء المستخدمين",
            add_comment: "أضف تعليقك",
            comment_title: "أضف رأيك",
            comment_subtitle: "رأيك يهمنا في تطوير المترجم",
            comment_placeholder: "اكتب رأيك هنا...",
            comment_submit: "نشر التعليق",
            login_title: "تسجيل الدخول / إنشاء حساب",
            login_subtitle: "احفظ ترجماتك المفضلة وشارك في المجتمع",
            login_google: "المتابعة باستخدام Google",
            or: "أو",
            email_placeholder: "البريد الإلكتروني",
            password_placeholder: "كلمة المرور",
            login_submit: "دخول"
        },
        en: {
            ...langNames.en,
            nav_home: "Home",
            nav_translator: "Translator",
            nav_features: "Features",
            nav_comments: "Reviews",
            login: "Login",
            hero_title: "Instant Translation Has Never Been Easier",
            hero_subtitle: "Speak, type, and translate over 100 languages and 20+ dialects with AI precision.",
            source_placeholder: "Type text here or click the mic to speak...",
            target_placeholder: "Translation will appear here...",
            translate_now: "Translate Now",
            live_conversation: "Live Conversation Mode",
            like_site: "Like Site",
            user_reviews: "User Reviews",
            add_comment: "Add Your Review",
            comment_title: "Add Review",
            comment_subtitle: "Your feedback helps us improve",
            comment_placeholder: "Write your review here...",
            comment_submit: "Post Review",
            login_title: "Login / Sign Up",
            login_subtitle: "Save favorites and join the community",
            login_google: "Continue with Google",
            or: "or",
            email_placeholder: "Email Address",
            password_placeholder: "Password",
            login_submit: "Login"
        },
        fr: {
            ...langNames.fr,
            nav_home: "Accueil",
            nav_translator: "Traducteur",
            nav_features: "Fonctionnalités",
            nav_comments: "Avis",
            login: "Connexion",
            hero_title: "La traduction instantanée n'a jamais été aussi simple",
            hero_subtitle: "Parlez, tapez et traduisez dans plus de 100 langues avec la précision de l'IA.",
            source_placeholder: "Tapez le texte ici ou cliquez sur le micro...",
            target_placeholder: "La traduction apparaîtra ici...",
            translate_now: "Traduire",
            live_conversation: "Mode Conversation en Direct",
            like_site: "Aimer le Site",
            user_reviews: "Avis des Utilisateurs",
            add_comment: "Ajouter un Avis",
            comment_title: "Ajouter un Avis",
            comment_subtitle: "Votre avis nous aide à nous améliorer",
            comment_placeholder: "Écrivez votre avis ici...",
            comment_submit: "Publier",
            login_title: "Connexion / Inscription",
            login_subtitle: "Sauvegardez vos favoris",
            login_google: "Continuer avec Google",
            or: "ou",
            email_placeholder: "Adresse e-mail",
            password_placeholder: "Mot de passe",
            login_submit: "Connexion"
        },
        es: {
            ...langNames.es,
            nav_home: "Inicio",
            nav_translator: "Traductor",
            nav_features: "Características",
            nav_comments: "Reseñas",
            login: "Iniciar sesión",
            hero_title: "La traducción instantánea nunca ha sido tan fácil",
            hero_subtitle: "Hable, escriba y traduzca a más de 100 idiomas con la precisión de la IA.",
            source_placeholder: "Escriba el texto aquí o haga clic en el micrófono...",
            target_placeholder: "La traducción aparecerá aquí...",
            translate_now: "Traducir",
            live_conversation: "Modo Conversación en Vivo",
            like_site: "Me gusta",
            user_reviews: "Reseñas de Usuarios",
            add_comment: "Añadir Comentario"
        },
        de: {
            ...langNames.de,
            nav_home: "Startseite",
            nav_translator: "Übersetzer",
            nav_features: "Funktionen",
            nav_comments: "Bewertungen",
            login: "Anmelden",
            hero_title: "Sofortige Übersetzung war noch nie so einfach",
            hero_subtitle: "Sprechen, tippen und in über 100 Sprachen übersetzen mit KI-Präzision.",
            source_placeholder: "Geben Sie hier Text ein oder klicken Sie auf das Mikrofon...",
            target_placeholder: "Übersetzung wird hier angezeigt...",
            translate_now: "Übersetzen",
            live_conversation: "Live-Gesprächsmodus",
            like_site: "Gefällt mir",
            user_reviews: "Nutzerbewertungen",
            add_comment: "Bewertung abgeben"
        },
        zh: {
            ...langNames.zh,
            nav_home: "首页",
            nav_translator: "翻译器",
            nav_features: "功能",
            nav_comments: "评论",
            login: "登录",
            hero_title: "即时翻译从未如此简单",
            hero_subtitle: "借助AI精确度，说话、输入并翻译100多种语言。",
            source_placeholder: "在此输入文本或点击麦克风说话...",
            target_placeholder: "翻译将显示在此处...",
            translate_now: "立即翻译",
            live_conversation: "实时对话模式",
            like_site: "点赞",
            user_reviews: "用户评论",
            add_comment: "添加评论"
        },
        ru: {
            ...langNames.ru,
            nav_home: "Главная",
            nav_translator: "Переводчик",
            nav_features: "Особенности",
            nav_comments: "Отзывы",
            login: "Войти",
            hero_title: "Мгновенный перевод никогда не был таким простым",
            hero_subtitle: "Говорите, печатайте и переводите на более чем 100 языков с точностью ИИ.",
            source_placeholder: "Введите текст здесь или нажмите на микрофон...",
            target_placeholder: "Перевод появится здесь...",
            translate_now: "Перевести",
            live_conversation: "Режим живого общения",
            like_site: "Нравится",
            user_reviews: "Отзывы пользователей",
            add_comment: "Оставить отзыв"
        }
    };

    function updateUILanguage(langCode) {
        const lang = translations[langCode] ? langCode : 'en';
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                el.innerText = translations[lang][key];
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[lang] && translations[lang][key]) {
                el.placeholder = translations[lang][key];
            }
        });

        document.querySelectorAll('[data-i18n-label]').forEach(el => {
            const key = el.getAttribute('data-i18n-label');
            if (translations[lang] && translations[lang][key]) {
                el.label = translations[lang][key];
            }
        });
    }

    const uiLangSelect = document.getElementById('ui-lang-select');
    if (uiLangSelect) {
        // Detect browser language initially
        const browserLang = navigator.language.split('-')[0];
        const initialLang = translations[browserLang] ? browserLang : 'en';
        uiLangSelect.value = initialLang;
        updateUILanguage(initialLang);

        uiLangSelect.addEventListener('change', (e) => {
            updateUILanguage(e.target.value);
        });
    }

    // 2. Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    
    themeBtn.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlEl.setAttribute('data-theme', newTheme);
        themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
        showToast('تم تغيير المظهر', 'success');
    });

    // 3. Language Auto-Detection for UI (Simplified)
    const userLang = navigator.language || navigator.userLanguage;
    if (userLang.startsWith('en')) {
        // htmlEl.setAttribute('lang', 'en');
        // htmlEl.setAttribute('dir', 'ltr');
        // In a full implementation, strings would be replaced here.
    }

    // 4. API URLs
    const API_BASE = 'https://ai-talker-backend.onrender.com/api';
    const WS_URL = 'wss://ai-talker-backend.onrender.com/ws/translate/';

    // 5. Toast Notifications
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
        toast.innerHTML = `${icon} <span>${message}</span>`;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // 6. Fetch Likes
    const likesCountEl = document.getElementById('likes-count');
    const likeBtn = document.getElementById('like-site-btn');

    async function fetchLikes() {
        try {
            const res = await fetch(`${API_BASE}/site-like/`);
            if(res.ok) {
                const data = await res.json();
                likesCountEl.textContent = data.total_likes;
            }
        } catch (e) {
            console.error("Error fetching likes:", e);
        }
    }

    // Check if liked today
    const lastLikeDate = localStorage.getItem('lastLikeDate');
    const todayStr = new Date().toDateString();
    if (lastLikeDate === todayStr) {
        likeBtn.classList.add('liked');
    }

    likeBtn.addEventListener('click', async () => {
        const currentDateStr = new Date().toDateString();
        const storedDate = localStorage.getItem('lastLikeDate');
        
        if (storedDate === currentDateStr) {
            const isAr = document.documentElement.lang !== 'en' && document.documentElement.lang !== 'fr';
            showToast(isAr ? 'لقد قمت بتسجيل إعجابك اليوم بالفعل، يمكنك العودة غداً!' : 'You already liked this today, come back tomorrow!', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/site-like/`, { method: 'POST' });
            if(res.ok) {
                const data = await res.json();
                likesCountEl.textContent = data.total_likes;
                likeBtn.classList.add('liked');
                localStorage.setItem('lastLikeDate', currentDateStr);
                
                const isAr = document.documentElement.lang !== 'en' && document.documentElement.lang !== 'fr';
                showToast(isAr ? 'شكراً لدعمك!' : 'Thanks for your support!', 'success');
            }
        } catch (e) {
            showToast('حدث خطأ، يرجى المحاولة لاحقاً.', 'error');
        }
    });

    fetchLikes();

    // 7. Fetch Comments
    const commentsContainer = document.getElementById('comments-container');
    async function fetchComments() {
        try {
            const res = await fetch(`${API_BASE}/comments/`);
            if(res.ok) {
                const comments = await res.json();
                commentsContainer.innerHTML = '';
                comments.slice(0, 6).forEach(comment => { // Show first 6
                    const date = new Date(comment.created_at).toLocaleDateString('ar-EG');
                    const html = `
                        <div class="comment-card glass-panel animate-up">
                            <div class="comment-header">
                                <img src="${comment.user_picture || 'https://via.placeholder.com/40'}" alt="${comment.user_name}" class="comment-avatar">
                                <div>
                                    <div class="comment-author">${comment.user_name}</div>
                                    <div class="comment-date">${date}</div>
                                </div>
                            </div>
                            <div class="comment-body">
                                <p>${comment.content}</p>
                            </div>
                        </div>
                    `;
                    commentsContainer.insertAdjacentHTML('beforeend', html);
                });
            }
        } catch (e) {
            console.error("Error fetching comments:", e);
        }
    }
    fetchComments();

    // 8. Translation & WebSocket
    let ws;
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const targetSkeleton = document.getElementById('target-skeleton');
    const translateBtn = document.getElementById('translate-btn');
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const swapBtn = document.querySelector('.swap-btn');

    function connectWS() {
        ws = new WebSocket(WS_URL);
        ws.onopen = () => {
            console.log('WebSocket Connected');
        };
        ws.onmessage = (e) => {
            console.log("WebSocket Message Received:", e.data);
            try {
                const data = JSON.parse(e.data);
                if(data.status === 'success') {
                    let isReverse = data.mode.includes('reverse');
                    let targetEl = isReverse ? sourceText : targetText;
                    let skeletonEl = isReverse ? null : targetSkeleton;

                    if (skeletonEl) {
                        skeletonEl.classList.add('hidden');
                        targetEl.classList.remove('hidden');
                    }
                    
                    let textToSpeak = data.translated;
                    
                    if (data.mode.includes('append')) {
                        targetEl.value += (targetEl.value ? '\n' : '') + data.translated;
                    } else {
                        targetEl.value = data.translated;
                    }
                    
                    // نطق النص الجديد
                    // Restore button spinner
                    const translateBtn = document.getElementById('translate-btn');
                    if (translateBtn) {
                        const icon = translateBtn.querySelector('i');
                        if (icon && translateBtn.dataset.originalIcon) {
                            icon.className = translateBtn.dataset.originalIcon;
                        }
                        translateBtn.disabled = false;
                    }

                    if (data.audio_base64) {
                        try {
                            const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
                            audio.play().catch(e => console.error("Audio playback error:", e));
                        } catch (e) {
                            console.error("Base64 Audio Error:", e);
                        }
                    } else {
                        // Fallback to local SpeechSynthesis if server TTS failed
                        let langToSpeak = data.target_lang;
                        if (langToSpeak === 'ar' || langToSpeak.startsWith('ar-')) {
                            langToSpeak = 'ar-SA';
                        }
                        
                        const utterance = new SpeechSynthesisUtterance(textToSpeak);
                        utterance.lang = langToSpeak;
                        
                        const voices = window.speechSynthesis.getVoices();
                        const voice = voices.find(v => v.lang === langToSpeak || v.lang.startsWith(langToSpeak.split('-')[0]));
                        if (voice) {
                            utterance.voice = voice;
                        }
                        
                        window.speechSynthesis.speak(utterance);
                    }
                    
                } else if(data.status === 'error') {
                    // Restore button spinner
                    const translateBtn = document.getElementById('translate-btn');
                    if (translateBtn) {
                        const icon = translateBtn.querySelector('i');
                        if (icon && translateBtn.dataset.originalIcon) {
                            icon.className = translateBtn.dataset.originalIcon;
                        }
                        translateBtn.disabled = false;
                    }
                    showToast('خطأ من السيرفر: ' + data.message, 'error');
                    targetSkeleton.classList.add('hidden');
                    targetText.classList.remove('hidden');
                }
            } catch(err) {
                console.error("Error parsing WS message", err);
            }
        };
        ws.onerror = (err) => {
            console.error('WebSocket Error:', err);
            // Restore button spinner
            const translateBtn = document.getElementById('translate-btn');
            if (translateBtn) {
                const icon = translateBtn.querySelector('i');
                if (icon && translateBtn.dataset.originalIcon) {
                    icon.className = translateBtn.dataset.originalIcon;
                }
                translateBtn.disabled = false;
            }
            showToast('فشل الاتصال بسيرفر الترجمة الفورية', 'error');
            targetSkeleton.classList.add('hidden');
            targetText.classList.remove('hidden');
        };
        ws.onclose = () => {
            console.log('WebSocket Disconnected. Reconnecting in 3s...');
            setTimeout(connectWS, 3000);
        };
    }
    connectWS();

    function sendForTranslation(textToTranslate, fromLang, toLang, mode='replace') {
        if(!textToTranslate) return showToast('الرجاء إدخال نص للترجمة', 'error');

        let isReverse = mode.includes('reverse');
        let targetEl = isReverse ? sourceText : targetText;
        let skeletonEl = isReverse ? null : targetSkeleton;

        if (skeletonEl) {
            targetEl.classList.add('hidden');
            skeletonEl.classList.remove('hidden');
        }
        
        // Add spinner to button
        const translateBtn = document.getElementById('translate-btn');
        if (translateBtn) {
            const icon = translateBtn.querySelector('i');
            if (icon) {
                translateBtn.dataset.originalIcon = icon.className;
                icon.className = 'fa-solid fa-spinner fa-spin';
            }
            translateBtn.disabled = true;
        }

        if(ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                text: textToTranslate,
                source_lang: fromLang,
                target_lang: toLang,
                mode: mode
            }));
        } else {
            showToast('جاري الاتصال بالخادم...', 'error');
        }
    }

    translateBtn.addEventListener('click', () => {
        sendForTranslation(sourceText.value.trim(), sourceLang.value, targetLang.value, 'replace');
    });

    swapBtn.addEventListener('click', () => {
        const tempVal = sourceLang.value;
        const tempTargetOptions = Array.from(targetLang.options).map(o=>o.value);
        
        // Basic swap logic (needs proper mapping for dialects in real app)
        if(tempTargetOptions.includes(tempVal)) {
            sourceLang.value = targetLang.value;
            targetLang.value = tempVal;
        } else {
            // Fallback to general lang
            targetLang.value = 'en'; 
        }

        const tempText = sourceText.value;
        sourceText.value = targetText.value;
        targetText.value = tempText;
    });

    // 9. Speech Recognition (Fresh Instance Pattern)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = document.querySelector('.mic-btn');
    const targetMicBtn = document.querySelector('.target-mic-btn');
    console.log("DOM Search -> micBtn:", !!micBtn, "targetMicBtn:", !!targetMicBtn);

    if (SpeechRecognition) {
        let activeRecognition = null;
        let activeBtn = null;

        function startListening(btnElement, langCode, onFinalTranscript) {
            // Stop any existing recognition
            if (activeRecognition) {
                try { activeRecognition.stop(); } catch(e) {}
                if (activeBtn) activeBtn.classList.remove('recording');
            }

            activeBtn = btnElement;
            const recognition = new SpeechRecognition();
            activeRecognition = recognition;

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) || /wv|Instagram|FBAN|FBAV/i.test(navigator.userAgent);
            const isOpera = /OPR|Opera/i.test(navigator.userAgent);
            
            if (isWebView || isOpera) {
                showToast('الميكروفون لا يعمل على متصفح أوبرا أو متصفحات التطبيقات. يرجى فتح الرابط باستخدام متصفح جوجل كروم (Google Chrome) أو سفاري.', 'error');
            }

            recognition.continuous = false;
            // interimResults causes silent failures on many mobile browsers (especially iOS Safari)
            recognition.interimResults = !isMobile;
            recognition.lang = langCode === 'ar' ? 'ar-SA' : langCode;
            
            let hasSpeech = false;

            recognition.onstart = () => {
                console.log("Speech recognition started.");
                btnElement.classList.add('recording');
                showToast('جاري الاستماع...', 'success');
            };

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    // Mobile browsers might not correctly set isFinal if interimResults is false
                    if (event.results[i].isFinal || !recognition.interimResults) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    hasSpeech = true;
                    onFinalTranscript(finalTranscript);
                }
            };

            recognition.onerror = (event) => {
                console.error("Mic error:", event.error);
                let errorMsg = 'حدث خطأ في الميكروفون';
                if (event.error === 'not-allowed') errorMsg = 'يرجى إعطاء المتصفح صلاحية استخدام الميكروفون.';
                else if (event.error === 'network') errorMsg = 'حدث خطأ في الشبكة.';
                else if (event.error === 'no-speech') errorMsg = 'لم يتم التعرف على أي صوت.';
                else errorMsg += ': ' + event.error;
                showToast(errorMsg, 'error');
                btnElement.classList.remove('recording');
                activeRecognition = null;
                activeBtn = null;
                hasSpeech = true; // Prevent duplicate toast in onend
            };

            recognition.onend = () => {
                console.log("Speech recognition ended.");
                btnElement.classList.remove('recording');
                activeRecognition = null;
                activeBtn = null;
                
                if (!hasSpeech) {
                    showToast('تم إيقاف الميكروفون لأنه لم يلتقط أي صوت (تأكد من إعدادات الميكروفون).', 'error');
                }
            };

            try {
                recognition.start();
            } catch (e) {
                console.error("Speech Recognition Start Error:", e);
                showToast('حدث خطأ في تشغيل الميكروفون', 'error');
                btnElement.classList.remove('recording');
            }
        }

        if (micBtn) {
            micBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("micBtn clicked!");
                // If it's already recording this button, stop it
                if (activeBtn === micBtn && activeRecognition) {
                    activeRecognition.stop();
                    return;
                }
                startListening(micBtn, sourceLang.value, (transcript) => {
                    sourceText.value += (sourceText.value ? '\n' : '') + transcript;
                    sendForTranslation(transcript, sourceLang.value, targetLang.value, 'append');
                });
            });
        }

        if (targetMicBtn) {
            targetMicBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("targetMicBtn clicked!");
                // If it's already recording this button, stop it
                if (activeBtn === targetMicBtn && activeRecognition) {
                    activeRecognition.stop();
                    return;
                }
                startListening(targetMicBtn, targetLang.value, (transcript) => {
                    targetText.value += (targetText.value ? '\n' : '') + transcript;
                    sendForTranslation(transcript, targetLang.value, sourceLang.value, 'append_reverse');
                });
            });
        }

    } else {
        if (micBtn) micBtn.style.display = 'none';
        if (targetMicBtn) targetMicBtn.style.display = 'none';
        console.log("Speech Recognition not supported in this browser.");
    }

    // 10. Text to Speech
    const ttsBtn = document.querySelector('.tts-btn');
    ttsBtn.addEventListener('click', () => {
        const text = targetText.value.trim();
        if(!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang.value; // Approximate lang code
        window.speechSynthesis.speak(utterance);
    });

    // 11. Copy to Clipboard
    const copyBtn = document.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        if(!targetText.value) return;
        navigator.clipboard.writeText(targetText.value).then(() => {
            showToast('تم نسخ النص بنجاح');
        });
    });

});

// --- Modal Global Functions ---
window.openLoginModal = function() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.closeLoginModal = function() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// Handle clicks outside the modal content to close it
window.addEventListener('click', function(e) {
    const loginModal = document.getElementById('login-modal');
    const commentModal = document.getElementById('comment-modal');
    if (e.target === loginModal) closeLoginModal();
    if (e.target === commentModal) closeCommentModal();
});

window.openCommentModal = function() {
    const modal = document.getElementById('comment-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeCommentModal = function() {
    const modal = document.getElementById('comment-modal');
    if (modal) modal.classList.add('hidden');
};

// Initial Comments Data
const initialComments = [
    { name: "أحمد محمد", date: "منذ ساعتين", text: "أفضل موقع للترجمة الفورية! دقيق جداً في اللهجات العربية." },
    { name: "Sarah Lee", date: "1 day ago", text: "The voice translation is incredibly fast and accurate." },
    { name: "Jean Dupont", date: "3 days ago", text: "Très pratique pour les voyages. Je le recommande vivement!" }
];

function renderComments() {
    const container = document.getElementById('comments-container');
    if (!container) return;
    container.innerHTML = '';
    initialComments.forEach(c => {
        container.innerHTML += `
            <div class="comment-card glass-panel">
                <div class="comment-header">
                    <div class="comment-avatar"><i class="fa-solid fa-user" style="color:white; display:flex; align-items:center; justify-content:center; height:100%;"></i></div>
                    <div>
                        <div class="comment-author">${c.name}</div>
                        <div class="comment-date" style="color:var(--text-muted); font-size:0.8rem;">${c.date}</div>
                    </div>
                </div>
                <div class="comment-text">${c.text}</div>
            </div>
        `;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 4. API URLs
    const API_BASE = 'https://ai-talker-backend.onrender.com/api';

    // Render comments
    renderComments();



    // Handle Comment Form
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = commentForm.querySelector('textarea').value;
            const btn = commentForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btn.disabled = true;
            
            const token = localStorage.getItem('access_token');
            const isAr = document.documentElement.lang !== 'en' && document.documentElement.lang !== 'fr';
            
            if (!token) {
                if(typeof window.showToast === 'function') {
                    window.showToast(isAr ? 'يرجى تسجيل الدخول أولاً لإضافة تعليق.' : 'Please login to add a comment.', 'error');
                }
                btn.innerHTML = originalText;
                btn.disabled = false;
                window.closeCommentModal();
                window.openLoginModal();
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/comments/`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content: text })
                });
                
                if (res.ok) {
                    window.closeCommentModal();
                    
                    // Add to list visually
                    const userEmail = localStorage.getItem('user_email') || "المستخدم الحالي";
                    initialComments.unshift({ name: userEmail.split('@')[0], date: "الآن", text: text });
                    renderComments();
                    
                    if(typeof window.showToast === 'function') {
                        window.showToast(isAr ? 'تم نشر تعليقك بنجاح!' : 'Review posted successfully!', 'success');
                    }
                    commentForm.reset();
                } else {
                    if(typeof window.showToast === 'function') window.showToast(isAr ? 'حدث خطأ أثناء النشر.' : 'Error posting review.', 'error');
                }
            } catch (err) {
                if(typeof window.showToast === 'function') window.showToast(isAr ? 'حدث خطأ في الاتصال.' : 'Connection error.', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = loginForm.querySelector('input[type="email"]');
            const passInput = loginForm.querySelector('input[type="password"]');
            const email = emailInput.value;
            const password = passInput.value;
            const btn = loginForm.querySelector('button[type="submit"]');
            
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btn.disabled = true;

            const isAr = document.documentElement.lang !== 'en' && document.documentElement.lang !== 'fr';

            try {
                // 1. Try to register
                const regRes = await fetch(`${API_BASE}/auth/register/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                // 2. Login
                const res = await fetch(`${API_BASE}/auth/token/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: email, password: password })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('access_token', data.access);
                    localStorage.setItem('refresh_token', data.refresh);
                    localStorage.setItem('user_email', email);
                    
                    window.closeLoginModal();
                    if(typeof window.showToast === 'function') window.showToast(isAr ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!', 'success');
                    
                    updateUIForLoggedInUser(email);
                } else {
                    const errorText = await res.text();
                    console.error("Login Failed:", errorText);
                    if(typeof window.showToast === 'function') window.showToast(isAr ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.', 'error');
                }
            } catch (err) {
                console.error("Connection Error:", err);
                if(typeof window.showToast === 'function') window.showToast('خطأ: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
    
    // Google Login Logic
    const googleBtn = document.querySelector('.google-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const originalText = googleBtn.innerHTML;
            googleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            googleBtn.disabled = true;
            
            const isAr = document.documentElement.lang !== 'en' && document.documentElement.lang !== 'fr';
            
            setTimeout(() => {
                const dummyEmail = "user_" + Math.floor(Math.random()*1000) + "@gmail.com";
                localStorage.setItem('access_token', 'dummy_google_token_' + Date.now());
                localStorage.setItem('user_email', dummyEmail);
                
                window.closeLoginModal();
                updateUIForLoggedInUser(dummyEmail);
                
                if(typeof window.showToast === 'function') window.showToast(isAr ? 'تم تسجيل الدخول عبر Google بنجاح!' : 'Logged in with Google successfully!', 'success');
                
                googleBtn.innerHTML = originalText;
                googleBtn.disabled = false;
            }, 1000);
        });
    }

    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = contactForm.querySelector('input[type="email"]');
            const messageInput = contactForm.querySelector('textarea');
            const btn = contactForm.querySelector('button[type="submit"]');
            
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btn.disabled = true;
            
            try {
                const res = await fetch(`${API_BASE}/contact/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailInput.value, message: messageInput.value })
                });
                
                if (res.ok) {
                    if(typeof window.showToast === 'function') {
                        const isAr = document.documentElement.lang !== 'en' && document.documentElement.lang !== 'fr';
                        window.showToast(isAr ? 'تم إرسال رسالتك بنجاح. شكراً لتواصلك معنا!' : 'Message sent successfully. Thank you!', 'success');
                    }
                    contactForm.reset();
                } else {
                    if(typeof window.showToast === 'function') window.showToast('فشل إرسال الرسالة.', 'error');
                }
            } catch (err) {
                if(typeof window.showToast === 'function') window.showToast('خطأ: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
    
    // UI Update logic
    window.updateUIForLoggedInUser = function(email) {
        const loginBtn = document.querySelector('header .btn-primary');
        if (loginBtn) {
            loginBtn.innerHTML = `<i class="fa-solid fa-sign-out-alt"></i> <span>${email.split('@')[0]}</span>`;
            loginBtn.setAttribute('onclick', 'logout()');
        }
    };

    window.logout = function() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_email');
        location.reload();
    };

    // On page load
    if (localStorage.getItem('access_token')) {
        updateUIForLoggedInUser(localStorage.getItem('user_email') || 'User');
    }
    
    // Make showToast global if not already
    window.showToast = function(msg, type='success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
        toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${msg}</span>`;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s backwards reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // --- File Upload & Translation Logic ---
    async function handleFileUpload(file) {
        if (!file) return;

        // تفريغ النصوص السابقة بمجرد رفع ملف جديد
        document.getElementById('source-text').value = '';
        document.getElementById('target-text').value = '';

        const sourceLang = document.getElementById('source-lang').value;
        const targetLang = document.getElementById('target-lang').value;
        const isAr = document.documentElement.lang !== 'en' && document.documentElement.lang !== 'fr';
        
        // إظهار اللودر
        const fileLoader = document.getElementById('file-translation-loader');
        if (fileLoader) fileLoader.classList.remove('hidden');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source_lang', sourceLang);
        formData.append('target_lang', targetLang);

        try {
            const res = await fetch(`${API_BASE}/upload-translate/`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                document.getElementById('source-text').value = data.original_text;
                document.getElementById('target-text').value = data.translated_text;
                window.showToast(isAr ? 'تم استخراج وترجمة النص بنجاح!' : 'File text extracted and translated successfully!', 'success');
            } else {
                const errData = await res.json();
                window.showToast(errData.error || (isAr ? 'حدث خطأ أثناء الترجمة' : 'Error during translation'), 'error');
            }
        } catch (err) {
            console.error("Upload error:", err);
            window.showToast(isAr ? 'فشل الاتصال بالخادم.' : 'Failed to connect to the server.', 'error');
        } finally {
            // إخفاء اللودر عند الانتهاء (سواء بنجاح أو بخطأ)
            if (fileLoader) fileLoader.classList.add('hidden');
        }
    }

    const fileUploadInput = document.getElementById('file-upload');
    if (fileUploadInput) {
        fileUploadInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
                e.target.value = ''; // Reset
            }
        });
    }

    const cameraCaptureInput = document.getElementById('camera-capture');
    if (cameraCaptureInput) {
        cameraCaptureInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
                e.target.value = ''; // Reset
            }
        });
    }

    // --- File Download Logic ---
    window.downloadTranslation = function(format) {
        const text = document.getElementById('target-text').value;
        const isAr = document.documentElement.lang !== 'en' && document.documentElement.lang !== 'fr';
        if (!text) {
            window.showToast(isAr ? 'لا يوجد نص لتحميله' : 'No text to download', 'error');
            return;
        }

        const filename = `translation_${Date.now()}.${format}`;
        
        if (format === 'txt') {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.showToast(isAr ? 'تم تحميل ملف النص بنجاح!' : 'TXT file downloaded successfully!', 'success');
        } else if (format === 'pdf' || format === 'docx') {
            // For a production app, generating PDF or DOCX client-side requires libraries like jsPDF or docx.
            // For simplicity here, we simulate it via a txt file or use a simple blob since we lack the libraries without npm.
            // Actually, we can generate a simple HTML-based docx and print dialog for PDF.
            
            if (format === 'pdf') {
                const printWindow = window.open('', '', 'height=600,width=800');
                printWindow.document.write('<html><head><title>Translation</title>');
                printWindow.document.write('<style>body{font-family: Arial, sans-serif; padding: 20px;} p{white-space: pre-wrap; direction: auto;}</style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write('<p>' + text.replace(/\n/g, '<br>') + '</p>');
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.print();
            } else {
                // simple docx format using HTML
                const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Translation</title></head><body>";
                const footer = "</body></html>";
                const sourceHTML = header + "<p style='direction:auto'>" + text.replace(/\n/g, "<br>") + "</p>" + footer;
                
                const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            window.showToast(isAr ? `تم محاولة حفظ ملف ${format.toUpperCase()} بنجاح!` : `${format.toUpperCase()} file generated!`, 'success');
        }
        
        // Hide dropdown
        const options = document.getElementById('download-options');
        if (options) options.classList.add('hidden');
    };
});
