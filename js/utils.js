/**
 * Utility Functions
 * Helper functions used throughout the application
 */

class Utils {
    /**
     * Debounce function execution
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function execution
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Generate unique ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Format timestamp
     */
    static formatTimestamp(date = new Date()) {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Log with timestamp
     */
    static log(message, type = 'info') {
        const timestamp = this.formatTimestamp();
        const logMessage = `[${timestamp}] ${message}`;

        switch (type) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            case 'debug':
                if (window.configManager?.get('debugMode')) {
                    console.debug(logMessage);
                }
                break;
            default:
                console.log(logMessage);
        }

        // Add to debug panel if it exists
        this.addToDebugPanel(logMessage, type);
    }

    /**
     * Add message to debug panel
     */
    static addToDebugPanel(message, type = 'info') {
        const debugLog = document.getElementById('debugLog');
        if (debugLog) {
            const timestamp = this.formatTimestamp();
            const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
            debugLog.textContent += logEntry;
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }

    /**
     * Check if device is iOS
     */
    static isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    /**
     * Check if running as PWA
     */
    static isPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    /**
     * Get device info
     */
    static getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isIOS: this.isIOS(),
            isPWA: this.isPWA(),
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        };
    }

    /**
     * Vibrate device (if supported)
     */
    static vibrate(pattern = 100) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Show notification (if permission granted)
     */
    static async showNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                icon: 'icons/favicon-32x32.png',
                badge: 'icons/favicon-32x32.png',
                ...options
            });
        }
    }

    /**
     * Request notification permission
     */
    static async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    /**
     * Copy text to clipboard
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            }
        } catch (error) {
            this.log(`Failed to copy to clipboard: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Animate element
     */
    static animate(element, animationClass, duration = 1000) {
        return new Promise((resolve) => {
            element.classList.add(animationClass);

            const handleAnimationEnd = () => {
                element.classList.remove(animationClass);
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            };

            element.addEventListener('animationend', handleAnimationEnd);

            // Fallback timeout
            setTimeout(() => {
                element.classList.remove(animationClass);
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            }, duration);
        });
    }

    /**
     * Calculate voice level from frequency data
     */
    static calculateVoiceLevel(dataArray) {
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        return Math.min(100, (average / 255) * 100);
    }

    /**
     * Format duration in milliseconds to human readable
     */
    static formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Wait for specified time
     */
    static wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry function with exponential backoff
     */
    static async retry(fn, maxAttempts = 3, baseDelay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt === maxAttempts) {
                    throw lastError;
                }

                const delay = baseDelay * Math.pow(2, attempt - 1);
                this.log(`Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`, 'warn');
                await this.wait(delay);
            }
        }
    }

    /**
     * Sanitize text for speech
     */
    static sanitizeForSpeech(text) {
        return text
            .replace(/[<>]/g, '') // Remove HTML brackets
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/(\r\n|\n|\r)/gm, ' ') // Replace newlines with spaces
            .trim();
    }

    /**
     * Validate URL
     */
    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Get error message from various error types
     */
    static getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        } else if (error?.message) {
            return error.message;
        } else if (error?.error?.message) {
            return error.error.message;
        } else {
            return 'An unknown error occurred';
        }
    }
}