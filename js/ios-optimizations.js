/**
 * iOS-Specific Optimizations for Voice Assistant PWA
 * Handles iOS Safari quirks and optimizations for iPhone 15 Pro Max
 */

class IOSOptimizer {
    constructor() {
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.isStandalone = window.navigator.standalone === true ||
                           window.matchMedia('(display-mode: standalone)').matches;
        this.viewportHeight = window.innerHeight;
        this.safeAreaInsets = this.getSafeAreaInsets();

        if (this.isIOS) {
            this.initialize();
        }
    }

    /**
     * Initialize iOS optimizations
     */
    initialize() {
        Utils.log('Initializing iOS optimizations...');

        this.setupViewportOptimizations();
        this.setupSafariWorkarounds();
        this.setupTouchOptimizations();
        this.setupAudioOptimizations();
        this.setupPerformanceOptimizations();
        this.setupVisualOptimizations();

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 500);
        });

        // Handle viewport changes
        window.addEventListener('resize', () => {
            this.handleViewportChange();
        });

        Utils.log('iOS optimizations applied');
    }

    /**
     * Setup viewport optimizations for iOS
     */
    setupViewportOptimizations() {
        // Prevent zoom on input focus
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
            viewportMeta.setAttribute('content',
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
            );
        }

        // Handle the iOS keyboard appearance
        this.handleKeyboardAppearance();

        // Handle safe area insets
        this.applySafeAreaInsets();
    }

    /**
     * Handle iOS Safari-specific workarounds
     */
    setupSafariWorkarounds() {
        // Prevent body scroll when PWA is in standalone mode
        if (this.isStandalone) {
            document.body.style.position = 'fixed';
            document.body.style.overflow = 'hidden';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
        }

        // Prevent pull-to-refresh
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';

        // Prevent iOS bounce scroll
        let lastTouchY = 0;
        let preventNext = false;

        document.addEventListener('touchstart', (e) => {
            lastTouchY = e.touches[0].clientY;
            preventNext = false;
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const touchYDelta = touchY - lastTouchY;
            lastTouchY = touchY;

            const el = e.target;
            const canScrollUp = el.scrollTop > 0;
            const canScrollDown = el.scrollTop < (el.scrollHeight - el.clientHeight);

            if ((!canScrollUp && touchYDelta > 0) || (!canScrollDown && touchYDelta < 0)) {
                e.preventDefault();
                preventNext = true;
            }
        }, { passive: false });
    }

    /**
     * Setup touch optimizations
     */
    setupTouchOptimizations() {
        // Improve touch responsiveness
        document.addEventListener('touchstart', () => {}, { passive: true });

        // Prevent context menu on long press for app elements
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.app-container')) {
                e.preventDefault();
            }
        });

        // Add haptic feedback for interactions (if available)
        if ('vibrate' in navigator) {
            document.addEventListener('touchstart', (e) => {
                if (e.target.matches('button, .control-btn')) {
                    navigator.vibrate(10); // Subtle haptic feedback
                }
            });
        }

        // Prevent text selection on app interface
        const appElements = document.querySelectorAll('.app-container *:not(input):not(textarea)');
        appElements.forEach(el => {
            el.style.webkitUserSelect = 'none';
            el.style.userSelect = 'none';
        });
    }

    /**
     * Setup audio optimizations for iOS
     */
    setupAudioOptimizations() {
        // Initialize Web Audio Context on first user interaction
        let audioContextInitialized = false;

        const initializeAudioContext = () => {
            if (audioContextInitialized) return;

            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        Utils.log('AudioContext resumed for iOS');
                    });
                }
                audioContextInitialized = true;
            } catch (error) {
                Utils.log(`Failed to initialize AudioContext: ${error.message}`, 'error');
            }

            // Remove event listeners after initialization
            document.removeEventListener('touchstart', initializeAudioContext);
            document.removeEventListener('click', initializeAudioContext);
        };

        document.addEventListener('touchstart', initializeAudioContext, { once: true });
        document.addEventListener('click', initializeAudioContext, { once: true });

        // Optimize speech synthesis for iOS
        if (window.speechSynthesis) {
            // iOS requires synthesis to be started within user gesture
            const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);

            window.speechSynthesis.speak = function(utterance) {
                // Cancel any previous speech
                window.speechSynthesis.cancel();

                // Add a small delay to ensure cancellation
                setTimeout(() => {
                    originalSpeak(utterance);
                }, 10);
            };
        }
    }

    /**
     * Setup performance optimizations
     */
    setupPerformanceOptimizations() {
        // Use passive event listeners where possible
        const passiveEvents = ['touchstart', 'touchmove', 'scroll', 'wheel'];
        passiveEvents.forEach(event => {
            document.addEventListener(event, () => {}, { passive: true });
        });

        // Optimize animations for 120Hz displays (iPhone 15 Pro Max)
        if (window.screen && window.screen.refreshRate) {
            const refreshRate = window.screen.refreshRate;
            if (refreshRate >= 120) {
                // Adjust animation timing for high refresh rate
                document.documentElement.style.setProperty('--animation-timing', 'linear');
                Utils.log(`Optimized for ${refreshRate}Hz display`);
            }
        }

        // Preload critical resources
        this.preloadCriticalResources();

        // Setup memory pressure monitoring
        if ('memory' in performance) {
            const monitorMemory = () => {
                const memInfo = (performance as any).memory;
                const memUsage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;

                if (memUsage > 0.8) {
                    Utils.log('High memory usage detected, triggering cleanup', 'warn');
                    this.performMemoryCleanup();
                }
            };

            setInterval(monitorMemory, 30000); // Check every 30 seconds
        }
    }

    /**
     * Setup visual optimizations
     */
    setupVisualOptimizations() {
        // Optimize for iPhone 15 Pro Max display
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const pixelRatio = window.devicePixelRatio || 1;

        if (screenWidth >= 430 && screenHeight >= 932) {
            document.documentElement.classList.add('iphone-15-pro-max');
            Utils.log('Applied iPhone 15 Pro Max specific styles');
        }

        // Optimize for Dynamic Island
        if (this.safeAreaInsets.top >= 44) {
            document.documentElement.classList.add('has-dynamic-island');
            document.documentElement.style.setProperty('--dynamic-island-height', `${this.safeAreaInsets.top}px`);
        }

        // Setup dark mode detection
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const updateTheme = (e) => {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        };

        darkModeQuery.addEventListener('change', updateTheme);
        updateTheme(darkModeQuery);

        // Optimize visual feedback
        this.setupVisualFeedback();
    }

    /**
     * Get safe area insets
     */
    getSafeAreaInsets() {
        const computedStyle = getComputedStyle(document.documentElement);

        return {
            top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
            right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0,
            bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
            left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0
        };
    }

    /**
     * Apply safe area insets to UI
     */
    applySafeAreaInsets() {
        const root = document.documentElement;
        root.style.setProperty('--safe-area-top', `${this.safeAreaInsets.top}px`);
        root.style.setProperty('--safe-area-right', `${this.safeAreaInsets.right}px`);
        root.style.setProperty('--safe-area-bottom', `${this.safeAreaInsets.bottom}px`);
        root.style.setProperty('--safe-area-left', `${this.safeAreaInsets.left}px`);
    }

    /**
     * Handle keyboard appearance
     */
    handleKeyboardAppearance() {
        let initialViewportHeight = window.innerHeight;

        const handleViewportChange = () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;

            if (heightDifference > 150) {
                // Keyboard is probably visible
                document.documentElement.classList.add('keyboard-visible');
                document.documentElement.style.setProperty('--keyboard-height', `${heightDifference}px`);
            } else {
                // Keyboard is probably hidden
                document.documentElement.classList.remove('keyboard-visible');
                document.documentElement.style.setProperty('--keyboard-height', '0px');
            }
        };

        window.addEventListener('resize', handleViewportChange);
        window.visualViewport?.addEventListener('resize', handleViewportChange);
    }

    /**
     * Handle orientation changes
     */
    handleOrientationChange() {
        // Update viewport height after orientation change
        this.viewportHeight = window.innerHeight;

        // Re-apply safe area insets
        this.safeAreaInsets = this.getSafeAreaInsets();
        this.applySafeAreaInsets();

        // Force layout recalculation
        document.documentElement.style.height = `${this.viewportHeight}px`;

        Utils.log('Handled orientation change');
    }

    /**
     * Handle viewport changes
     */
    handleViewportChange() {
        const newHeight = window.innerHeight;

        if (Math.abs(newHeight - this.viewportHeight) > 50) {
            this.viewportHeight = newHeight;

            // Update CSS custom property
            document.documentElement.style.setProperty('--vh', `${newHeight * 0.01}px`);
        }
    }

    /**
     * Setup visual feedback
     */
    setupVisualFeedback() {
        // Add visual feedback to buttons
        const buttons = document.querySelectorAll('button, .control-btn');

        buttons.forEach(button => {
            button.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.95)';
                this.style.transition = 'transform 0.1s ease';
            }, { passive: true });

            button.addEventListener('touchend', function() {
                this.style.transform = 'scale(1)';
            }, { passive: true });

            button.addEventListener('touchcancel', function() {
                this.style.transform = 'scale(1)';
            }, { passive: true });
        });
    }

    /**
     * Preload critical resources
     */
    preloadCriticalResources() {
        // Preload critical CSS
        const criticalResources = [
            '/css/styles.css',
            '/js/voice.js',
            '/js/n8n.js'
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = resource;
            document.head.appendChild(link);
        });
    }

    /**
     * Perform memory cleanup
     */
    performMemoryCleanup() {
        // Clear any cached data that's not essential
        if (window.caches) {
            caches.open('voice-assistant-v1.0.0-dynamic').then(cache => {
                cache.keys().then(keys => {
                    // Remove half of the dynamic cache entries
                    const keysToDelete = keys.slice(0, Math.floor(keys.length / 2));
                    keysToDelete.forEach(key => cache.delete(key));
                });
            });
        }

        // Trigger garbage collection if available
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }

        Utils.log('Performed memory cleanup');
    }

    /**
     * Check if device supports required features
     */
    checkFeatureSupport() {
        const features = {
            speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
            speechSynthesis: 'speechSynthesis' in window,
            webAudio: !!(window.AudioContext || window.webkitAudioContext),
            serviceWorker: 'serviceWorker' in navigator,
            notifications: 'Notification' in window,
            vibration: 'vibrate' in navigator,
            pwa: this.isStandalone
        };

        Utils.log(`Feature support: ${JSON.stringify(features, null, 2)}`);
        return features;
    }

    /**
     * Get device information
     */
    getDeviceInfo() {
        return {
            isIOS: this.isIOS,
            isStandalone: this.isStandalone,
            userAgent: navigator.userAgent,
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                pixelRatio: window.devicePixelRatio
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            safeAreaInsets: this.safeAreaInsets
        };
    }
}

// Initialize iOS optimizer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.iosOptimizer = new IOSOptimizer();
    });
} else {
    window.iosOptimizer = new IOSOptimizer();
}