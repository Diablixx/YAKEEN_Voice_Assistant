/**
 * Service Worker for Voice Assistant PWA
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'voice-assistant-v1.0.0';
const STATIC_CACHE_NAME = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`;

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/main.js',
    '/js/voice.js',
    '/js/n8n.js',
    '/js/config.js',
    '/js/utils.js',
    '/manifest.json',
    '/icons/favicon-16x16.png',
    '/icons/favicon-32x32.png',
    '/icons/apple-touch-icon.png'
];

// Files that should be cached dynamically
const DYNAMIC_CACHE_LIMIT = 50;

/**
 * Install event - cache static files
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Install event');

    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[SW] Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static files:', error);
            })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName.startsWith('voice-assistant-') &&
                            cacheName !== STATIC_CACHE_NAME &&
                            cacheName !== DYNAMIC_CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Cache cleanup completed');
                return self.clients.claim();
            })
            .catch((error) => {
                console.error('[SW] Cache cleanup failed:', error);
            })
    );
});

/**
 * Fetch event - serve cached files and handle network requests
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle different types of requests
    if (url.origin === self.location.origin) {
        // Same origin requests - use cache-first strategy for static files
        event.respondWith(handleSameOriginRequest(request));
    } else {
        // External requests (like n8n webhooks) - use network-first strategy
        event.respondWith(handleExternalRequest(request));
    }
});

/**
 * Handle same-origin requests (app files)
 */
async function handleSameOriginRequest(request) {
    const url = new URL(request.url);
    const isStaticFile = STATIC_FILES.some(file => url.pathname.endsWith(file));

    try {
        if (isStaticFile) {
            // Cache-first strategy for static files
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }

            const networkResponse = await fetch(request);
            if (networkResponse.status === 200) {
                const cache = await caches.open(STATIC_CACHE_NAME);
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;

        } else {
            // Network-first strategy for dynamic content
            try {
                const networkResponse = await fetch(request);
                if (networkResponse.status === 200) {
                    await cacheDynamically(request, networkResponse.clone());
                }
                return networkResponse;
            } catch (networkError) {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                throw networkError;
            }
        }
    } catch (error) {
        console.error('[SW] Request failed:', request.url, error);

        // Return cached version if available
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/index.html');
        }

        // Return a basic error response
        return new Response('Network error', {
            status: 408,
            statusText: 'Network timeout or error'
        });
    }
}

/**
 * Handle external requests (n8n webhooks, etc.)
 */
async function handleExternalRequest(request) {
    try {
        // Network-only strategy for external APIs
        return await fetch(request);
    } catch (error) {
        console.error('[SW] External request failed:', request.url, error);

        // Return a basic error response for API calls
        return new Response(JSON.stringify({
            error: 'Network error',
            message: 'Unable to connect to external service',
            offline: true
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

/**
 * Cache responses dynamically
 */
async function cacheDynamically(request, response) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        await cache.put(request, response);

        // Limit dynamic cache size
        await limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
    } catch (error) {
        console.error('[SW] Failed to cache dynamically:', error);
    }
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, limit) {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        if (keys.length > limit) {
            const keysToDelete = keys.slice(0, keys.length - limit);
            await Promise.all(keysToDelete.map(key => cache.delete(key)));
            console.log(`[SW] Cleaned ${keysToDelete.length} old cache entries`);
        }
    } catch (error) {
        console.error('[SW] Failed to limit cache size:', error);
    }
}

/**
 * Background sync event
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync event:', event.tag);

    if (event.tag === 'voice-command-sync') {
        event.waitUntil(syncPendingVoiceCommands());
    }
});

/**
 * Sync pending voice commands when back online
 */
async function syncPendingVoiceCommands() {
    try {
        console.log('[SW] Syncing pending voice commands...');

        // Get pending commands from IndexedDB or localStorage
        const pendingCommands = await getPendingCommands();

        if (pendingCommands.length > 0) {
            console.log(`[SW] Found ${pendingCommands.length} pending commands`);

            for (const command of pendingCommands) {
                try {
                    await fetch(command.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(command.data)
                    });

                    // Remove successfully sent command
                    await removePendingCommand(command.id);
                    console.log('[SW] Successfully synced command:', command.id);

                } catch (error) {
                    console.error('[SW] Failed to sync command:', command.id, error);
                }
            }
        }
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

/**
 * Get pending commands (placeholder - would use IndexedDB in production)
 */
async function getPendingCommands() {
    // This would typically read from IndexedDB
    // For now, returning empty array
    return [];
}

/**
 * Remove pending command (placeholder)
 */
async function removePendingCommand(id) {
    // This would typically remove from IndexedDB
    console.log('[SW] Would remove pending command:', id);
}

/**
 * Message event - communication with main thread
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_VERSION':
            event.ports[0]?.postMessage({
                type: 'VERSION',
                data: { version: CACHE_NAME }
            });
            break;

        case 'CACHE_COMMAND':
            // Cache a failed command for later sync
            cacheFailedCommand(data).then(() => {
                event.ports[0]?.postMessage({
                    type: 'COMMAND_CACHED',
                    data: { success: true }
                });
            });
            break;

        default:
            console.log('[SW] Unknown message type:', type);
    }
});

/**
 * Cache failed command for background sync
 */
async function cacheFailedCommand(commandData) {
    try {
        console.log('[SW] Caching failed command for later sync:', commandData);
        // This would typically store in IndexedDB
        // For now, just registering background sync
        await self.registration.sync.register('voice-command-sync');
    } catch (error) {
        console.error('[SW] Failed to cache command:', error);
    }
}

/**
 * Push event - handle push notifications
 */
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');

    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'New notification',
            icon: '/icons/icon-192.png',
            badge: '/icons/favicon-32x32.png',
            vibrate: [200, 100, 200],
            data: data.data || {},
            actions: data.actions || []
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Voice Assistant', options)
        );
    }
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            // Check if app is already open
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }

            // Open new window if app is not open
            if (self.clients.openWindow) {
                return self.clients.openWindow('/');
            }
        })
    );
});

console.log('[SW] Service Worker loaded successfully');