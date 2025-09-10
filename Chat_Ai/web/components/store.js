// Local Storage Management Module
class Store {
    constructor() {
        this.prefix = 'chatai_';
        this.defaults = {
            theme: 'system',
            language: 'ar',
            density: 'cozy',
            fontSize: 14,
            apiBaseUrl: 'http://localhost:8000',
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
            lastChat: null,
            pinnedChats: [],
            chatSettings: {},
        };
    }

    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(this.prefix + key);
            if (value === null) {
                return defaultValue !== null ? defaultValue : this.defaults[key];
            }
            return JSON.parse(value);
        } catch (error) {
            console.warn('Error reading from localStorage:', error);
            return defaultValue !== null ? defaultValue : this.defaults[key];
        }
    }

    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Error writing to localStorage:', error);
            return false;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.warn('Error removing from localStorage:', error);
            return false;
        }
    }

    clear() {
        try {
            const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
            keys.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.warn('Error clearing localStorage:', error);
            return false;
        }
    }

    // Chat-specific methods
    getChatHistory() {
        return this.get('chatHistory', []);
    }

    setChatHistory(history) {
        return this.set('chatHistory', history);
    }

    addToHistory(chatName) {
        const history = this.getChatHistory();
        const filtered = history.filter(name => name !== chatName);
        filtered.unshift(chatName);
        
        // Keep only last 50 chats
        const limited = filtered.slice(0, 50);
        return this.setChatHistory(limited);
    }

    removeFromHistory(chatName) {
        const history = this.getChatHistory();
        const filtered = history.filter(name => name !== chatName);
        return this.setChatHistory(filtered);
    }

    // Pinned chats
    getPinnedChats() {
        return this.get('pinnedChats', []);
    }

    setPinnedChats(pinned) {
        return this.set('pinnedChats', pinned);
    }

    togglePinChat(chatName) {
        const pinned = this.getPinnedChats();
        const index = pinned.indexOf(chatName);
        
        if (index === -1) {
            pinned.push(chatName);
        } else {
            pinned.splice(index, 1);
        }
        
        return this.setPinnedChats(pinned);
    }

    isChatPinned(chatName) {
        return this.getPinnedChats().includes(chatName);
    }

    // Chat settings
    getChatSettings(chatName) {
        const allSettings = this.get('chatSettings', {});
        return allSettings[chatName] || {};
    }

    setChatSettings(chatName, settings) {
        const allSettings = this.get('chatSettings', {});
        allSettings[chatName] = { ...allSettings[chatName], ...settings };
        return this.set('chatSettings', allSettings);
    }

    // Export/Import
    exportSettings() {
        const settings = {};
        Object.keys(this.defaults).forEach(key => {
            settings[key] = this.get(key);
        });
        return settings;
    }

    importSettings(settings) {
        try {
            Object.keys(settings).forEach(key => {
                if (this.defaults.hasOwnProperty(key)) {
                    this.set(key, settings[key]);
                }
            });
            return true;
        } catch (error) {
            console.warn('Error importing settings:', error);
            return false;
        }
    }

    // Utility methods
    getStorageUsage() {
        let total = 0;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                total += localStorage.getItem(key).length;
            }
        });
        return total;
    }

    getStorageInfo() {
        const usage = this.getStorageUsage();
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
        
        return {
            usage: usage,
            usageFormatted: this.formatBytes(usage),
            keyCount: keys.length,
            keys: keys.map(key => key.replace(this.prefix, ''))
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Create global instance
window.store = new Store();