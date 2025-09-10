// Toast Notification System
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.defaultDuration = 4000;
        this.maxToasts = 5;
        
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = this.defaultDuration, options = {}) {
        const id = this.generateId();
        const toast = this.createToast(id, message, type, options);
        
        // Add to container
        this.container.appendChild(toast);
        this.toasts.set(id, toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('animate-fade-in');
        });
        
        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(id);
            }, duration);
        }
        
        // Limit number of toasts
        this.limitToasts();
        
        // Announce to screen readers
        this.announceToScreenReader(message, type);
        
        return id;
    }

    createToast(id, message, type, options = {}) {
        const toast = document.createElement('div');
        toast.id = `toast-${id}`;
        toast.className = `toast toast-${type} flex items-center justify-between min-w-80 max-w-md p-4 rounded-lg shadow-lg`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        // Icon based on type
        const icon = this.getIcon(type);
        
        // Create content
        const content = document.createElement('div');
        content.className = 'flex items-center space-x-3 space-x-reverse flex-1';
        
        if (icon) {
            const iconElement = document.createElement('div');
            iconElement.className = 'flex-shrink-0';
            iconElement.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i>`;
            content.appendChild(iconElement);
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = 'flex-1 text-sm font-medium';
        messageElement.textContent = message;
        content.appendChild(messageElement);
        
        toast.appendChild(content);
        
        // Add close button if persistent
        if (options.persistent) {
            const closeButton = document.createElement('button');
            closeButton.className = 'flex-shrink-0 ml-3 p-1 rounded hover:bg-black/10 transition-colors';
            closeButton.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i>';
            closeButton.onclick = () => this.dismiss(id);
            closeButton.setAttribute('aria-label', window.i18n?.t('closeModal') || 'Close');
            toast.appendChild(closeButton);
        }
        
        // Add action button if provided
        if (options.action) {
            const actionButton = document.createElement('button');
            actionButton.className = 'flex-shrink-0 ml-3 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors';
            actionButton.textContent = options.action.label;
            actionButton.onclick = () => {
                options.action.handler();
                this.dismiss(id);
            };
            toast.appendChild(actionButton);
        }
        
        // Initialize Lucide icons
        lucide.createIcons({ nameAttr: 'data-lucide' });
        
        return toast;
    }

    getIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        return icons[type];
    }

    dismiss(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;
        
        // Animate out
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s ease-out';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(id);
        }, 300);
    }

    dismissAll() {
        this.toasts.forEach((toast, id) => {
            this.dismiss(id);
        });
    }

    limitToasts() {
        if (this.toasts.size > this.maxToasts) {
            const oldestId = this.toasts.keys().next().value;
            this.dismiss(oldestId);
        }
    }

    announceToScreenReader(message, type) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = `${type}: ${message}`;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Convenience methods
    success(message, duration, options) {
        return this.show(message, 'success', duration, options);
    }

    error(message, duration, options) {
        return this.show(message, 'error', duration, options);
    }

    warning(message, duration, options) {
        return this.show(message, 'warning', duration, options);
    }

    info(message, duration, options) {
        return this.show(message, 'info', duration, options);
    }

    // Persistent toasts
    persistent(message, type = 'info', options = {}) {
        return this.show(message, type, 0, { ...options, persistent: true });
    }

    // Toast with action
    withAction(message, type, actionLabel, actionHandler, duration) {
        return this.show(message, type, duration, {
            action: {
                label: actionLabel,
                handler: actionHandler
            }
        });
    }
}

// Create global instance
window.toast = new ToastManager();

// Convenience global functions
window.showToast = (message, type, duration) => window.toast.show(message, type, duration);
window.showSuccess = (message, duration) => window.toast.success(message, duration);
window.showError = (message, duration) => window.toast.error(message, duration);
window.showWarning = (message, duration) => window.toast.warning(message, duration);
window.showInfo = (message, duration) => window.toast.info(message, duration);