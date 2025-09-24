/**
 * Voice Processing System
 * Handles speech recognition and synthesis using Web Speech API
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

        // Speech recognition settings
        this.silenceThreshold = 2000; // 2 seconds of silence to stop
        this.minSpeechDuration = 500; // Minimum speech duration
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
        // Check for speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            Utils.log('Speech recognition not supported in this browser', 'error');
            return false;
        }

        this.recognition = new SpeechRecognition();
        this.setupRecognitionConfig();
        this.setupRecognitionEvents();

        Utils.log('Speech recognition initialized');
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
            Utils.log('Speech recognition started');
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
            this.lastSpeechTime = Date.now();
            if (!this.speechStartTime && (finalTranscript || interimTranscript)) {
                this.speechStartTime = Date.now();
            }

            // Clear existing silence timeout
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
            }

            // If we have final results, process them
            if (finalTranscript.trim()) {
                Utils.log(`Final transcript: ${finalTranscript}`);
                this.processFinalResult(finalTranscript.trim());

                // Reset for next input
                finalTranscript = '';
                this.speechStartTime = 0;
            }

            // Set silence timeout for interim results
            if (interimTranscript.trim() || finalTranscript.trim()) {
                this.silenceTimeout = setTimeout(() => {
                    this.handleSilenceDetected();
                }, this.silenceThreshold);
            }
        };

        this.recognition.onerror = (event) => {
            Utils.log(`Speech recognition error: ${event.error}`, 'error');

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                this.onError?.('Microphone permission denied. Please enable microphone access.');
            } else if (event.error === 'network') {
                this.onError?.('Network error. Please check your internet connection.');
            } else {
                this.onError?.(`Speech recognition error: ${event.error}`);
            }

            this.stopListening();
        };

        this.recognition.onend = () => {
            Utils.log('Speech recognition ended');
            this.isListening = false;
            this.stopVoiceLevelMonitoring();
            this.updateStatus('ready');

            // Auto-restart if configured for continuous listening
            if (window.configManager?.get('autoListen')) {
                setTimeout(() => {
                    if (!this.isSpeaking) {
                        this.startListening();
                    }
                }, 1000);
            }
        };
    }

    /**
     * Handle silence detection
     */
    handleSilenceDetected() {
        const speechDuration = Date.now() - this.speechStartTime;
        Utils.log(`Silence detected after ${speechDuration}ms of speech`);

        // If we had sufficient speech, we're done
        if (speechDuration >= this.minSpeechDuration) {
            Utils.log('Sufficient speech detected, processing...');
            // The final result should already be processed
        }
    }

    /**
     * Process final speech result
     */
    async processFinalResult(text) {
        if (!text.trim()) return;

        Utils.log(`Processing speech result: ${text}`);
        this.stopListening();
        this.updateStatus('processing');

        try {
            // Send to n8n
            const response = await window.n8nClient.sendWithRetry(text);

            if (response?.text) {
                Utils.log(`Received n8n response: ${response.text.substring(0, 100)}...`);
                await this.speak(response.text);
            } else {
                await this.speak("I received your message but got no response.");
            }

            this.onResult?.(text, response);

        } catch (error) {
            const errorMessage = Utils.getErrorMessage(error);
            Utils.log(`Error processing speech: ${errorMessage}`, 'error');
            await this.speak(`Sorry, I encountered an error: ${errorMessage}`);
            this.onError?.(errorMessage);
        }

        this.updateStatus('ready');
    }

    /**
     * Start listening for speech
     */
    async startListening() {
        if (this.isListening || !this.recognition) return false;

        try {
            // Request microphone permission
            await this.requestMicrophonePermission();

            this.recognition.start();
            return true;
        } catch (error) {
            Utils.log(`Failed to start listening: ${Utils.getErrorMessage(error)}`, 'error');
            this.onError?.('Failed to start voice recognition');
            return false;
        }
    }

    /**
     * Stop listening for speech
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
     * Speak text using synthesis
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
                    Utils.log(`Starting to speak: ${text.substring(0, 50)}...`);
                    this.isSpeaking = true;
                    this.updateStatus('speaking');
                };

                this.currentUtterance.onend = () => {
                    Utils.log('Finished speaking');
                    this.isSpeaking = false;
                    this.updateStatus('ready');

                    // Auto-restart listening if configured
                    setTimeout(() => {
                        if (window.configManager?.get('autoListen') && !this.isListening) {
                            this.startListening();
                        }
                    }, 500);

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
            stream.getTracks().forEach(track => track.stop()); // Stop the stream, we just needed permission
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
     * Get available voices
     */
    getAvailableVoices() {
        return this.synthesis.getVoices();
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
        }
    }
}

// Create global instance
window.voiceProcessor = new VoiceProcessor();