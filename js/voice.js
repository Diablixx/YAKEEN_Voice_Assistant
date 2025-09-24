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
        this.minSpeechLength = 3; // Minimum characters for valid speech
        this.minWordCount = 1; // Minimum words for valid speech
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

            // Update speech timing only if we have meaningful content
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

            // Process final results only if they pass validation
            if (finalTranscript.trim()) {
                const cleanText = finalTranscript.trim();
                Utils.log(`Final transcript received: "${cleanText}"`);

                if (this.isValidSpeech(cleanText)) {
                    Utils.log(`Valid speech detected, processing: "${cleanText}"`);
                    this.processFinalResult(cleanText);
                } else {
                    Utils.log(`Invalid speech ignored: "${cleanText}"`);
                }

                // Reset for next input
                finalTranscript = '';
                this.speechStartTime = 0;
            }

            // Only set silence timeout if we have meaningful interim results
            if (interimTranscript.trim() && this.isValidSpeech(interimTranscript.trim())) {
                this.silenceTimeout = setTimeout(() => {
                    this.handleSilenceDetected();
                }, this.silenceThreshold);
            }
        };

        this.recognition.onerror = (event) => {
            Utils.log(`Speech recognition error: ${event.error}`, 'error');

            // Only show user-facing errors for critical issues
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                this.onError?.('Microphone permission denied. Please enable microphone access.');
            } else if (event.error === 'network') {
                this.onError?.('Network error. Please check your internet connection.');
            } else if (event.error === 'no-speech') {
                // Don't show error for no-speech, it's normal behavior
                Utils.log('No speech detected, continuing to listen...');
            } else if (event.error === 'audio-capture') {
                this.onError?.('Microphone access error. Please check your audio settings.');
            } else {
                // For other errors, log but don't always notify user
                Utils.log(`Speech recognition error (${event.error}), continuing...`);
            }

            this.stopListening();
        };

        this.recognition.onend = () => {
            Utils.log('Speech recognition ended');
            this.isListening = false;
            this.stopVoiceLevelMonitoring();

            // Clear any pending silence timeout
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = null;
            }

            this.updateStatus('ready');

            // Auto-restart if configured for continuous listening and safe to do so
            if (window.configManager?.get('autoListen') && !this.isSpeaking) {
                Utils.log('Auto-restarting speech recognition...');
                setTimeout(() => {
                    // Triple-check: not speaking, not listening, and synthesis is not active
                    if (!this.isSpeaking &&
                        !this.isListening &&
                        !this.synthesis.speaking &&
                        !this.synthesis.pending) {
                        Utils.log('Safe to restart recognition');
                        this.startListening();
                    } else {
                        Utils.log('Not safe to restart recognition - speech synthesis still active');
                    }
                }, 3000); // Increased to 3 seconds for maximum safety
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
     * Validate if speech is meaningful and should be processed
     */
    isValidSpeech(text) {
        if (!text || typeof text !== 'string') return false;

        const cleanText = text.trim();

        // Check minimum length
        if (cleanText.length < this.minSpeechLength) {
            Utils.log(`Speech too short (${cleanText.length} chars): "${cleanText}"`);
            return false;
        }

        // Check for minimum word count
        const words = cleanText.split(/\s+/).filter(word => word.length > 0);
        if (words.length < this.minWordCount) {
            Utils.log(`Not enough words (${words.length}): "${cleanText}"`);
            return false;
        }

        // Filter out common noise patterns
        const noisePatterns = [
            /^(uh|um|ah|eh|mm|hmm)$/i,
            /^[.,;:!?]+$/,
            /^\s*$/,
            /^[a-z]$/i, // Single letters
            /^(the|a|an|and|or|but|in|on|at|to|for|of|with|by)$/i // Common stop words alone
        ];

        for (const pattern of noisePatterns) {
            if (pattern.test(cleanText)) {
                Utils.log(`Speech matches noise pattern: "${cleanText}"`);
                return false;
            }
        }

        // Filter out AI response patterns to prevent feedback loops
        const aiResponsePatterns = [
            /^(my name is|i am|i'm|hello[!,.\s]* i'm|hi[!,.\s]* i'm)/i,
            /^(i'm here and ready|how can i help|how can i assist)/i,
            /^(sorry[!,.\s]* i|i apologize|i don't understand)/i,
            /^(i'm an ai|i'm a language model|as an ai)/i,
            /^(let me help|i can help|here's what i)/i,
            /^(based on|according to|i think|in my opinion)/i,
            /^(thank you for|thanks for asking|you're welcome)/i
        ];

        for (const pattern of aiResponsePatterns) {
            if (pattern.test(cleanText)) {
                Utils.log(`Speech matches AI response pattern, likely feedback: "${cleanText}"`);
                return false;
            }
        }

        // Check if it's mostly punctuation or special characters
        const letterCount = (cleanText.match(/[a-zA-Z]/g) || []).length;
        const letterPercentage = letterCount / cleanText.length;
        if (letterPercentage < 0.3) {
            Utils.log(`Too few letters (${Math.round(letterPercentage * 100)}%): "${cleanText}"`);
            return false;
        }

        return true;
    }

    /**
     * Process final speech result
     */
    async processFinalResult(text) {
        // Robust validation before processing
        if (!this.isValidSpeech(text)) {
            Utils.log('Invalid speech detected, ignoring');
            this.updateStatus('ready');
            return;
        }

        const cleanText = text.trim();
        Utils.log(`Processing valid speech result: "${cleanText}"`);
        this.stopListening();
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

            // Only show error messages for valid speech attempts
            await this.speak(`Sorry, I encountered an error processing your request.`);
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
                // CRITICAL: Stop speech recognition immediately to prevent feedback loop
                this.stopListening();

                // Cancel any ongoing speech
                this.stopSpeaking();

                this.currentUtterance = new SpeechSynthesisUtterance(text);
                this.currentUtterance.rate = window.configManager?.get('voiceSpeed') || 1.0;
                this.currentUtterance.pitch = window.configManager?.get('voicePitch') || 1.0;
                this.currentUtterance.lang = 'en-US';

                this.currentUtterance.onstart = () => {
                    Utils.log(`Starting to speak: ${text.substring(0, 50)}...`);

                    // Double-check that recognition is stopped
                    if (this.isListening) {
                        Utils.log('Force stopping recognition during speech start');
                        this.stopListening();
                    }

                    this.isSpeaking = true;
                    this.updateStatus('speaking');
                };

                this.currentUtterance.onend = () => {
                    Utils.log('Finished speaking');
                    this.isSpeaking = false;
                    this.updateStatus('ready');

                    // Auto-restart listening with longer delay to prevent feedback
                    setTimeout(() => {
                        if (window.configManager?.get('autoListen') && !this.isListening && !this.isSpeaking) {
                            Utils.log('Auto-restarting recognition after speech ended');
                            this.startListening();
                        }
                    }, 2000); // Increased delay to 2 seconds for safety

                    resolve(true);
                };

                this.currentUtterance.onerror = (event) => {
                    Utils.log(`Speech synthesis error: ${event.error}`, 'error');
                    this.isSpeaking = false;
                    this.updateStatus('ready');

                    // Restart listening after error if configured
                    setTimeout(() => {
                        if (window.configManager?.get('autoListen') && !this.isListening) {
                            this.startListening();
                        }
                    }, 1000);

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
        try {
            // Cancel all speech synthesis
            this.synthesis.cancel();

            // Force clear the synthesis queue
            if (this.synthesis.pending) {
                this.synthesis.cancel();
            }

            // Reset state
            this.isSpeaking = false;
            this.currentUtterance = null;

            Utils.log('Speech synthesis stopped and cleared');
        } catch (error) {
            Utils.log(`Error stopping speech synthesis: ${Utils.getErrorMessage(error)}`, 'error');
            this.isSpeaking = false;
            this.currentUtterance = null;
        }
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