// Modal Management System
class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.focusStack = [];
        this.init();
    }

    init() {
        // Handle escape key globally
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                this.closeTopModal();
            }
        });
    }

    open(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with id "${modalId}" not found`);
            return false;
        }

        // Store current focus
        this.focusStack.push(document.activeElement);

        // Show modal
        modal.classList.remove('hidden');
        this.activeModals.add(modalId);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Focus management
        this.setupFocusTrap(modal);
        
        // Auto-focus first focusable element
        const firstFocusable = this.getFirstFocusableElement(modal);
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }

        // Add animation class
        const content = modal.querySelector('[class*="transform"]');
        if (content) {
            content.classList.add('animate-slide-up');
        }

        // Trigger custom event
        window.dispatchEvent(new CustomEvent('modalOpened', { detail: { modalId, options } }));

        return true;
    }

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal || !this.activeModals.has(modalId)) {
            return false;
        }

        // Hide modal
        modal.classList.add('hidden');
        this.activeModals.delete(modalId);

        // Restore body scroll if no modals are open
        if (this.activeModals.size === 0) {
            document.body.style.overflow = '';
        }

        // Restore focus
        const previousFocus = this.focusStack.pop();
        if (previousFocus && typeof previousFocus.focus === 'function') {
            previousFocus.focus();
        }

        // Remove focus trap
        this.removeFocusTrap(modal);

        // Trigger custom event
        window.dispatchEvent(new CustomEvent('modalClosed', { detail: { modalId } }));

        return true;
    }

    closeTopModal() {
        if (this.activeModals.size === 0) return false;
        
        const modals = Array.from(this.activeModals);
        const topModal = modals[modals.length - 1];
        return this.close(topModal);
    }

    closeAll() {
        const modals = Array.from(this.activeModals);
        modals.forEach(modalId => this.close(modalId));
    }

    toggle(modalId, options = {}) {
        if (this.activeModals.has(modalId)) {
            return this.close(modalId);
        } else {
            return this.open(modalId, options);
        }
    }

    isOpen(modalId) {
        return this.activeModals.has(modalId);
    }

    setupFocusTrap(modal) {
        const focusableElements = this.getFocusableElements(modal);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const trapFocus = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        modal.addEventListener('keydown', trapFocus);
        modal._focusTrap = trapFocus;
    }

    removeFocusTrap(modal) {
        if (modal._focusTrap) {
            modal.removeEventListener('keydown', modal._focusTrap);
            delete modal._focusTrap;
        }
    }

    getFocusableElements(container) {
        const selector = [
            'button:not([disabled])',
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');

        return Array.from(container.querySelectorAll(selector))
            .filter(el => {
                return el.offsetWidth > 0 && el.offsetHeight > 0 && 
                       getComputedStyle(el).visibility !== 'hidden';
            });
    }

    getFirstFocusableElement(container) {
        const elements = this.getFocusableElements(container);
        return elements[0] || null;
    }

    // Utility method to create a simple modal
    createModal(id, title, content, options = {}) {
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'fixed inset-0 z-50 hidden';
        
        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" onclick="window.modalManager.close('${id}')"></div>
            <div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4">
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
                    ${title ? `
                        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${title}</h3>
                        </div>
                    ` : ''}
                    <div class="p-6">
                        ${content}
                    </div>
                    ${options.showFooter !== false ? `
                        <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 space-x-reverse">
                            <button onclick="window.modalManager.close('${id}')" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                ${window.i18n?.t('cancel') || 'Cancel'}
                            </button>
                            ${options.primaryAction ? `
                                <button onclick="${options.primaryAction.handler}" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                                    ${options.primaryAction.label}
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    // Confirmation dialog
    confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const id = `confirm-${Date.now()}`;
            const modal = this.createModal(id, title, `<p class="text-gray-600 dark:text-gray-400">${message}</p>`, {
                primaryAction: {
                    label: options.confirmLabel || window.i18n?.t('confirm') || 'Confirm',
                    handler: `window.modalManager.close('${id}'); window.modalManager._resolveConfirm && window.modalManager._resolveConfirm(true);`
                }
            });

            // Override cancel button
            const cancelBtn = modal.querySelector('button');
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    this.close(id);
                    resolve(false);
                };
            }

            this._resolveConfirm = resolve;
            this.open(id);

            // Clean up after close
            const cleanup = () => {
                setTimeout(() => {
                    if (modal.parentNode) {
                        document.body.removeChild(modal);
                    }
                    delete this._resolveConfirm;
                }, 300);
            };
            
            window.addEventListener('modalClosed', cleanup, { once: true });
        });
    }

    // Alert dialog
    alert(title, message, options = {}) {
        return new Promise((resolve) => {
            const id = `alert-${Date.now()}`;
            const modal = this.createModal(id, title, `<p class="text-gray-600 dark:text-gray-400">${message}</p>`, {
                showFooter: false
            });

            // Add OK button
            const content = modal.querySelector('.p-6:last-child');
            content.innerHTML += `
                <div class="mt-6 flex justify-end">
                    <button onclick="window.modalManager.close('${id}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                        ${options.okLabel || window.i18n?.t('ok') || 'OK'}
                    </button>
                </div>
            `;

            this.open(id);
            
            // Clean up after close
            modal.addEventListener('modalClosed', () => {
                setTimeout(() => {
                    document.body.removeChild(modal);
                    resolve();
                }, 300);
            });
        });
    }
}

// Create global instance
window.modalManager = new ModalManager();

// Convenience global functions
window.openModal = (id, options) => window.modalManager.open(id, options);
window.closeModal = (id) => window.modalManager.close(id);
window.toggleModal = (id, options) => window.modalManager.toggle(id, options);