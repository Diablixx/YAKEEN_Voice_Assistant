/**
 * Simplified Voice Processing System
 * One-shot listening: starts automatically, listens for one sentence, processes, then stops
 */

class VoiceProcessor {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.voiceLevelData = null;

        // Simple settings
        this.silenceThreshold = 2000; // 2 seconds of silence to stop
        this.minSpeechDuration = 500; // Minimum speech duration
        this.minSpeechLength = 3; // Minimum characters for valid speech
        this.lastSpeechTime = 0;
        this.speechStartTime = 0;
        this.silenceTimeout = null;

        // Voice level monitoring
        this.voiceLevelInterval = null;
        this.isMonitoringVoiceLevel = false;

        // Event handlers
        this.onResult = null;
        this.onError = null;
        this.onStatusChange = null;
        this.onVoiceLevel = null;

        this.initializeRecognition();
    }

    /**
     * Initialize speech recognition
     */
    initializeRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            Utils.log('Speech recognition not supported in this browser', 'error');
            return false;
        }

        this.recognition = new SpeechRecognition();
        this.setupRecognitionConfig();
        this.setupRecognitionEvents();

        Utils.log('Speech recognition initialized for one-shot listening');
        return true;
    }

    /**
     * Configure speech recognition
     */
    setupRecognitionConfig() {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';
    }

    /**
     * Setup speech recognition event handlers
     */
    setupRecognitionEvents() {
        let interimTranscript = '';
        let finalTranscript = '';

        this.recognition.onstart = () => {
            Utils.log('One-shot speech recognition started');
            this.isListening = true;
            this.updateStatus('listening');
            this.startVoiceLevelMonitoring();
        };

        this.recognition.onresult = (event) => {
            interimTranscript = '';
            finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update speech timing
            const hasContent = finalTranscript.trim() || interimTranscript.trim();
            if (hasContent) {
                this.lastSpeechTime = Date.now();
                if (!this.speechStartTime) {
                    this.speechStartTime = Date.now();
                }
            }

            // Clear existing silence timeout
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = null;
            }

            // Process final results
            if (finalTranscript.trim()) {
                const cleanText = finalTranscript.trim();
                Utils.log(`Final transcript: ${cleanText}`);
                this.processFinalResult(cleanText);
                return; // Stop processing here
            }

            // Set silence timeout for interim results
            if (interimTranscript.trim()) {
                this.silenceTimeout = setTimeout(() => {
                    this.handleSilenceDetected();
                }, this.silenceThreshold);
            }
        };

        this.recognition.onerror = (event) => {
            Utils.log(`Speech recognition error: ${event.error}`, 'error');

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                this.onError?.('Microphone permission denied. Please enable microphone access and refresh the page.');
            } else if (event.error === 'network') {
                this.onError?.('Network error. Please check your internet connection.');
            } else if (event.error !== 'no-speech') {
                this.onError?.(`Speech recognition error: ${event.error}`);
            }

            this.stopListening();
        };

        this.recognition.onend = () => {
            Utils.log('Speech recognition ended - One-shot complete');
            this.isListening = false;
            this.stopVoiceLevelMonitoring();

            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = null;
            }

            this.updateStatus('ready');
            // NO AUTO-RESTART - User must manually restart
        };
    }

    /**
     * Handle silence detection
     */
    handleSilenceDetected() {
        const speechDuration = Date.now() - this.speechStartTime;
        Utils.log(`Silence detected after ${speechDuration}ms of speech`);

        if (speechDuration >= this.minSpeechDuration) {
            Utils.log('Sufficient speech detected, stopping recognition');
            this.stopListening();
        }
    }

    /**
     * Validate if speech is meaningful
     */
    isValidSpeech(text) {
        if (!text || typeof text !== 'string') return false;

        const cleanText = text.trim();

        // Check minimum length
        if (cleanText.length < this.minSpeechLength) {
            Utils.log(`Speech too short: "${cleanText}"`);
            return false;
        }

        // Check for minimum word count
        const words = cleanText.split(/\s+/).filter(word => word.length > 0);
        if (words.length < 1) {
            Utils.log(`Not enough words: "${cleanText}"`);
            return false;
        }

        // Filter out noise patterns
        const noisePatterns = [
            /^(uh|um|ah|eh|mm|hmm)$/i,
            /^[.,;:!?]+$/,
            /^\s*$/,
            /^[a-z]$/i
        ];

        for (const pattern of noisePatterns) {
            if (pattern.test(cleanText)) {
                Utils.log(`Speech matches noise pattern: "${cleanText}"`);
                return false;
            }
        }

        return true;
    }

    /**
     * Process final speech result (one-shot)
     */
    async processFinalResult(text) {
        // Stop listening immediately - one-shot only
        this.stopListening();

        if (!this.isValidSpeech(text)) {
            Utils.log('Invalid speech detected, ignoring');
            this.updateStatus('ready');
            return;
        }

        const cleanText = text.trim();
        Utils.log(`Processing one-shot speech: "${cleanText}"`);
        this.updateStatus('processing');

        try {
            // Send to n8n
            const response = await window.n8nClient.sendWithRetry(cleanText);

            if (response?.text) {
                Utils.log(`Received n8n response: ${response.text.substring(0, 100)}...`);
                await this.speak(response.text);
            } else {
                await this.speak("I received your message but got no response.");
            }

            this.onResult?.(cleanText, response);

        } catch (error) {
            const errorMessage = Utils.getErrorMessage(error);
            Utils.log(`Error processing speech: ${errorMessage}`, 'error');
            await this.speak(`Sorry, I encountered an error processing your request.`);
            this.onError?.(errorMessage);
        }

        this.updateStatus('ready');
        // ONE-SHOT COMPLETE - No restart, user must manually restart
    }

    /**
     * Start one-shot listening
     */
    async startListening() {
        if (this.isListening || !this.recognition) return false;

        try {
            Utils.log('Starting one-shot listening...');
            await this.requestMicrophonePermission();
            this.recognition.start();
            return true;
        } catch (error) {
            Utils.log(`Failed to start listening: ${Utils.getErrorMessage(error)}`, 'error');
            this.onError?.('Failed to start voice recognition. Please check microphone permissions and refresh.');
            return false;
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (!this.isListening || !this.recognition) return;

        try {
            this.recognition.stop();
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = null;
            }
        } catch (error) {
            Utils.log(`Error stopping recognition: ${Utils.getErrorMessage(error)}`, 'error');
        }
    }

    /**
     * Speak text using synthesis (no auto-restart)
     */
    async speak(text) {
        if (!text?.trim()) return false;

        return new Promise((resolve, reject) => {
            try {
                // Cancel any ongoing speech
                this.stopSpeaking();

                this.currentUtterance = new SpeechSynthesisUtterance(text);
                this.currentUtterance.rate = window.configManager?.get('voiceSpeed') || 1.0;
                this.currentUtterance.pitch = window.configManager?.get('voicePitch') || 1.0;
                this.currentUtterance.lang = 'en-US';

                this.currentUtterance.onstart = () => {
                    Utils.log(`Speaking: ${text.substring(0, 50)}...`);
                    this.isSpeaking = true;
                    this.updateStatus('speaking');
                };

                this.currentUtterance.onend = () => {
                    Utils.log('Finished speaking - One-shot complete');
                    this.isSpeaking = false;
                    this.updateStatus('ready');
                    // NO AUTO-RESTART - User must manually start new session
                    resolve(true);
                };

                this.currentUtterance.onerror = (event) => {
                    Utils.log(`Speech synthesis error: ${event.error}`, 'error');
                    this.isSpeaking = false;
                    this.updateStatus('ready');
                    reject(new Error(`Speech synthesis error: ${event.error}`));
                };

                this.synthesis.speak(this.currentUtterance);

            } catch (error) {
                Utils.log(`Failed to speak: ${Utils.getErrorMessage(error)}`, 'error');
                this.isSpeaking = false;
                reject(error);
            }
        });
    }

    /**
     * Stop speaking
     */
    stopSpeaking() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
        this.isSpeaking = false;
        this.currentUtterance = null;
    }

    /**
     * Request microphone permission
     */
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            Utils.log(`Microphone permission denied: ${Utils.getErrorMessage(error)}`, 'error');
            throw new Error('Microphone access is required for voice input');
        }
    }

    /**
     * Start voice level monitoring
     */
    async startVoiceLevelMonitoring() {
        if (this.isMonitoringVoiceLevel) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;

            this.microphone.connect(this.analyser);
            this.voiceLevelData = new Uint8Array(this.analyser.frequencyBinCount);

            this.isMonitoringVoiceLevel = true;
            this.voiceLevelInterval = setInterval(() => {
                this.updateVoiceLevel();
            }, 100);

        } catch (error) {
            Utils.log(`Failed to start voice level monitoring: ${Utils.getErrorMessage(error)}`, 'error');
        }
    }

    /**
     * Stop voice level monitoring
     */
    stopVoiceLevelMonitoring() {
        if (!this.isMonitoringVoiceLevel) return;

        this.isMonitoringVoiceLevel = false;

        if (this.voiceLevelInterval) {
            clearInterval(this.voiceLevelInterval);
            this.voiceLevelInterval = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.microphone = null;
        this.analyser = null;
        this.voiceLevelData = null;
    }

    /**
     * Update voice level visualization
     */
    updateVoiceLevel() {
        if (!this.analyser || !this.voiceLevelData) return;

        this.analyser.getByteFrequencyData(this.voiceLevelData);
        const level = Utils.calculateVoiceLevel(this.voiceLevelData);
        this.onVoiceLevel?.(level);
    }

    /**
     * Update status
     */
    updateStatus(status) {
        this.onStatusChange?.(status);
    }

    /**
     * Check if voice recognition is supported
     */
    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isListening: this.isListening,
            isSpeaking: this.isSpeaking,
            isSupported: this.isSupported(),
            isMonitoringVoiceLevel: this.isMonitoringVoiceLevel
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopListening();
        this.stopSpeaking();
        this.stopVoiceLevelMonitoring();

        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }
    }
}

// Create global instance
window.voiceProcessor = new VoiceProcessor();