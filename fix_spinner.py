import re

with open('frontend/js/main.js', 'r') as f:
    content = f.read()

# We need to change the translate button icon to a spinner when translating
# Find sendForTranslation function
replace_this = """        if (skeletonEl) {
            targetEl.classList.add('hidden');
            skeletonEl.classList.remove('hidden');
        }

        if(ws && ws.readyState === WebSocket.OPEN) {"""

with_this = """        if (skeletonEl) {
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

        if(ws && ws.readyState === WebSocket.OPEN) {"""

content = content.replace(replace_this, with_this)

replace_this_2 = """                    if (data.audio_base64) {"""

with_this_2 = """                    // Restore button spinner
                    const translateBtn = document.getElementById('translate-btn');
                    if (translateBtn) {
                        const icon = translateBtn.querySelector('i');
                        if (icon && translateBtn.dataset.originalIcon) {
                            icon.className = translateBtn.dataset.originalIcon;
                        }
                        translateBtn.disabled = false;
                    }

                    if (data.audio_base64) {"""

content = content.replace(replace_this_2, with_this_2)

replace_this_3 = """                } else if(data.status === 'error') {
                    showToast('خطأ من السيرفر: ' + data.message, 'error');"""

with_this_3 = """                } else if(data.status === 'error') {
                    // Restore button spinner
                    const translateBtn = document.getElementById('translate-btn');
                    if (translateBtn) {
                        const icon = translateBtn.querySelector('i');
                        if (icon && translateBtn.dataset.originalIcon) {
                            icon.className = translateBtn.dataset.originalIcon;
                        }
                        translateBtn.disabled = false;
                    }
                    showToast('خطأ من السيرفر: ' + data.message, 'error');"""

content = content.replace(replace_this_3, with_this_3)

replace_this_4 = """        ws.onerror = (err) => {
            console.error('WebSocket Error:', err);
            showToast('فشل الاتصال بسيرفر الترجمة الفورية', 'error');"""

with_this_4 = """        ws.onerror = (err) => {
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
            showToast('فشل الاتصال بسيرفر الترجمة الفورية', 'error');"""

content = content.replace(replace_this_4, with_this_4)

with open('frontend/js/main.js', 'w') as f:
    f.write(content)
