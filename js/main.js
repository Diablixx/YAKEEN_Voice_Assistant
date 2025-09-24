/**
 * Main Application Controller
 * Orchestrates all components and handles UI interactions
 */

class VoiceAssistantApp {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.isFirstRun = true;

        // Bind methods
        this.handleStatusChange = this.handleStatusChange.bind(this);
        this.handleVoiceLevel = this.handleVoiceLevel.bind(this);
        this.handleVoiceResult = this.handleVoiceResult.bind(this);
        this.handleVoiceError = this.handleVoiceError.bind(this);
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            Utils.log('Initializing Voice Assistant App...');

            // Cache DOM elements
            this.cacheElements();

            // Setup voice processor event handlers
            this.setupVoiceProcessor();

            // Setup UI event handlers
            this.setupEventHandlers();

            // Initialize components
            await this.initializeComponents();

            // Setup PWA features
            this.setupPWA();

            // Check if first run and show setup if needed
            await this.checkFirstRun();

            this.isInitialized = true;
            Utils.log('Voice Assistant App initialized successfully');

            // Auto-start one-shot listening on page load
            setTimeout(() => {
                Utils.log('Auto-starting one-shot listening...');
                this.startListening();
            }, 1000);

        } catch (error) {
            Utils.log(`Failed to initialize app: ${Utils.getErrorMessage(error)}`, 'error');
            this.showError('Failed to initialize the application');
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            status: document.getElementById('status'),
            voiceVisualizer: document.getElementById('voiceVisualizer'),
            voiceLevelBar: document.getElementById('voiceLevelBar'),
            toggleListening: document.getElementById('toggleListening'),
            listeningText: document.getElementById('listeningText'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsPanel: document.getElementById('settingsPanel'),
            n8nUrl: document.getElementById('n8nUrl'),
            voiceSpeed: document.getElementById('voiceSpeed'),
            voicePitch: document.getElementById('voicePitch'),
            speedValue: document.getElementById('speedValue'),
            pitchValue: document.getElementById('pitchValue'),
            saveSettings: document.getElementById('saveSettings'),
            closeSettings: document.getElementById('closeSettings'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingText: document.getElementById('loadingText'),
            debugPanel: document.getElementById('debugPanel'),
            debugLog: document.getElementById('debugLog'),
            conversationContainer: document.getElementById('conversationContainer'),
            conversationScroll: document.getElementById('conversationScroll')
        };
    }

    /**
     * Setup voice processor
     */
    setupVoiceProcessor() {
        if (!window.voiceProcessor) {
            throw new Error('Voice processor not available');
        }

        window.voiceProcessor.onStatusChange = this.handleStatusChange;
        window.voiceProcessor.onVoiceLevel = this.handleVoiceLevel;
        window.voiceProcessor.onResult = this.handleVoiceResult;
        window.voiceProcessor.onError = this.handleVoiceError;

        Utils.log('Voice processor configured');
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Toggle listening button
        this.elements.toggleListening?.addEventListener('click', () => {
            this.toggleListening();
        });

        // Settings button
        this.elements.settingsBtn?.addEventListener('click', () => {
            this.openSettings();
        });

        // Settings form handlers
        this.elements.saveSettings?.addEventListener('click', () => {
            this.saveSettings();
        });

        this.elements.closeSettings?.addEventListener('click', () => {
            this.closeSettings();
        });

        // Settings real-time updates
        this.elements.voiceSpeed?.addEventListener('input', (e) => {
            this.elements.speedValue.textContent = `${e.target.value}x`;
        });

        this.elements.voicePitch?.addEventListener('input', (e) => {
            this.elements.pitchValue.textContent = e.target.value;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.toggleListening();
            } else if (e.key === 'Escape') {
                this.stopAll();
            }
        });

        // App visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // App is in background
                Utils.log('App went to background');
            } else {
                // App is in foreground
                Utils.log('App came to foreground');
            }
        });

        // Debug panel toggle (double tap on status)
        let tapCount = 0;
        this.elements.status?.addEventListener('click', () => {
            tapCount++;
            setTimeout(() => {
                if (tapCount === 2) {
                    this.toggleDebugPanel();
                }
                tapCount = 0;
            }, 300);
        });

        Utils.log('Event handlers configured');
    }

    /**
     * Initialize components
     */
    async initializeComponents() {
        // Load configuration
        const config = window.configManager.getAll();

        // Initialize n8n client
        if (config.n8nUrl) {
            window.n8nClient.initialize(config.n8nUrl);
        }

        // Update UI with saved settings
        this.updateSettingsUI(config);

        Utils.log('Components initialized');
    }

    /**
     * Setup PWA features
     */
    setupPWA() {
        // Service Worker registration handled elsewhere

        // Install prompt handling
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            Utils.log('PWA install prompt available');
        });

        // PWA installed event
        window.addEventListener('appinstalled', (e) => {
            Utils.log('PWA installed successfully');
            Utils.showNotification('Voice Assistant', {
                body: 'App installed successfully!'
            });
        });

        Utils.log('PWA features configured');
    }

    /**
     * Check if this is first run
     */
    async checkFirstRun() {
        if (!window.configManager.isConfigured()) {
            Utils.log('First run detected, showing setup');
            await this.showFirstRunSetup();
        }
    }

    /**
     * Show first run setup
     */
    async showFirstRunSetup() {
        this.showMessage('Welcome! Please configure your n8n webhook URL in settings.', 'info');
        setTimeout(() => {
            this.openSettings();
        }, 2000);
    }

    /**
     * Handle voice processor status changes
     */
    handleStatusChange(status) {
        Utils.log(`Status changed to: ${status}`);

        // Update status display
        if (this.elements.status) {
            this.elements.status.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            this.elements.status.className = `status-indicator ${status}`;
        }

        // Update visualizer
        if (this.elements.voiceVisualizer) {
            this.elements.voiceVisualizer.className = `voice-visualizer ${status}`;
        }

        // Update button text for one-shot behavior
        if (this.elements.listeningText) {
            switch (status) {
                case 'listening':
                    this.elements.listeningText.textContent = 'Listening...';
                    this.elements.toggleListening.classList.add('active');
                    this.elements.toggleListening.disabled = true; // Disable during listening
                    break;
                case 'processing':
                    this.elements.listeningText.textContent = 'Processing...';
                    this.elements.toggleListening.disabled = true; // Keep disabled
                    break;
                case 'speaking':
                    this.elements.listeningText.textContent = 'Speaking...';
                    this.elements.toggleListening.disabled = true; // Keep disabled
                    break;
                default:
                    this.elements.listeningText.textContent = 'Ask Another Question';
                    this.elements.toggleListening.classList.remove('active');
                    this.elements.toggleListening.disabled = false; // Enable for new question
                    break;
            }
        }

        // Show/hide loading overlay
        if (status === 'processing') {
            this.showLoading('Processing your request...');
        } else {
            this.hideLoading();
        }
    }

    /**
     * Handle voice level updates
     */
    handleVoiceLevel(level) {
        if (this.elements.voiceLevelBar) {
            this.elements.voiceLevelBar.style.width = `${level}%`;
        }
    }

    /**
     * Handle voice recognition results
     */
    handleVoiceResult(transcript, response) {
        Utils.log(`Voice result - Transcript: ${transcript}`);

        // Add messages to conversation display
        this.addMessage('user', transcript);
        if (response?.text) {
            this.addMessage('assistant', response.text);
        }

        // Visual feedback
        Utils.vibrate([100, 50, 100]);
    }

    /**
     * Handle voice processing errors
     */
    handleVoiceError(error) {
        Utils.log(`Voice error: ${error}`, 'error');
        this.showError(error);
        Utils.vibrate(500);
    }

    /**
     * Add message to conversation display
     */
    addMessage(type, text, timestamp = null) {
        if (!this.elements.conversationScroll || !text?.trim()) return;

        // Remove welcome message if it exists
        const welcome = this.elements.conversationScroll.querySelector('.conversation-welcome');
        if (welcome) {
            welcome.remove();
        }

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `conversation-message message-${type}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.textContent = text.trim();

        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'message-timestamp';
        timestampSpan.textContent = timestamp || this.formatTimestamp(new Date());

        messageDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(timestampSpan);

        // Add to conversation
        this.elements.conversationScroll.appendChild(messageDiv);

        // Auto-scroll to bottom
        this.scrollConversationToBottom();

        // Limit conversation history (keep last 50 messages)
        this.limitConversationHistory();
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(date) {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    /**
     * Scroll conversation to bottom
     */
    scrollConversationToBottom() {
        if (this.elements.conversationScroll) {
            setTimeout(() => {
                this.elements.conversationScroll.scrollTop = this.elements.conversationScroll.scrollHeight;
            }, 100);
        }
    }

    /**
     * Limit conversation history to prevent memory issues
     */
    limitConversationHistory() {
        const messages = this.elements.conversationScroll.querySelectorAll('.conversation-message');
        const maxMessages = 50;

        if (messages.length > maxMessages) {
            for (let i = 0; i < messages.length - maxMessages; i++) {
                messages[i].remove();
            }
        }
    }

    /**
     * Clear conversation display
     */
    clearConversation() {
        if (this.elements.conversationScroll) {
            this.elements.conversationScroll.innerHTML = `
                <div class="conversation-welcome">
                    <p>Welcome! I'm listening for your question...</p>
                </div>
            `;
        }
    }

    /**
     * Start a new one-shot listening session
     */
    async toggleListening() {
        if (!window.configManager.isConfigured()) {
            this.showError('Please configure n8n webhook URL in settings first');
            this.openSettings();
            return;
        }

        if (!window.voiceProcessor.isSupported()) {
            this.showError('Speech recognition is not supported in this browser');
            return;
        }

        // Always start listening (one-shot behavior)
        await this.startListening();
    }

    /**
     * Start listening
     */
    async startListening() {
        try {
            const success = await window.voiceProcessor.startListening();
            if (!success) {
                this.showError('Failed to start voice recognition');
            }
        } catch (error) {
            this.showError(`Failed to start listening: ${Utils.getErrorMessage(error)}`);
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        window.voiceProcessor.stopListening();
    }

    /**
     * Stop all voice activities
     */
    stopAll() {
        window.voiceProcessor.stopListening();
        window.voiceProcessor.stopSpeaking();
    }

    /**
     * Open settings panel
     */
    openSettings() {
        const config = window.configManager.getAll();
        this.updateSettingsUI(config);
        this.elements.settingsPanel?.classList.add('open');
    }

    /**
     * Close settings panel
     */
    closeSettings() {
        this.elements.settingsPanel?.classList.remove('open');
    }

    /**
     * Update settings UI with current configuration
     */
    updateSettingsUI(config) {
        if (this.elements.n8nUrl) {
            this.elements.n8nUrl.value = config.n8nUrl || '';
        }
        if (this.elements.voiceSpeed) {
            this.elements.voiceSpeed.value = config.voiceSpeed || 1.0;
            this.elements.speedValue.textContent = `${config.voiceSpeed || 1.0}x`;
        }
        if (this.elements.voicePitch) {
            this.elements.voicePitch.value = config.voicePitch || 1.0;
            this.elements.pitchValue.textContent = config.voicePitch || 1.0;
        }
    }

    /**
     * Save settings
     */
    async saveSettings() {
        const n8nUrl = this.elements.n8nUrl?.value?.trim();
        const voiceSpeed = parseFloat(this.elements.voiceSpeed?.value || 1.0);
        const voicePitch = parseFloat(this.elements.voicePitch?.value || 1.0);

        // Validate n8n URL
        if (!n8nUrl) {
            this.showError('n8n webhook URL is required');
            return;
        }

        if (!Utils.isValidUrl(n8nUrl)) {
            this.showError('Please enter a valid n8n webhook URL');
            return;
        }

        // Test n8n connection
        this.showLoading('Testing n8n connection...');

        try {
            window.n8nClient.initialize(n8nUrl);
            const testResult = await window.n8nClient.testConnection();

            if (!testResult.success) {
                this.hideLoading();
                this.showError(`n8n connection failed: ${testResult.error}`);
                return;
            }

            // Save configuration
            const success = window.configManager.update({
                n8nUrl,
                voiceSpeed,
                voicePitch
            });

            if (success) {
                this.hideLoading();
                this.showMessage('Settings saved successfully!', 'success');
                this.closeSettings();

                // Start one-shot listening if this was the first setup
                if (this.isFirstRun) {
                    this.isFirstRun = false;
                    setTimeout(() => {
                        this.startListening();
                    }, 1000);
                }
            } else {
                this.hideLoading();
                this.showError('Failed to save settings');
            }

        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to test n8n connection: ${Utils.getErrorMessage(error)}`);
        }
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        if (this.elements.loadingOverlay) {
            this.elements.loadingText.textContent = message;
            this.elements.loadingOverlay.classList.add('visible');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('visible');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Show message
     */
    showMessage(message, type = 'info') {
        Utils.log(`${type.toUpperCase()}: ${message}`);

        // Simple toast-like notification using the status element
        if (this.elements.status) {
            const originalText = this.elements.status.textContent;
            const originalClass = this.elements.status.className;

            this.elements.status.textContent = message;
            this.elements.status.className = `status-indicator ${type}`;

            setTimeout(() => {
                this.elements.status.textContent = originalText;
                this.elements.status.className = originalClass;
            }, 3000);
        }
    }

    /**
     * Toggle debug panel
     */
    toggleDebugPanel() {
        if (this.elements.debugPanel) {
            this.elements.debugPanel.classList.toggle('visible');
        }
    }

    /**
     * Get app status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            configured: window.configManager.isConfigured(),
            voiceProcessor: window.voiceProcessor.getStatus(),
            n8nClient: window.n8nClient.getStatus(),
            deviceInfo: Utils.getDeviceInfo()
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (window.voiceProcessor) {
            window.voiceProcessor.destroy();
        }
        this.isInitialized = false;
        Utils.log('App destroyed');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new VoiceAssistantApp();
    await window.app.initialize();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    Utils.log(`Global error: ${event.error?.message || event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    Utils.log(`Unhandled promise rejection: ${event.reason?.message || event.reason}`, 'error');
});