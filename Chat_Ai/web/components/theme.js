// Theme Management Module
class ThemeManager {
    constructor() {
        this.currentTheme = 'system';
        this.init();
    }

    init() {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'system';
        this.setTheme(savedTheme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.currentTheme === 'system') {
                this.applyTheme();
            }
        });
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
        this.updateUI();
        
        // Trigger custom event
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    applyTheme() {
        const html = document.documentElement;
        
        if (this.currentTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            html.classList.toggle('dark', prefersDark);
        } else {
            html.setAttribute('data-theme', this.currentTheme);
            html.classList.toggle('dark', this.currentTheme === 'dark');
        }
    }

    updateUI() {
        // Update theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        const themeSelect = document.getElementById('themeSelect');
        
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            const isDark = document.documentElement.classList.contains('dark');
            
            // Update icon
            icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
            lucide.createIcons();
            
            // Update tooltip
            themeToggle.title = window.i18n?.t('theme') || 'Theme';
        }
        
        if (themeSelect) {
            themeSelect.value = this.currentTheme;
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getEffectiveTheme() {
        if (this.currentTheme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return this.currentTheme;
    }

    toggle() {
        const themes = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    }
}

// Create global instance
window.themeManager = new ThemeManager();