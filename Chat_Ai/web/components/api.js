// API Communication Module
class ApiClient {
    constructor() {
        this.baseUrl = 'http://localhost:8000'; // Default fallback
        this.timeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        
        // Try to get from store after initialization
        setTimeout(() => {
            if (window.store) {
                const storedUrl = window.store.get('apiBaseUrl');
                if (storedUrl) {
                    this.baseUrl = storedUrl;
                }
            }
        }, 100);
    }

    setBaseUrl(url) {
        this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
        window.store?.set('apiBaseUrl', this.baseUrl);
    }

    getBaseUrl() {
        return this.baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add timeout support
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        config.signal = controller.signal;

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Handle different content types
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await response.json();
            } else if (contentType?.includes('text/')) {
                return await response.text();
            } else {
                return response;
            }
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }

    async requestWithRetry(endpoint, options = {}, attempts = this.retryAttempts) {
        try {
            return await this.request(endpoint, options);
        } catch (error) {
            if (attempts > 1 && this.shouldRetry(error)) {
                await this.delay(this.retryDelay);
                return this.requestWithRetry(endpoint, options, attempts - 1);
            }
            throw error;
        }
    }

    shouldRetry(error) {
        // Retry on network errors, timeouts, and 5xx server errors
        return error.message.includes('timeout') ||
               error.message.includes('fetch') ||
               error.message.includes('NetworkError') ||
               (error.message.includes('HTTP 5'));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Chat API methods
    async getHistory() {
        try {
            const response = await this.requestWithRetry('/history_chat', {
                method: 'GET'
            });
            return response.chats || [];
        } catch (error) {
            console.error('Error fetching chat history:', error);
            throw new Error(window.i18n?.t('networkError') || 'Network error');
        }
    }

    async createChat(name) {
        try {
            const response = await this.requestWithRetry('/chats/create', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            return response;
        } catch (error) {
            console.error('Error creating chat:', error);
            throw new Error(window.i18n?.t('chatCreateError') || 'Error creating chat');
        }
    }

    async openChat(name) {
        try {
            const response = await this.requestWithRetry('/chats/open_chat', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            return this.parseJsonl(response.jsonl);
        } catch (error) {
            console.error('Error opening chat:', error);
            throw new Error(window.i18n?.t('chatNotFound') || 'Chat not found');
        }
    }

    async sendMessage(chatName, content, options = {}) {
        const { model, systemPrompt, temperature = 0.2, attachments = [], stream = true } = options;
        
        const body = {
            content,
            model,
            system_prompt: systemPrompt,
            temperature,
            attachments
        };

        const url = `/chats/send?name=${encodeURIComponent(chatName)}&stream=${stream}`;

        try {
            if (stream) {
                return this.streamMessage(url, body);
            } else {
                const response = await this.requestWithRetry(url, {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                return response.content;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw new Error(window.i18n?.t('messageError') || 'Error sending message');
        }
    }

    async streamMessage(url, body) {
        const response = await fetch(`${this.baseUrl}${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        return {
            async *[Symbol.asyncIterator]() {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value, { stream: true });
                        yield chunk;
                    }
                } finally {
                    reader.releaseLock();
                }
            }
        };
    }

    parseJsonl(jsonlText) {
        if (!jsonlText) return [];
        
        const lines = jsonlText.trim().split('\n');
        const messages = [];
        
        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                const obj = JSON.parse(line);
                
                // Skip info objects
                if (obj.info) continue;
                
                // Extract messages from chats object
                if (obj.chats && obj.chats.messages) {
                    messages.push(...obj.chats.messages);
                }
            } catch (error) {
                console.warn('Error parsing JSONL line:', line, error);
            }
        }
        
        return messages;
    }

    // Connection testing
    async testConnection() {
        try {
            await this.request('/history_chat', { timeout: 5000 });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const start = Date.now();
            await this.testConnection();
            const latency = Date.now() - start;
            
            return {
                status: 'online',
                latency,
                timestamp: new Date()
            };
        } catch (error) {
            return {
                status: 'offline',
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

// Create global instance
window.apiClient = new ApiClient();

// Connection status monitoring
class ConnectionMonitor {
    constructor() {
        this.isOnline = navigator.onLine;
        this.lastCheck = null;
        this.checkInterval = 30000; // 30 seconds
        this.intervalId = null;
        
        this.init();
    }

    init() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.setStatus(true));
        window.addEventListener('offline', () => this.setStatus(false));
        
        // Start periodic health checks
        this.startMonitoring();
        
        // Initial check
        this.checkConnection();
    }

    startMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        this.intervalId = setInterval(() => {
            this.checkConnection();
        }, this.checkInterval);
    }

    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async checkConnection() {
        try {
            const health = await window.apiClient.healthCheck();
            this.setStatus(health.status === 'online', health.latency);
            this.lastCheck = health.timestamp;
        } catch (error) {
            this.setStatus(false);
        }
    }

    setStatus(isOnline, latency = null) {
        const wasOnline = this.isOnline;
        this.isOnline = isOnline;
        
        this.updateUI(latency);
        
        // Trigger events on status change
        if (wasOnline !== isOnline) {
            window.dispatchEvent(new CustomEvent('connectionChanged', {
                detail: { isOnline, latency }
            }));
        }
    }

    updateUI(latency = null) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        const dot = statusElement.querySelector('div');
        const text = statusElement.querySelector('span');
        
        if (this.isOnline) {
            statusElement.className = 'flex items-center space-x-2 space-x-reverse px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs';
            dot.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
            text.textContent = window.i18n?.t('connected') || 'Connected';
            
            if (latency) {
                statusElement.title = `Latency: ${latency}ms`;
            }
        } else {
            statusElement.className = 'flex items-center space-x-2 space-x-reverse px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs';
            dot.className = 'w-2 h-2 bg-red-500 rounded-full';
            text.textContent = window.i18n?.t('disconnected') || 'Disconnected';
            statusElement.title = '';
        }
    }

    getStatus() {
        return {
            isOnline: this.isOnline,
            lastCheck: this.lastCheck
        };
    }
}

// Create global connection monitor
window.connectionMonitor = new ConnectionMonitor();