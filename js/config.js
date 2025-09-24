/**
 * Configuration Management System
 * Handles storage and retrieval of user settings
 */

class ConfigManager {
    constructor() {
        this.storageKey = 'voiceAssistantConfig';
        this.defaults = {
            n8nUrl: '',
            voiceSpeed: 1.0,
            voicePitch: 1.0,
            autoListen: true,
            debugMode: false,
            lastUsed: null
        };
        this.config = this.loadConfig();
    }

    /**
     * Load configuration from localStorage
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...this.defaults, ...parsed };
            }
        } catch (error) {
            console.warn('Failed to load config from localStorage:', error);
        }
        return { ...this.defaults };
    }

    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        try {
            this.config.lastUsed = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            return true;
        } catch (error) {
            console.error('Failed to save config to localStorage:', error);
            return false;
        }
    }

    /**
     * Get a configuration value
     */
    get(key) {
        return this.config[key];
    }

    /**
     * Set a configuration value
     */
    set(key, value) {
        this.config[key] = value;
        return this.saveConfig();
    }

    /**
     * Update multiple configuration values
     */
    update(updates) {
        Object.assign(this.config, updates);
        return this.saveConfig();
    }

    /**
     * Reset configuration to defaults
     */
    reset() {
        this.config = { ...this.defaults };
        return this.saveConfig();
    }

    /**
     * Validate n8n URL
     */
    validateN8nUrl(url) {
        if (!url) return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
            return false;
        }
    }

    /**
     * Check if the app is properly configured
     */
    isConfigured() {
        return this.validateN8nUrl(this.config.n8nUrl);
    }

    /**
     * Get all configuration values
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Export configuration (for backup/sharing)
     */
    export() {
        const exportData = { ...this.config };
        // Remove sensitive data if needed
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import configuration
     */
    import(configString) {
        try {
            const importedConfig = JSON.parse(configString);
            this.config = { ...this.defaults, ...importedConfig };
            return this.saveConfig();
        } catch (error) {
            console.error('Failed to import config:', error);
            return false;
        }
    }
}

// Create global instance
window.configManager = new ConfigManager();