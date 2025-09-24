/**
 * n8n Integration Module
 * Handles communication with n8n webhooks
 */

class N8nClient {
    constructor() {
        this.baseUrl = '';
        this.timeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * Initialize with n8n URL
     */
    initialize(url) {
        this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
        Utils.log(`N8n client initialized with URL: ${this.baseUrl}`);
    }

    /**
     * Send voice text to n8n webhook
     */
    async sendVoiceInput(text, metadata = {}) {
        if (!this.baseUrl) {
            throw new Error('n8n URL not configured');
        }

        if (!text?.trim()) {
            throw new Error('No text provided');
        }

        const payload = {
            text: text.trim(),
            timestamp: new Date().toISOString(),
            source: 'voice-assistant',
            metadata: {
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
                ...metadata
            }
        };

        Utils.log(`Sending to n8n: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);

        try {
            const response = await this._makeRequest('POST', this.baseUrl, payload);
            Utils.log(`n8n response received (${response.status})`);
            return await this._processResponse(response);
        } catch (error) {
            Utils.log(`n8n request failed: ${Utils.getErrorMessage(error)}`, 'error');
            throw error;
        }
    }

    /**
     * Make HTTP request to n8n
     */
    async _makeRequest(method, url, data = null) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Voice-Assistant/1.0'
            },
            signal: controller.signal
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }

            throw error;
        }
    }

    /**
     * Process n8n response
     */
    async _processResponse(response) {
        const contentType = response.headers.get('content-type');

        try {
            let data;

            if (contentType?.includes('application/json')) {
                data = await response.json();
            } else {
                data = { text: await response.text() };
            }

            // Handle different response formats
            if (data.error) {
                throw new Error(data.error);
            }

            // Extract response text
            let responseText = '';
            if (typeof data === 'string') {
                responseText = data;
            } else if (data.text) {
                responseText = data.text;
            } else if (data.response) {
                responseText = data.response;
            } else if (data.message) {
                responseText = data.message;
            } else if (data.output) {
                responseText = data.output;
            } else if (Array.isArray(data) && data.length > 0 && data[0].output) {
                responseText = data[0].output;
            } else {
                responseText = JSON.stringify(data);
            }

            return {
                text: Utils.sanitizeForSpeech(responseText),
                raw: data,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            Utils.log(`Failed to process n8n response: ${Utils.getErrorMessage(error)}`, 'error');
            throw new Error('Failed to process response from n8n');
        }
    }

    /**
     * Test connection to n8n
     */
    async testConnection() {
        if (!this.baseUrl) {
            throw new Error('n8n URL not configured');
        }

        try {
            Utils.log('Testing n8n connection...');

            const testPayload = {
                text: 'test connection',
                timestamp: new Date().toISOString(),
                source: 'voice-assistant-test',
                metadata: {
                    test: true,
                    timestamp: Date.now()
                }
            };

            const response = await this._makeRequest('POST', this.baseUrl, testPayload);
            const result = await this._processResponse(response);

            Utils.log('n8n connection test successful');
            return {
                success: true,
                response: result
            };

        } catch (error) {
            Utils.log(`n8n connection test failed: ${Utils.getErrorMessage(error)}`, 'error');
            return {
                success: false,
                error: Utils.getErrorMessage(error)
            };
        }
    }

    /**
     * Send with retry logic
     */
    async sendWithRetry(text, metadata = {}) {
        return await Utils.retry(
            () => this.sendVoiceInput(text, metadata),
            this.retryAttempts,
            this.retryDelay
        );
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            configured: !!this.baseUrl,
            url: this.baseUrl,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts
        };
    }

    /**
     * Update configuration
     */
    updateConfig(config = {}) {
        if (config.url) {
            this.baseUrl = config.url.replace(/\/$/, '');
        }
        if (config.timeout) {
            this.timeout = config.timeout;
        }
        if (config.retryAttempts !== undefined) {
            this.retryAttempts = config.retryAttempts;
        }
        if (config.retryDelay) {
            this.retryDelay = config.retryDelay;
        }

        Utils.log('n8n client configuration updated');
    }

    /**
     * Clear configuration
     */
    clear() {
        this.baseUrl = '';
        Utils.log('n8n client configuration cleared');
    }
}

// Create global instance
window.n8nClient = new N8nClient();