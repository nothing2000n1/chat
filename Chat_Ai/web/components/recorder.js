// Audio Recording Module
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.stream = null;
        this.timerInterval = null;
        this.waveform = null;
        
        this.maxDuration = 300000; // 5 minutes
        this.supportedMimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus',
            'audio/ogg'
        ];
        
        this.init();
    }

    init() {
        // Check for MediaRecorder support
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            console.warn('MediaRecorder not supported');
            return;
        }

        // Find supported MIME type
        this.mimeType = this.supportedMimeTypes.find(type => 
            MediaRecorder.isTypeSupported(type)
        ) || 'audio/webm';
    }

    async requestPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Test recording capability
            const testRecorder = new MediaRecorder(stream, { mimeType: this.mimeType });
            testRecorder.stop();
            
            // Stop test stream
            stream.getTracks().forEach(track => track.stop());
            
            return true;
        } catch (error) {
            console.error('Microphone permission denied:', error);
            throw new Error(window.i18n?.t('recordingError') || 'Recording permission denied');
        }
    }

    async startRecording() {
        try {
            if (this.isRecording) return false;

            // Request permission and get stream
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, { 
                mimeType: this.mimeType 
            });

            // Reset state
            this.audioChunks = [];
            this.startTime = Date.now();
            this.pausedTime = 0;
            this.isRecording = true;
            this.isPaused = false;

            // Set up event handlers
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.handleRecordingStop();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                this.stopRecording();
                throw new Error(window.i18n?.t('recordingError') || 'Recording error');
            };

            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            
            // Start timer
            this.startTimer();
            
            // Initialize waveform
            this.initWaveform();
            
            // Update UI
            this.updateUI();
            
            // Auto-stop after max duration
            setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, this.maxDuration);

            return true;
        } catch (error) {
            this.cleanup();
            throw error;
        }
    }

    pauseRecording() {
        if (!this.isRecording || this.isPaused) return false;

        this.mediaRecorder.pause();
        this.isPaused = true;
        this.pausedTime += Date.now() - this.startTime;
        
        this.stopTimer();
        this.updateUI();
        
        return true;
    }

    resumeRecording() {
        if (!this.isRecording || !this.isPaused) return false;

        this.mediaRecorder.resume();
        this.isPaused = false;
        this.startTime = Date.now();
        
        this.startTimer();
        this.updateUI();
        
        return true;
    }

    stopRecording() {
        if (!this.isRecording) return null;

        this.mediaRecorder.stop();
        this.isRecording = false;
        this.isPaused = false;
        
        this.stopTimer();
        this.cleanup();
        
        return new Promise((resolve) => {
            this.mediaRecorder.addEventListener('stop', () => {
                resolve(this.createAudioBlob());
            }, { once: true });
        });
    }

    deleteRecording() {
        if (this.isRecording) {
            this.mediaRecorder.stop();
        }
        
        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        
        this.stopTimer();
        this.cleanup();
        this.hideUI();
    }

    handleRecordingStop() {
        this.cleanup();
    }

    createAudioBlob() {
        if (this.audioChunks.length === 0) return null;
        
        const blob = new Blob(this.audioChunks, { type: this.mimeType });
        return blob;
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimer() {
        const elapsed = this.getElapsedTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        const timerElement = document.getElementById('recordingTimer');
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    getElapsedTime() {
        if (!this.startTime) return 0;
        
        if (this.isPaused) {
            return this.pausedTime;
        } else {
            return this.pausedTime + (Date.now() - this.startTime);
        }
    }

    initWaveform() {
        const waveformElement = document.getElementById('waveform');
        if (!waveformElement || !this.stream) return;

        try {
            // Simple canvas-based waveform
            const canvas = document.createElement('canvas');
            canvas.width = waveformElement.offsetWidth;
            canvas.height = waveformElement.offsetHeight;
            canvas.className = 'w-full h-full';
            
            waveformElement.innerHTML = '';
            waveformElement.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(this.stream);
            
            source.connect(analyser);
            analyser.fftSize = 256;
            
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const draw = () => {
                if (!this.isRecording) return;
                
                requestAnimationFrame(draw);
                
                analyser.getByteFrequencyData(dataArray);
                
                ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const barWidth = (canvas.width / bufferLength) * 2.5;
                let barHeight;
                let x = 0;
                
                for (let i = 0; i < bufferLength; i++) {
                    barHeight = (dataArray[i] / 255) * canvas.height;
                    
                    ctx.fillStyle = `rgba(239, 68, 68, ${0.3 + (dataArray[i] / 255) * 0.7})`;
                    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                    
                    x += barWidth + 1;
                }
            };
            
            draw();
            
            this.waveform = { audioContext, analyser, source };
        } catch (error) {
            console.warn('Waveform visualization not available:', error);
        }
    }

    updateUI() {
        const recordingUI = document.getElementById('recordingUI');
        const voiceBtn = document.getElementById('voiceBtn');
        
        if (this.isRecording) {
            recordingUI?.classList.remove('hidden');
            voiceBtn?.classList.add('bg-red-100', 'dark:bg-red-900/30');
            
            const pauseBtn = document.getElementById('pauseRecordingBtn');
            const pauseIcon = pauseBtn?.querySelector('i');
            
            if (this.isPaused) {
                pauseIcon?.setAttribute('data-lucide', 'play');
                pauseBtn?.setAttribute('title', 'Resume');
            } else {
                pauseIcon?.setAttribute('data-lucide', 'pause');
                pauseBtn?.setAttribute('title', 'Pause');
            }
            
            lucide.createIcons();
        } else {
            this.hideUI();
        }
    }

    hideUI() {
        const recordingUI = document.getElementById('recordingUI');
        const voiceBtn = document.getElementById('voiceBtn');
        
        recordingUI?.classList.add('hidden');
        voiceBtn?.classList.remove('bg-red-100', 'dark:bg-red-900/30');
    }

    cleanup() {
        // Stop timer
        this.stopTimer();
        
        // Clean up waveform
        if (this.waveform) {
            try {
                this.waveform.source.disconnect();
                this.waveform.audioContext.close();
            } catch (error) {
                console.warn('Error cleaning up waveform:', error);
            }
            this.waveform = null;
        }
        
        // Stop stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    // Utility methods
    isSupported() {
        return !!(navigator.mediaDevices && window.MediaRecorder);
    }

    getSupportedMimeTypes() {
        return this.supportedMimeTypes.filter(type => 
            MediaRecorder.isTypeSupported(type)
        );
    }

    getRecordingDuration() {
        return this.getElapsedTime();
    }

    getRecordingSize() {
        return this.audioChunks.reduce((total, chunk) => total + chunk.size, 0);
    }
}

// Create global instance
window.audioRecorder = new AudioRecorder();

// Audio Player for playback
class AudioPlayer {
    constructor() {
        this.currentAudio = null;
        this.isPlaying = false;
    }

    async play(audioBlob, container) {
        try {
            // Stop current audio if playing
            this.stop();

            // Create audio element
            const audio = new Audio();
            audio.src = URL.createObjectURL(audioBlob);
            
            // Create player UI
            const player = this.createPlayerUI(audio, container);
            
            // Set up event listeners
            audio.addEventListener('loadedmetadata', () => {
                this.updateDuration(player, audio.duration);
            });
            
            audio.addEventListener('timeupdate', () => {
                this.updateProgress(player, audio.currentTime, audio.duration);
            });
            
            audio.addEventListener('ended', () => {
                this.handleAudioEnd(player);
            });
            
            this.currentAudio = audio;
            return player;
        } catch (error) {
            console.error('Error playing audio:', error);
            throw error;
        }
    }

    createPlayerUI(audio, container) {
        const player = document.createElement('div');
        player.className = 'audio-player flex items-center space-x-3 space-x-reverse bg-gray-100 dark:bg-gray-700 rounded-lg p-3 my-2';
        
        player.innerHTML = `
            <button class="play-btn p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                <i data-lucide="play" class="w-4 h-4"></i>
            </button>
            <div class="flex-1">
                <div class="waveform-container h-8 bg-gray-200 dark:bg-gray-600 rounded relative overflow-hidden">
                    <div class="progress-bar h-full bg-blue-500 transition-all duration-100" style="width: 0%"></div>
                </div>
                <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span class="current-time">0:00</span>
                    <span class="duration">0:00</span>
                </div>
            </div>
        `;
        
        // Add event listeners
        const playBtn = player.querySelector('.play-btn');
        const waveformContainer = player.querySelector('.waveform-container');
        
        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                playBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4"></i>';
                this.isPlaying = true;
            } else {
                audio.pause();
                playBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>';
                this.isPlaying = false;
            }
            lucide.createIcons();
        });
        
        waveformContainer.addEventListener('click', (e) => {
            const rect = waveformContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            audio.currentTime = percentage * audio.duration;
        });
        
        container.appendChild(player);
        lucide.createIcons();
        
        return player;
    }

    updateDuration(player, duration) {
        const durationElement = player.querySelector('.duration');
        durationElement.textContent = this.formatTime(duration);
    }

    updateProgress(player, currentTime, duration) {
        const progressBar = player.querySelector('.progress-bar');
        const currentTimeElement = player.querySelector('.current-time');
        
        const percentage = (currentTime / duration) * 100;
        progressBar.style.width = `${percentage}%`;
        currentTimeElement.textContent = this.formatTime(currentTime);
    }

    handleAudioEnd(player) {
        const playBtn = player.querySelector('.play-btn');
        const progressBar = player.querySelector('.progress-bar');
        
        playBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>';
        progressBar.style.width = '0%';
        this.isPlaying = false;
        
        lucide.createIcons();
    }

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
            this.isPlaying = false;
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Create global audio player instance
window.audioPlayer = new AudioPlayer();