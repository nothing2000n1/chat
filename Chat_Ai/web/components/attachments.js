// File Attachment Management Module
class AttachmentManager {
    constructor() {
        this.attachments = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxFiles = 5;
        this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.supportedAudioTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupPasteHandler();
    }

    setupEventListeners() {
        const attachBtn = document.getElementById('attachBtn');
        const fileInput = document.getElementById('fileInput');

        attachBtn?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset input
        });
    }

    setupDragAndDrop() {
        const composer = document.getElementById('composer');
        if (!composer) return;

        let dragCounter = 0;

        composer.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            this.showDropZone();
        });

        composer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                this.hideDropZone();
            }
        });

        composer.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        composer.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            this.hideDropZone();
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }

    setupPasteHandler() {
        document.addEventListener('paste', (e) => {
            const items = Array.from(e.clipboardData.items);
            const files = items
                .filter(item => item.kind === 'file')
                .map(item => item.getAsFile())
                .filter(file => file);

            if (files.length > 0) {
                e.preventDefault();
                this.handleFiles(files);
            }
        });
    }

    async handleFiles(files) {
        const validFiles = [];
        
        for (const file of files) {
            try {
                await this.validateFile(file);
                validFiles.push(file);
            } catch (error) {
                window.toast?.error(error.message);
            }
        }

        if (validFiles.length > 0) {
            await this.addFiles(validFiles);
        }
    }

    async validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            throw new Error(`${file.name}: ${window.i18n?.t('fileTooLarge') || 'File too large'} (${this.formatFileSize(file.size)} > ${this.formatFileSize(this.maxFileSize)})`);
        }

        // Check file type
        const isImage = this.supportedImageTypes.includes(file.type);
        const isAudio = this.supportedAudioTypes.includes(file.type);
        
        if (!isImage && !isAudio) {
            throw new Error(`${file.name}: ${window.i18n?.t('fileTypeNotSupported') || 'File type not supported'}`);
        }

        // Check total number of attachments
        if (this.attachments.length >= this.maxFiles) {
            throw new Error(window.i18n?.t('tooManyFiles') || `Maximum ${this.maxFiles} files allowed`);
        }

        return true;
    }

    async addFiles(files) {
        for (const file of files) {
            const attachment = await this.createAttachment(file);
            this.attachments.push(attachment);
        }
        
        this.updateUI();
    }

    async createAttachment(file) {
        const attachment = {
            id: this.generateId(),
            file,
            name: file.name,
            size: file.size,
            type: this.getAttachmentType(file.type),
            mime: file.type,
            data: null,
            preview: null
        };

        // Convert to base64
        attachment.data = await this.fileToBase64(file);

        // Create preview for images
        if (attachment.type === 'image') {
            attachment.preview = await this.createImagePreview(file);
        }

        return attachment;
    }

    getAttachmentType(mimeType) {
        if (this.supportedImageTypes.includes(mimeType)) {
            return 'image';
        } else if (this.supportedAudioTypes.includes(mimeType)) {
            return 'audio';
        }
        return 'file';
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async createImagePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    removeAttachment(id) {
        this.attachments = this.attachments.filter(att => att.id !== id);
        this.updateUI();
    }

    clearAttachments() {
        this.attachments = [];
        this.updateUI();
    }

    updateUI() {
        const preview = document.getElementById('attachmentsPreview');
        const list = document.getElementById('attachmentsList');
        
        if (!preview || !list) return;

        if (this.attachments.length === 0) {
            preview.classList.add('hidden');
            return;
        }

        preview.classList.remove('hidden');
        list.innerHTML = '';

        this.attachments.forEach(attachment => {
            const element = this.createAttachmentElement(attachment);
            list.appendChild(element);
        });
    }

    createAttachmentElement(attachment) {
        const element = document.createElement('div');
        element.className = 'attachment-preview relative';
        element.dataset.id = attachment.id;

        if (attachment.type === 'image') {
            element.innerHTML = `
                <img src="${attachment.preview}" alt="${attachment.name}" class="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600">
                <button class="attachment-remove absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors" onclick="window.attachmentManager.removeAttachment('${attachment.id}')">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
                <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate">
                    ${attachment.name}
                </div>
            `;
        } else if (attachment.type === 'audio') {
            element.innerHTML = `
                <div class="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center">
                    <i data-lucide="music" class="w-6 h-6 text-gray-500 dark:text-gray-400"></i>
                    <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">Audio</span>
                </div>
                <button class="attachment-remove absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors" onclick="window.attachmentManager.removeAttachment('${attachment.id}')">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
                <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate">
                    ${attachment.name}
                </div>
            `;
        }

        // Add tooltip with file info
        element.title = `${attachment.name}\n${this.formatFileSize(attachment.size)}\n${attachment.mime}`;

        return element;
    }

    showDropZone() {
        const composer = document.getElementById('composer');
        if (composer) {
            composer.classList.add('border-2', 'border-dashed', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        }
    }

    hideDropZone() {
        const composer = document.getElementById('composer');
        if (composer) {
            composer.classList.remove('border-2', 'border-dashed', 'border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        }
    }

    // Get attachments in API format
    getAttachmentsForAPI() {
        return this.attachments.map(att => ({
            type: att.type,
            name: att.name,
            mime: att.mime,
            data: att.data
        }));
    }

    // Add audio recording as attachment
    async addAudioRecording(audioBlob, filename = 'recording.webm') {
        try {
            // Create a File object from the blob
            const file = new File([audioBlob], filename, { type: audioBlob.type });
            
            await this.validateFile(file);
            const attachment = await this.createAttachment(file);
            this.attachments.push(attachment);
            this.updateUI();
            
            return attachment;
        } catch (error) {
            window.toast?.error(error.message);
            throw error;
        }
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getTotalSize() {
        return this.attachments.reduce((total, att) => total + att.size, 0);
    }

    getAttachmentCount() {
        return this.attachments.length;
    }

    hasAttachments() {
        return this.attachments.length > 0;
    }

    // Image lightbox functionality
    showImageLightbox(imageSrc, title = '') {
        const lightbox = document.createElement('div');
        lightbox.className = 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4';
        lightbox.onclick = (e) => {
            if (e.target === lightbox) {
                document.body.removeChild(lightbox);
            }
        };

        lightbox.innerHTML = `
            <div class="relative max-w-full max-h-full">
                <img src="${imageSrc}" alt="${title}" class="max-w-full max-h-full object-contain">
                <button class="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors" onclick="document.body.removeChild(this.closest('.fixed'))">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
                ${title ? `<div class="absolute bottom-4 left-4 right-4 text-center text-white bg-black/50 rounded p-2">${title}</div>` : ''}
            </div>
        `;

        document.body.appendChild(lightbox);
        lucide.createIcons();

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(lightbox);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
}

// Create global instance
window.attachmentManager = new AttachmentManager();