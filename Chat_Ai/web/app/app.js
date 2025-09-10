// Main Application Module
class ChatApp {
    constructor() {
        this.currentChat = null;
        this.chats = [];
        this.isStreaming = false;
        this.streamController = null;
        this.messageHistory = [];
        
        this.init();
    }

    async init() {
        try {
            // Initialize components
            this.initializeSettings();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            this.setupCommandPalette();
            
            // Load initial data
            await this.loadChatHistory();
            
            // Auto-open last chat
            const lastChat = window.store?.get('lastChat');
            if (lastChat && this.chats.includes(lastChat)) {
                await this.openChat(lastChat);
            }
            
            // Initialize Lucide icons
            lucide.createIcons();
            
            // Force icon refresh after a short delay
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }, 500);
            
            console.log('Chat AI initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            window.toast?.error('Error initializing application');
        }
    }

    initializeSettings() {
        // Load and apply settings
        const theme = window.store?.get('theme', 'system');
        const language = window.store?.get('language', 'ar');
        const apiBaseUrl = window.store?.get('apiBaseUrl', 'http://localhost:8000');
        const provider = window.store?.get('provider', 'groq');
        const model = window.store?.get('model', 'llama-3.3-70b-versatile');

        // Apply theme
        window.themeManager?.setTheme(theme);
        
        // Apply language
        window.i18n?.setLanguage(language);
        
        // Set API base URL
        window.apiClient?.setBaseUrl(apiBaseUrl);
        document.getElementById('apiBaseUrl').value = apiBaseUrl;
        
        // Set provider and model
        document.getElementById('providerSelect').value = provider;
        document.getElementById('modelSelect').value = model;
    }

    setupEventListeners() {
        // Sidebar events
        document.getElementById('newChatBtn')?.addEventListener('click', () => this.showNewChatDialog());
        document.getElementById('sidebarToggle')?.addEventListener('click', () => this.toggleSidebar());
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => this.toggleSidebar());
        
        // Header events
        document.getElementById('themeToggle')?.addEventListener('click', () => window.themeManager?.toggle());
        document.getElementById('langToggle')?.addEventListener('click', () => this.toggleLanguage());
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
        
        // Provider/Model selectors
        document.getElementById('providerSelect')?.addEventListener('change', (e) => {
            window.store?.set('provider', e.target.value);
            this.updateModelOptions(e.target.value);
        });
        
        document.getElementById('modelSelect')?.addEventListener('change', (e) => {
            window.store?.set('model', e.target.value);
        });
        
        // API Base URL
        document.getElementById('apiBaseUrl')?.addEventListener('change', (e) => {
            window.apiClient?.setBaseUrl(e.target.value);
            window.store?.set('apiBaseUrl', e.target.value);
        });
        
        // Chat search
        document.getElementById('chatSearch')?.addEventListener('input', (e) => {
            this.filterChats(e.target.value);
        });
        
        // Message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => this.handleInputChange());
            messageInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        }
        
        // Send button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Send button clicked');
                this.sendMessage();
            });
        }
        
        // Voice recording
        document.getElementById('voiceBtn')?.addEventListener('click', () => this.toggleVoiceRecording());
        document.getElementById('pauseRecordingBtn')?.addEventListener('click', () => this.pauseRecording());
        document.getElementById('stopRecordingBtn')?.addEventListener('click', () => this.stopRecording());
        document.getElementById('deleteRecordingBtn')?.addEventListener('click', () => this.deleteRecording());
        
        // Quick actions
        document.querySelectorAll('[data-template]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.dataset.template;
                this.insertTemplate(template);
            });
        });
        
        // Initialize Lucide icons after DOM is ready
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);
        
        // Window events
        window.addEventListener('beforeunload', () => this.saveState());
        window.addEventListener('resize', () => this.handleResize());
        
        // Custom events
        window.addEventListener('languageChanged', () => this.updateLanguageUI());
        window.addEventListener('themeChanged', () => this.updateThemeUI());
        window.addEventListener('connectionChanged', (e) => this.handleConnectionChange(e.detail));
        
        console.log('Event listeners setup complete');
    }

    setupKeyboardShortcuts() {
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
            
            // Focus message input (/)
            if (e.key === '/' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                document.getElementById('messageInput')?.focus();
            }
            
            // Escape key handling
            if (e.key === 'Escape') {
                this.handleEscape();
            }
        });
    }

    setupCommandPalette() {
        const commandInput = document.getElementById('commandInput');
        const commandResults = document.getElementById('commandResults');
        
        if (!commandInput || !commandResults) return;
        
        const commands = [
            {
                id: 'new-chat',
                title: window.i18n?.t('newChatCmd') || 'New Chat',
                icon: 'plus',
                action: () => this.showNewChatDialog()
            },
            {
                id: 'switch-theme',
                title: window.i18n?.t('switchTheme') || 'Switch Theme',
                icon: 'palette',
                action: () => window.themeManager?.toggle()
            },
            {
                id: 'switch-language',
                title: window.i18n?.t('switchLanguage') || 'Switch Language',
                icon: 'globe',
                action: () => this.toggleLanguage()
            },
            {
                id: 'copy-api-url',
                title: window.i18n?.t('copyApiUrl') || 'Copy API URL',
                icon: 'copy',
                action: () => this.copyApiUrl()
            },
            {
                id: 'settings',
                title: window.i18n?.t('settings') || 'Settings',
                icon: 'settings',
                action: () => this.openSettings()
            }
        ];
        
        commandInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = commands.filter(cmd => 
                cmd.title.toLowerCase().includes(query)
            );
            this.renderCommandResults(filtered, commandResults);
        });
        
        commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const firstResult = commandResults.querySelector('[data-command]');
                if (firstResult) {
                    firstResult.click();
                }
            }
        });
        
        // Initial render
        this.renderCommandResults(commands, commandResults);
    }

    renderCommandResults(commands, container) {
        container.innerHTML = commands.map(cmd => `
            <div class="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center space-x-3 space-x-reverse" data-command="${cmd.id}" onclick="this.closest('#commandPalette').querySelector('[data-command=\"${cmd.id}\"]').dispatchEvent(new Event('execute'))">
                <i data-lucide="${cmd.icon}" class="w-5 h-5 text-gray-500"></i>
                <span class="text-gray-900 dark:text-white">${cmd.title}</span>
            </div>
        `).join('');
        
        // Add event listeners
        commands.forEach(cmd => {
            const element = container.querySelector(`[data-command="${cmd.id}"]`);
            element?.addEventListener('execute', () => {
                cmd.action();
                this.closeCommandPalette();
            });
        });
        
        lucide.createIcons();
    }

    showChatMenu(chatName, event) {
        // Simple context menu implementation
        const menu = document.createElement('div');
        menu.className = 'fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        
        const isPinned = window.store?.isChatPinned(chatName);
        
        menu.innerHTML = `
            <button class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 space-x-reverse">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
                <span>${window.i18n?.t('rename') || 'Rename'}</span>
            </button>
            <button class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 space-x-reverse" onclick="window.chatApp.togglePinChat('${chatName}')">
                <i data-lucide="${isPinned ? 'pin-off' : 'pin'}" class="w-4 h-4"></i>
                <span>${isPinned ? (window.i18n?.t('unpin') || 'Unpin') : (window.i18n?.t('pin') || 'Pin')}</span>
            </button>
            <button class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 flex items-center space-x-2 space-x-reverse" onclick="window.chatApp.deleteChat('${chatName}')">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
                <span>${window.i18n?.t('delete') || 'Delete'}</span>
            </button>
        `;
        
        document.body.appendChild(menu);
        lucide.createIcons();
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                document.body.removeChild(menu);
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    togglePinChat(chatName) {
        window.store?.togglePinChat(chatName);
        this.renderChatList();
        window.toast?.success(window.store?.isChatPinned(chatName) ? 'Chat pinned' : 'Chat unpinned');
    }

    deleteChat(chatName) {
        if (confirm('Are you sure you want to delete this chat?')) {
            window.store?.removeFromHistory(chatName);
            this.chats = this.chats.filter(chat => chat !== chatName);
            if (this.currentChat === chatName) {
                this.currentChat = null;
                this.showWelcomeMessage();
            }
            this.renderChatList();
            window.toast?.success('Chat deleted');
        }
    }

    // Chat Management
    async loadChatHistory() {
        try {
            console.log('Loading chat history...');
            this.chats = await window.apiClient?.getHistory() || [];
            console.log('Loaded chats:', this.chats);
            this.renderChatList();
        } catch (error) {
            console.error('Error loading chat history:', error);
            window.toast?.error(window.i18n?.t('networkError') || 'Error loading chat history');
        }
    }

    renderChatList() {
        const chatList = document.getElementById('chatList');
        if (!chatList) return;
        
        const pinnedChats = window.store?.getPinnedChats() || [];
        const sortedChats = [...this.chats].sort((a, b) => {
            const aPinned = pinnedChats.includes(a);
            const bPinned = pinnedChats.includes(b);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return 0;
        });
        
        chatList.innerHTML = sortedChats.map(chat => {
            const isPinned = pinnedChats.includes(chat);
            const isActive = chat === this.currentChat;
            
            return `
                <div class="chat-item p-3 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}" data-chat="${chat}">
                    <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center space-x-2 space-x-reverse">
                                ${isPinned ? '<i data-lucide="pin" class="w-3 h-3 text-gray-400"></i>' : ''}
                                <span class="text-sm font-medium text-gray-900 dark:text-white truncate">${chat}</span>
                            </div>
                        </div>
                        <button class="chat-menu-btn p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" onclick="event.stopPropagation(); this.showChatMenu('${chat}', event)">
                            <i data-lucide="more-vertical" class="w-4 h-4 text-gray-500"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners
        chatList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatName = item.dataset.chat;
                this.openChat(chatName);
            });
            
            // Fix chat menu button
            const menuBtn = item.querySelector('.chat-menu-btn');
            if (menuBtn) {
                menuBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.showChatMenu(item.dataset.chat, e);
                };
            }
        });
        
        lucide.createIcons();
    }

    filterChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            const chatName = item.dataset.chat.toLowerCase();
            const matches = chatName.includes(query.toLowerCase());
            item.style.display = matches ? 'block' : 'none';
        });
    }

    async showNewChatDialog() {
        const chatName = prompt(window.i18n?.t('enterChatName') || 'Enter chat name:');
        if (!chatName) return;
        
        try {
            console.log('Creating chat:', chatName);
            await window.apiClient?.createChat(chatName);
            await this.loadChatHistory();
            await this.openChat(chatName);
            window.toast?.success(window.i18n?.t('chatCreated') || 'Chat created successfully');
        } catch (error) {
            console.error('Error creating chat:', error);
            window.toast?.error(error.message);
        }
    }

    async openChat(chatName) {
        if (this.currentChat === chatName) return;
        
        try {
            console.log('Opening chat:', chatName);
            this.showLoadingSkeleton();
            
            const messages = await window.apiClient?.openChat(chatName) || [];
            console.log('Loaded messages:', messages);
            this.messageHistory = messages;
            this.currentChat = chatName;
            
            window.store?.set('lastChat', chatName);
            window.store?.addToHistory(chatName);
            
            this.renderMessages();
            this.updateChatListSelection();
            this.hideWelcomeMessage();
            
        } catch (error) {
            console.error('Error opening chat:', error);
            window.toast?.error(error.message);
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
        messageDiv.className = `message-container flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;
        messageDiv.dataset.index = index;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = `message-bubble p-4 ${isUser ? 'message-user' : 'message-assistant'}`;
        
        // Message content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (message.content) {
            // Process markdown
            const html = marked.parse(message.content);
            const sanitized = DOMPurify.sanitize(html);
            contentDiv.innerHTML = sanitized;
            
            // Add copy buttons to code blocks
            this.addCodeCopyButtons(contentDiv);
        }
        
        // Message actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions flex items-center space-x-2 space-x-reverse mt-2 opacity-0 group-hover:opacity-100 transition-opacity';
        
        actionsDiv.innerHTML = `
            <button class="action-btn p-1 rounded hover:bg-black/10 dark:hover:bg-white/10" onclick="window.chatApp.copyMessage(${index})" title="${window.i18n?.t('copy') || 'Copy'}">
                <i data-lucide="copy" class="w-3 h-3"></i>
            </button>
            ${!isUser ? `
                <button class="action-btn p-1 rounded hover:bg-black/10 dark:hover:bg-white/10" onclick="window.chatApp.regenerateMessage(${index})" title="${window.i18n?.t('regenerate') || 'Regenerate'}">
                    <i data-lucide="refresh-cw" class="w-3 h-3"></i>
                </button>
            ` : ''}
            <button class="action-btn p-1 rounded hover:bg-black/10 dark:hover:bg-white/10" onclick="window.chatApp.deleteMessage(${index})" title="${window.i18n?.t('delete') || 'Delete'}">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
        `;
        
        bubbleDiv.appendChild(contentDiv);
        bubbleDiv.appendChild(actionsDiv);
        bubbleDiv.classList.add('group');
        
        messageDiv.appendChild(bubbleDiv);
        
        // Add timestamp tooltip
        const timestamp = new Date().toLocaleString();
        bubbleDiv.title = timestamp;
        
        return messageDiv;
    }

    addCodeCopyButtons(container) {
        const codeBlocks = container.querySelectorAll('pre code');
        codeBlocks.forEach(codeBlock => {
            const pre = codeBlock.parentElement;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(codeBlock.textContent);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 2000);
            };
            pre.appendChild(copyBtn);
        });
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput?.value.trim();
        
        console.log('sendMessage called, content:', content);
        console.log('Current chat:', this.currentChat);
        console.log('Has attachments:', window.attachmentManager?.hasAttachments());
        
        if (!content && !window.attachmentManager?.hasAttachments()) return;
        
        if (!this.currentChat) {
            console.log('No current chat, creating new one');
            await this.showNewChatDialog();
            if (!this.currentChat) return;
        }
        
        try {
            console.log('Sending message to:', this.currentChat, 'Content:', content);
            
            // Disable input
            this.setInputState(false);
            
            // Get attachments
            const attachments = window.attachmentManager?.getAttachmentsForAPI() || [];
            
            // Add user message to UI
            if (content) {
                this.addMessageToUI({ role: 'user', content });
            }
            
            // Clear input and attachments
            if (messageInput) {
                messageInput.value = '';
            }
            window.attachmentManager?.clearAttachments();
            this.updateCharCount();
            
            // Show typing indicator
            this.showTypingIndicator();
            
            // Send message
            const model = document.getElementById('modelSelect')?.value;
            const stream = await window.apiClient?.sendMessage(this.currentChat, content, {
                model,
                attachments,
                stream: true
            });
            
            // Handle streaming response
            await this.handleStreamingResponse(stream);
            
        } catch (error) {
            console.error('Error sending message:', error);
            window.toast?.error(error.message);
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
                
                // Update message content
                const html = marked.parse(assistantMessage);
                const sanitized = DOMPurify.sanitize(html);
                contentDiv.innerHTML = sanitized + '<span class="typing-cursor">|</span>';
                
                // Add code copy buttons
                this.addCodeCopyButtons(contentDiv);
                
                // Scroll to bottom
                this.scrollToBottom();
            }
            
            // Remove typing cursor
            const cursor = contentDiv.querySelector('.typing-cursor');
            if (cursor) cursor.remove();
            
            // Update message history
            this.messageHistory.push({ role: 'assistant', content: assistantMessage });
            
        } catch (error) {
            console.error('Error handling stream:', error);
            contentDiv.innerHTML = '<span class="text-red-500">Error receiving response</span>';
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
        lucide.createIcons();
        
        return messageElement;
    }

    showTypingIndicator() {
        const messagesArea = document.getElementById('messagesArea');
        if (!messagesArea) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.className = 'flex justify-start mb-4';
        indicator.innerHTML = `
            <div class="message-bubble message-assistant typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
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
                ${Array(3).fill(0).map(() => `
                    <div class="flex justify-start">
                        <div class="w-3/4 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton"></div>
                    </div>
                    <div class="flex justify-end">
                        <div class="w-1/2 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton"></div>
                    </div>
                `).join('')}
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
        const welcomeMessage = document.getElementById('welcomeMessage');
        
        if (messagesArea && welcomeMessage) {
            messagesArea.innerHTML = '';
            messagesArea.appendChild(welcomeMessage.cloneNode(true));
        }
    }

    hideWelcomeMessage() {
        const welcomeMessage = document.querySelector('#messagesArea #welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
    }

    updateChatListSelection() {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('bg-blue-100', 'dark:bg-blue-900/30', 'border', 'border-blue-200', 'dark:border-blue-800');
            if (item.dataset.chat === this.currentChat) {
                item.classList.add('bg-blue-100', 'dark:bg-blue-900/30', 'border', 'border-blue-200', 'dark:border-blue-800');
            }
        });
    }

    // Input Handling
    handleInputChange() {
        this.updateCharCount();
        this.autoResizeTextarea();
        this.updateSendButtonState();
    }

    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
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

    autoResizeTextarea() {
        const textarea = document.getElementById('messageInput');
        if (!textarea) return;
        
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    updateSendButtonState() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (messageInput && sendBtn) {
            const hasContent = messageInput.value.trim().length > 0;
            const hasAttachments = window.attachmentManager?.hasAttachments();
            const shouldEnable = hasContent || hasAttachments;
            sendBtn.disabled = !shouldEnable;
            
            // Visual feedback
            if (shouldEnable) {
                sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                sendBtn.classList.add('hover:bg-blue-700');
            } else {
                sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
                sendBtn.classList.remove('hover:bg-blue-700');
            }
        }
    }

    insertTemplate(template) {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;
        
        const currentValue = messageInput.value;
        const newValue = currentValue ? `${currentValue}\n${template} ` : `${template} `;
        messageInput.value = newValue;
        messageInput.focus();
        
        this.handleInputChange();
    }

    // Voice Recording
    async toggleVoiceRecording() {
        if (!window.audioRecorder?.isSupported()) {
            window.toast?.error('Voice recording not supported');
            return;
        }
        
        try {
            if (window.audioRecorder.isRecording) {
                const audioBlob = await window.audioRecorder.stopRecording();
                if (audioBlob) {
                    await window.attachmentManager?.addAudioRecording(audioBlob);
                    window.toast?.success(window.i18n?.t('recordingStopped') || 'Recording stopped');
                }
            } else {
                await window.audioRecorder.requestPermission();
                await window.audioRecorder.startRecording();
                window.toast?.success(window.i18n?.t('recordingStarted') || 'Recording started');
            }
        } catch (error) {
            console.error('Voice recording error:', error);
            window.toast?.error(error.message);
        }
    }

    pauseRecording() {
        if (window.audioRecorder.isPaused) {
            window.audioRecorder.resumeRecording();
        } else {
            window.audioRecorder.pauseRecording();
        }
    }

    stopRecording() {
        this.toggleVoiceRecording();
    }

    deleteRecording() {
        window.audioRecorder.deleteRecording();
        window.toast?.info('Recording deleted');
    }

    // Message Actions
    copyMessage(index) {
        const message = this.messageHistory[index];
        if (message) {
            navigator.clipboard.writeText(message.content);
            window.toast?.success(window.i18n?.t('copied') || 'Copied');
        }
    }

    async regenerateMessage(index) {
        // Find the last user message before this assistant message
        let userMessageIndex = -1;
        for (let i = index - 1; i >= 0; i--) {
            if (this.messageHistory[i].role === 'user') {
                userMessageIndex = i;
                break;
            }
        }
        
        if (userMessageIndex === -1) return;
        
        const userMessage = this.messageHistory[userMessageIndex];
        
        try {
            // Remove messages after the user message
            this.messageHistory = this.messageHistory.slice(0, userMessageIndex + 1);
            this.renderMessages();
            
            // Resend the user message
            const model = document.getElementById('modelSelect')?.value;
            const stream = await window.apiClient?.sendMessage(this.currentChat, userMessage.content, {
                model,
                stream: true
            });
            
            this.showTypingIndicator();
            await this.handleStreamingResponse(stream);
            
        } catch (error) {
            console.error('Error regenerating message:', error);
            window.toast?.error(error.message);
        } finally {
            this.hideTypingIndicator();
        }
    }

    deleteMessage(index) {
        this.messageHistory.splice(index, 1);
        this.renderMessages();
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
        window.i18n?.setLanguage(newLang);
        window.store?.set('language', newLang);
    }

    updateLanguageUI() {
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            const currentLang = window.i18n?.getCurrentLanguage();
            langToggle.querySelector('span').textContent = currentLang === 'ar' ? 'عربي' : 'English';
        }
    }

    updateThemeUI() {
        // Theme UI is handled by ThemeManager
    }

    updateModelOptions(provider) {
        const modelSelect = document.getElementById('modelSelect');
        if (!modelSelect) return;
        
        // This would be expanded with actual model options per provider
        const models = {
            groq: [
                { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
                { value: 'llama3-8b-8192', label: 'Llama 3 8B' },
                { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
            ],
            openai: [
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
            ],
            anthropic: [
                { value: 'claude-3-opus', label: 'Claude 3 Opus' },
                { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' }
            ],
            google: [
                { value: 'gemini-pro', label: 'Gemini Pro' }
            ]
        };
        
        const providerModels = models[provider] || models.groq;
        modelSelect.innerHTML = providerModels.map(model => 
            `<option value="${model.value}">${model.label}</option>`
        ).join('');
    }

    // Modal and Dialog Management
    openCommandPalette() {
        const palette = document.getElementById('commandPalette');
        const input = document.getElementById('commandInput');
        
        if (palette && input) {
            palette.classList.remove('hidden');
            input.focus();
            input.value = '';
        }
    }

    closeCommandPalette() {
        const palette = document.getElementById('commandPalette');
        if (palette) {
            palette.classList.add('hidden');
        }
    }

    openSettings() {
        window.modalManager?.open('settingsModal');
    }

    handleEscape() {
        // Close command palette
        if (!document.getElementById('commandPalette')?.classList.contains('hidden')) {
            this.closeCommandPalette();
            return;
        }
        
        // Close any open modals
        window.modalManager?.closeTopModal();
    }

    // Utility Methods
    copyApiUrl() {
        const apiUrl = window.apiClient?.getBaseUrl();
        if (apiUrl) {
            navigator.clipboard.writeText(apiUrl);
            window.toast?.success(window.i18n?.t('copied') || 'Copied');
        }
    }

    handleConnectionChange(detail) {
        // Connection status is handled by ConnectionMonitor
        if (!detail.isOnline) {
            window.toast?.warning(window.i18n?.t('connectionLost') || 'Connection lost');
        }
    }

    handleResize() {
        // Handle responsive behavior
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth >= 1024) {
            sidebar?.classList.remove('open');
        }
    }

    saveState() {
        // Save any pending state before page unload
        if (this.currentChat) {
            window.store?.set('lastChat', this.currentChat);
        }
    }
}

// Settings Management
function saveSettings() {
    const theme = document.getElementById('themeSelect')?.value;
    const language = document.getElementById('languageSelect')?.value;
    const density = document.getElementById('densitySelect')?.value;
    const fontSize = document.getElementById('fontSizeRange')?.value;
    
    if (theme) {
        window.themeManager?.setTheme(theme);
        window.store?.set('theme', theme);
    }
    
    if (language) {
        window.i18n?.setLanguage(language);
        window.store?.set('language', language);
    }
    
    if (density) {
        window.store?.set('density', density);
        document.body.dataset.density = density;
    }
    
    if (fontSize) {
        window.store?.set('fontSize', fontSize);
        document.documentElement.style.fontSize = fontSize + 'px';
    }
    
    window.modalManager?.close('settingsModal');
    window.toast?.success('Settings saved');
}

function closeSettings() {
    window.modalManager?.close('settingsModal');
}

// Global click handler for command palette
function closeCommandPalette() {
    window.chatApp?.closeCommandPalette();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});

// Export for global access
window.ChatApp = ChatApp;