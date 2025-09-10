// Main Application Module
class ChatApp {
    constructor() {
        this.currentChat = null;
        this.chats = [];
        this.isStreaming = false;
        this.streamController = null;
        this.messageHistory = [];
        
        console.log('ChatApp constructor called');
        // Don't call init immediately, wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            // DOM is already loaded
            setTimeout(() => this.init(), 100);
        }
    }

    async init() {
        try {
            console.log('Initializing ChatApp...');
            
            // Initialize components
            this.initializeSettings();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            
            // Load initial data
            try {
                await this.loadChatHistory();
            } catch (error) {
                console.warn('Could not load chat history:', error);
                // Continue initialization even if history fails
            }
            
            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
                console.log('Lucide icons initialized');
            } else {
                console.warn('Lucide not available');
            }
            
            console.log('Chat AI initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            // Don't show toast error during initialization
            console.error('Application failed to initialize:', error.message);
        }
    }

    initializeSettings() {
        console.log('Initializing settings...');
        
        try {
            // Load and apply settings with fallbacks
            const theme = window.store?.get('theme', 'system') || 'system';
            const language = window.store?.get('language', 'ar') || 'ar';
            const apiBaseUrl = window.store?.get('apiBaseUrl', 'http://localhost:8000') || 'http://localhost:8000';

            // Apply theme
            if (window.themeManager) {
                window.themeManager.setTheme(theme);
            }
            
            // Apply language
            if (window.i18n) {
                window.i18n.setLanguage(language);
            }
            
            // Set API base URL
            if (window.apiClient) {
                window.apiClient.setBaseUrl(apiBaseUrl);
            }
            
            const apiInput = document.getElementById('apiBaseUrl');
            if (apiInput) {
                apiInput.value = apiBaseUrl;
            }
        } catch (error) {
            console.error('Error initializing settings:', error);
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // New Chat Button
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                console.log('New chat button clicked');
                this.showNewChatDialog();
            });
            console.log('New chat button listener added');
        }

        // Send Button - Most Important!
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Send button clicked!');
                this.sendMessage();
            });
            console.log('Send button listener added');
        } else {
            console.error('Send button not found!');
        }

        // Message Input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => this.handleInputChange());
            messageInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
            console.log('Message input listeners added');
        } else {
            console.error('Message input not found!');
        }

        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                console.log('Theme toggle clicked');
                if (window.themeManager) {
                    window.themeManager.toggle();
                }
            });
        }

        // Language Toggle
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                console.log('Language toggle clicked');
                this.toggleLanguage();
            });
        }

        // Settings Button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                console.log('Settings button clicked');
                this.openSettings();
            });
        }

        // Mobile Menu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                console.log('Mobile menu clicked');
                this.toggleSidebar();
            });
        }

        // API Base URL
        const apiBaseUrl = document.getElementById('apiBaseUrl');
        if (apiBaseUrl) {
            apiBaseUrl.addEventListener('change', (e) => {
                console.log('API URL changed:', e.target.value);
                if (window.apiClient) {
                    window.apiClient.setBaseUrl(e.target.value);
                }
                if (window.store) {
                    window.store.set('apiBaseUrl', e.target.value);
                }
            });
        }

        console.log('Event listeners setup complete');
    }

    setupKeyboardShortcuts() {
        console.log('Setting up keyboard shortcuts...');
        document.addEventListener('keydown', (e) => {
            // Command palette (Cmd/Ctrl + K)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.openCommandPalette();
            }
            
            // New chat (Alt + N)
            if (e.altKey && e.key === 'n') {
                e.preventDefault();
                this.showNewChatDialog();
            }
        });
    }

    // Chat Management
    async loadChatHistory() {
        console.log('Loading chat history...');
        if (!window.apiClient) {
            console.warn('API client not available');
            return;
        }
        
        try {
            this.chats = await window.apiClient.getHistory() || [];
            console.log('Loaded chats:', this.chats);
            this.renderChatList();
        } catch (error) {
            console.error('Error loading chat history:', error);
            // Don't show error toast during initialization
            this.chats = [];
            this.renderChatList();
        }
    }

    renderChatList() {
        const chatList = document.getElementById('chatList');
        if (!chatList) return;
        
        console.log('Rendering chat list with', this.chats.length, 'chats');
        
        if (this.chats.length === 0) {
            chatList.innerHTML = '<div class="p-4 text-center text-gray-500">No chats yet</div>';
            return;
        }
        
        chatList.innerHTML = this.chats.map(chat => `
            <div class="chat-item p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${chat === this.currentChat ? 'bg-blue-100 dark:bg-blue-900/30' : ''}" data-chat="${chat}">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-900 dark:text-white truncate">${chat}</span>
                </div>
            </div>
        `).join('');
        
        // Add click listeners to chat items
        chatList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatName = item.dataset.chat;
                console.log('Chat item clicked:', chatName);
                this.openChat(chatName);
            });
        });
    }

    async showNewChatDialog() {
        // Create a proper modal dialog for new chat
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${window.i18n?.t('newChat') || 'New Chat'}</h3>
                </div>
                <div class="p-6">
                    <label for="chatNameInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        ${window.i18n?.t('chatName') || 'Chat Name'}
                    </label>
                    <input 
                        type="text" 
                        id="chatNameInput"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="${window.i18n?.t('enterChatName') || 'Enter chat name...'}"
                        maxlength="50"
                        autocomplete="off"
                    >
                    <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        ${window.i18n?.t('chatNameHint') || 'Use letters, numbers, underscore, and dash only'}
                    </div>
                </div>
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 space-x-reverse">
                    <button id="cancelNewChat" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        ${window.i18n?.t('cancel') || 'Cancel'}
                    </button>
                    <button id="createNewChat" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        ${window.i18n?.t('create') || 'Create'}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const input = modal.querySelector('#chatNameInput');
        const createBtn = modal.querySelector('#createNewChat');
        const cancelBtn = modal.querySelector('#cancelNewChat');
        
        // Focus input
        setTimeout(() => input.focus(), 100);
        
        // Validate input
        const validateInput = () => {
            const value = input.value.trim();
            const isValid = value.length > 0 && value.length <= 50 && /^[A-Za-z0-9_-]+$/.test(value);
            createBtn.disabled = !isValid;
            
            if (value.length > 0 && !isValid) {
                input.classList.add('border-red-500', 'focus:ring-red-500');
                input.classList.remove('border-gray-300', 'focus:ring-blue-500');
            } else {
                input.classList.remove('border-red-500', 'focus:ring-red-500');
                input.classList.add('border-gray-300', 'focus:ring-blue-500');
            }
        };
        
        input.addEventListener('input', validateInput);
        
        // Handle create
        const handleCreate = async () => {
            const chatName = input.value.trim();
            if (!chatName) return;
            
            try {
                createBtn.disabled = true;
                createBtn.textContent = window.i18n?.t('creating') || 'Creating...';
                
                console.log('Creating chat:', chatName);
                if (window.apiClient) {
                    await window.apiClient.createChat(chatName);
                    await this.loadChatHistory();
                    await this.openChat(chatName);
                    if (window.toast) {
                        window.toast.success(window.i18n?.t('chatCreated') || 'Chat created successfully');
                    }
                }
                document.body.removeChild(modal);
            } catch (error) {
                console.error('Error creating chat:', error);
                if (window.toast) {
                    window.toast.error(error.message);
                }
                createBtn.disabled = false;
                createBtn.textContent = window.i18n?.t('create') || 'Create';
            }
        };
        
        // Handle cancel
        const handleCancel = () => {
            document.body.removeChild(modal);
        };
        
        // Event listeners
        createBtn.addEventListener('click', handleCreate);
        cancelBtn.addEventListener('click', handleCancel);
        
        // Enter key to create
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !createBtn.disabled) {
                handleCreate();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        });
        
        // Click outside to cancel
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
        
        // Initial validation
        validateInput();
    }

    async openChat(chatName) {
        if (this.currentChat === chatName) return;
        
        try {
            console.log('Opening chat:', chatName);
            this.showLoadingSkeleton();
            
            if (window.apiClient) {
                const messages = await window.apiClient.openChat(chatName) || [];
                console.log('Loaded messages:', messages);
                this.messageHistory = messages;
                this.currentChat = chatName;
                
                if (window.store) {
                    window.store.set('lastChat', chatName);
                }
                
                this.renderMessages();
                this.updateChatListSelection();
                this.hideWelcomeMessage();
            }
        } catch (error) {
            console.error('Error opening chat:', error);
            if (window.toast) {
                window.toast.error(error.message);
            }
            this.showWelcomeMessage();
        }
    }

    // Message Management
    renderMessages() {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;
        
        messagesArea.innerHTML = '';
        
        if (this.messageHistory.length === 0) {
            this.showWelcomeMessage();
            return;
        }
        
        this.messageHistory.forEach((message, index) => {
            const messageElement = this.createMessageElement(message, index);
            messagesArea.appendChild(messageElement);
        });
        
        this.scrollToBottom();
    }

    createMessageElement(message, index) {
        const isUser = message.role === 'user';
        const messageDiv = document.createElement('div');
        
        // Check if we're in RTL mode
        const isRTL = document.documentElement.dir === 'rtl';
        
        // In RTL: user messages go to the left, assistant to the right
        // In LTR: user messages go to the right, assistant to the left
        let justifyClass;
        if (isRTL) {
            justifyClass = isUser ? 'justify-start' : 'justify-end';
        } else {
            justifyClass = isUser ? 'justify-end' : 'justify-start';
        }
        
        messageDiv.className = `message-container flex ${justifyClass} mb-4`;
        
        const bubbleDiv = document.createElement('div');
        
        // Message bubble styling with proper RTL support
        let bubbleClasses = 'message-bubble p-4 max-w-xs lg:max-w-md xl:max-lg rounded-2xl ';
        
        if (isUser) {
            // User message styling
            bubbleClasses += 'bg-blue-600 text-white ';
            if (isRTL) {
                bubbleClasses += 'mr-auto rounded-tl-sm'; // RTL: user messages have rounded corner on top-left
            } else {
                bubbleClasses += 'ml-auto rounded-tr-sm'; // LTR: user messages have rounded corner on top-right
            }
        } else {
            // Assistant message styling
            bubbleClasses += 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 ';
            if (isRTL) {
                bubbleClasses += 'ml-auto rounded-tr-sm'; // RTL: assistant messages have rounded corner on top-right
            } else {
                bubbleClasses += 'mr-auto rounded-tl-sm'; // LTR: assistant messages have rounded corner on top-left
            }
        }
        
        bubbleDiv.className = bubbleClasses;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message.content || '';
        
        bubbleDiv.appendChild(contentDiv);
        messageDiv.appendChild(bubbleDiv);
        
        return messageDiv;
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput?.value.trim();
        
        console.log('sendMessage called, content:', content);
        console.log('Current chat:', this.currentChat);
        
        if (!content) {
            console.log('No content to send');
            return;
        }
        
        if (!this.currentChat) {
            console.log('No current chat, creating new one');
            await this.showNewChatDialog();
            if (!this.currentChat) return;
        }
        
        try {
            console.log('Sending message to:', this.currentChat, 'Content:', content);
            
            // Disable input
            this.setInputState(false);
            
            // Add user message to UI
            this.addMessageToUI({ role: 'user', content });
            
            // Clear input
            if (messageInput) {
                messageInput.value = '';
            }
            this.updateCharCount();
            
            // Show typing indicator
            this.showTypingIndicator();
            
            // Send message
            if (window.apiClient) {
                const stream = await window.apiClient.sendMessage(this.currentChat, content, {
                    stream: true
                });
                
                // Handle streaming response
                await this.handleStreamingResponse(stream);
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            if (window.toast) {
                window.toast.error(error.message);
            }
        } finally {
            this.setInputState(true);
            this.hideTypingIndicator();
        }
    }

    async handleStreamingResponse(stream) {
        let assistantMessage = '';
        const messageElement = this.addMessageToUI({ role: 'assistant', content: '' });
        const contentDiv = messageElement.querySelector('.message-content');
        
        try {
            for await (const chunk of stream) {
                assistantMessage += chunk;
                if (contentDiv) {
                    contentDiv.textContent = assistantMessage + '|';
                }
                this.scrollToBottom();
            }
            
            // Remove typing cursor
            if (contentDiv) {
                contentDiv.textContent = assistantMessage;
            }
            
            // Update message history
            this.messageHistory.push({ role: 'assistant', content: assistantMessage });
            
        } catch (error) {
            console.error('Error handling stream:', error);
            if (contentDiv) {
                contentDiv.textContent = 'Error receiving response';
            }
        }
    }

    addMessageToUI(message) {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return null;
        
        // Hide welcome message
        this.hideWelcomeMessage();
        
        const messageElement = this.createMessageElement(message, this.messageHistory.length);
        messagesArea.appendChild(messageElement);
        
        // Add to history if it's a user message
        if (message.role === 'user') {
            this.messageHistory.push(message);
        }
        
        this.scrollToBottom();
        
        return messageElement;
    }

    showTypingIndicator() {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.className = 'flex justify-end mb-4'; // Assistant side (right)
        indicator.innerHTML = `
            <div class="message-assistant rounded-2xl p-4 max-w-xs ml-auto rounded-tl-sm">
                <div class="flex space-x-1">
                    <div class="typing-dot"></div>
                    <div class="typing-dot" style="animation-delay: 0.1s"></div>
                    <div class="typing-dot" style="animation-delay: 0.2s"></div>
                </div>
            </div>
        `;
        
        messagesArea.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    showLoadingSkeleton() {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;
        
        messagesArea.innerHTML = `
            <div class="space-y-4">
                <div class="flex justify-start">
                    <div class="w-3/4 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
                <div class="flex justify-end">
                    <div class="w-1/2 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
            </div>
        `;
    }

    // UI Helper Methods
    setInputState(enabled) {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (messageInput) messageInput.disabled = !enabled;
        if (sendBtn) sendBtn.disabled = !enabled;
    }

    scrollToBottom() {
        const messagesArea = document.getElementById('messagesArea');
        if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    showWelcomeMessage() {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;
        
        messagesArea.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <i data-lucide="sparkles" class="w-8 h-8 text-white"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Chat AI</h2>
                <p class="text-gray-600 dark:text-gray-400">Start a new conversation or select an existing one from the sidebar</p>
            </div>
        `;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    hideWelcomeMessage() {
        // Welcome message is replaced when rendering messages
    }

    updateChatListSelection() {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('bg-blue-100', 'dark:bg-blue-900/30');
            if (item.dataset.chat === this.currentChat) {
                item.classList.add('bg-blue-100', 'dark:bg-blue-900/30');
            }
        });
    }

    // Input Handling
    handleInputChange() {
        this.updateCharCount();
        this.updateSendButtonState();
    }

    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('Enter key pressed, sending message');
            this.sendMessage();
        }
    }

    updateCharCount() {
        const messageInput = document.getElementById('messageInput');
        const charCount = document.getElementById('charCount');
        
        if (messageInput && charCount) {
            charCount.textContent = messageInput.value.length;
        }
    }

    updateSendButtonState() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (messageInput && sendBtn) {
            const hasContent = messageInput.value.trim().length > 0;
            sendBtn.disabled = !hasContent;
            
            if (hasContent) {
                sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                sendBtn.classList.add('hover:bg-blue-700');
            } else {
                sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
                sendBtn.classList.remove('hover:bg-blue-700');
            }
        }
    }

    // UI State Management
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    toggleLanguage() {
        const currentLang = window.i18n?.getCurrentLanguage();
        const newLang = currentLang === 'ar' ? 'en' : 'ar';
        if (window.i18n) {
            window.i18n.setLanguage(newLang);
        }
        if (window.store) {
            window.store.set('language', newLang);
        }
    }

    openSettings() {
        if (window.modalManager) {
            window.modalManager.open('settingsModal');
        }
    }

    openCommandPalette() {
        const palette = document.getElementById('commandPalette');
        if (palette) {
            palette.classList.remove('hidden');
            const input = document.getElementById('commandInput');
            if (input) {
                input.focus();
            }
        }
    }
}

// Settings functions
function saveSettings() {
    console.log('Saving settings...');
    if (window.modalManager) {
        window.modalManager.close('settingsModal');
    }
    if (window.toast) {
        window.toast.success('Settings saved');
    }
}

function closeSettings() {
    if (window.modalManager) {
        window.modalManager.close('settingsModal');
    }
}

function closeCommandPalette() {
    const palette = document.getElementById('commandPalette');
    if (palette) {
        palette.classList.add('hidden');
    }
}

// Initialize app when DOM is loaded
console.log('App script loaded');

// Create global instance
window.chatApp = new ChatApp();

console.log('ChatApp instance created');