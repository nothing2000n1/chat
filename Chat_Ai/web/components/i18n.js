// Internationalization Module
class I18n {
    constructor() {
        this.currentLang = 'ar';
        this.translations = {
            ar: {
                // App Title
                appTitle: 'Chat AI - محادثة ذكية',
                
                // Header
                newChat: 'محادثة جديدة',
                apiBaseUrl: 'رابط API',
                searchChats: 'البحث في المحادثات...',
                connected: 'متصل',
                disconnected: 'غير متصل',
                
                // Theme
                theme: 'المظهر',
                themeSystem: 'تلقائي',
                themeLight: 'فاتح',
                themeDark: 'داكن',
                
                // Language
                language: 'اللغة',
                arabic: 'العربية',
                english: 'English',
                
                // Settings
                settings: 'الإعدادات',
                density: 'كثافة العرض',
                densityCozy: 'مريح',
                densityCompact: 'مضغوط',
                fontSize: 'حجم الخط',
                fontSmall: 'صغير',
                fontLarge: 'كبير',
                save: 'حفظ',
                cancel: 'إلغاء',
                
                // Messages
                welcomeTitle: 'مرحباً بك في Chat AI',
                welcomeSubtitle: 'ابدأ محادثة جديدة أو اختر محادثة موجودة من الشريط الجانبي',
                typeMessage: 'اكتب رسالتك هنا...',
                send: 'إرسال',
                attachFile: 'إرفاق ملف',
                voiceRecord: 'تسجيل صوتي',
                recording: 'جاري التسجيل',
                
                // Quick Actions
                summarize: 'تلخيص',
                translateToEn: 'ترجم للإنجليزية',
                explain: 'اشرح',
                
                // Command Palette
                commandPalette: 'لوحة الأوامر',
                typeCommand: 'اكتب أمر...',
                newChatCmd: 'محادثة جديدة',
                switchTheme: 'تغيير المظهر',
                switchLanguage: 'تغيير اللغة',
                copyApiUrl: 'نسخ رابط API',
                
                // Toasts
                chatCreated: 'تم إنشاء المحادثة بنجاح',
                chatCreateError: 'خطأ في إنشاء المحادثة',
                messageSent: 'تم إرسال الرسالة',
                messageError: 'خطأ في إرسال الرسالة',
                fileTooLarge: 'حجم الملف كبير جداً',
                fileTypeNotSupported: 'نوع الملف غير مدعوم',
                recordingStarted: 'بدأ التسجيل',
                recordingStopped: 'توقف التسجيل',
                recordingError: 'خطأ في التسجيل',
                copied: 'تم النسخ',
                
                // Time
                now: 'الآن',
                minuteAgo: 'منذ دقيقة',
                minutesAgo: 'منذ {count} دقائق',
                hourAgo: 'منذ ساعة',
                hoursAgo: 'منذ {count} ساعات',
                dayAgo: 'منذ يوم',
                daysAgo: 'منذ {count} أيام',
                
                // Context Menu
                rename: 'إعادة تسمية',
                delete: 'حذف',
                pin: 'تثبيت',
                unpin: 'إلغاء التثبيت',
                copy: 'نسخ',
                regenerate: 'إعادة توليد',
                confirm: 'تأكيد',
                ok: 'موافق',
                
                // Errors
                networkError: 'خطأ في الشبكة',
                serverError: 'خطأ في الخادم',
                invalidResponse: 'استجابة غير صالحة',
                chatNotFound: 'المحادثة غير موجودة',
                
                // Accessibility
                closeModal: 'إغلاق النافذة',
                openMenu: 'فتح القائمة',
                playAudio: 'تشغيل الصوت',
                pauseAudio: 'إيقاف الصوت',
                removeAttachment: 'إزالة المرفق',
            },
            
            en: {
                // App Title
                appTitle: 'Chat AI - Smart Conversation',
                
                // Header
                newChat: 'New Chat',
                apiBaseUrl: 'API Base URL',
                searchChats: 'Search chats...',
                connected: 'Connected',
                disconnected: 'Disconnected',
                
                // Theme
                theme: 'Theme',
                themeSystem: 'System',
                themeLight: 'Light',
                themeDark: 'Dark',
                
                // Language
                language: 'Language',
                arabic: 'العربية',
                english: 'English',
                
                // Settings
                settings: 'Settings',
                density: 'Display Density',
                densityCozy: 'Cozy',
                densityCompact: 'Compact',
                fontSize: 'Font Size',
                fontSmall: 'Small',
                fontLarge: 'Large',
                save: 'Save',
                cancel: 'Cancel',
                
                // Messages
                welcomeTitle: 'Welcome to Chat AI',
                welcomeSubtitle: 'Start a new conversation or select an existing one from the sidebar',
                typeMessage: 'Type your message here...',
                send: 'Send',
                attachFile: 'Attach File',
                voiceRecord: 'Voice Record',
                recording: 'Recording',
                
                // Quick Actions
                summarize: 'Summarize',
                translateToEn: 'Translate to Arabic',
                explain: 'Explain',
                
                // Command Palette
                commandPalette: 'Command Palette',
                typeCommand: 'Type a command...',
                newChatCmd: 'New Chat',
                switchTheme: 'Switch Theme',
                switchLanguage: 'Switch Language',
                copyApiUrl: 'Copy API URL',
                
                // Toasts
                chatCreated: 'Chat created successfully',
                chatCreateError: 'Error creating chat',
                messageSent: 'Message sent',
                messageError: 'Error sending message',
                fileTooLarge: 'File too large',
                fileTypeNotSupported: 'File type not supported',
                recordingStarted: 'Recording started',
                recordingStopped: 'Recording stopped',
                recordingError: 'Recording error',
                copied: 'Copied',
                
                // Time
                now: 'now',
                minuteAgo: 'a minute ago',
                minutesAgo: '{count} minutes ago',
                hourAgo: 'an hour ago',
                hoursAgo: '{count} hours ago',
                dayAgo: 'a day ago',
                daysAgo: '{count} days ago',
                
                // Context Menu
                rename: 'Rename',
                delete: 'Delete',
                pin: 'Pin',
                unpin: 'Unpin',
                copy: 'Copy',
                regenerate: 'Regenerate',
                confirm: 'Confirm',
                ok: 'OK',
                
                // Errors
                networkError: 'Network error',
                serverError: 'Server error',
                invalidResponse: 'Invalid response',
                chatNotFound: 'Chat not found',
                
                // Accessibility
                closeModal: 'Close modal',
                openMenu: 'Open menu',
                playAudio: 'Play audio',
                pauseAudio: 'Pause audio',
                removeAttachment: 'Remove attachment',
            }
        };
    }

    t(key, params = {}) {
        let text = this.translations[this.currentLang][key] || key;
        
        // Replace parameters
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });
        
        return text;
    }

    setLanguage(lang) {
        if (!this.translations[lang]) return;
        
        this.currentLang = lang;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        // Update document title
        document.title = this.t('appTitle');
        
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = this.t(key);
            } else {
                element.textContent = this.t(key);
            }
        });
        
        // Update all elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
        
        // Update font family
        document.body.className = document.body.className.replace(/font-(ar|en)/, `font-${lang}`);
        if (!document.body.className.includes(`font-${lang}`)) {
            document.body.classList.add(`font-${lang}`);
        }
        
        // Trigger custom event for other components
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return this.t('now');
        if (minutes === 1) return this.t('minuteAgo');
        if (minutes < 60) return this.t('minutesAgo', { count: minutes });
        if (hours === 1) return this.t('hourAgo');
        if (hours < 24) return this.t('hoursAgo', { count: hours });
        if (days === 1) return this.t('dayAgo');
        return this.t('daysAgo', { count: days });
    }
}

// Create global instance
window.i18n = new I18n();