/**
 * Service Worker for WeatherFlow PWA
 * Implements advanced caching strategies for offline functionality
 * Follows best practices from web.dev PWA guidelines
 */

// Cache configuration
const CACHE_NAME = 'weatherflow-v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Assets to cache on install
const CORE_ASSETS = [
    '/',
    './index.html',
    './manifest.json',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
    '../src/css/main.css',
    '../src/js/main.js',
];

// Weather data cache configuration
const WEATHER_CACHE_NAME = 'weather-data-v1';
const WEATHER_CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

/**
 * Install event - cache core assets
 */
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing...');

    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching core assets');
                return cache.addAll(CORE_ASSETS);
            })
            .then(() => {
                console.log('[ServiceWorker] Installation complete');
                // Force activation to ensure new service worker takes control immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[ServiceWorker] Installation failed:', error);
            })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');

    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches that don't match current cache names
                        if (cacheName !== CACHE_NAME && cacheName !== WEATHER_CACHE_NAME) {
                            console.log(`[ServiceWorker] Deleting old cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Activation complete');
                // Claim all clients immediately
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Handle weather API requests with stale-while-revalidate strategy
    if (requestUrl.pathname.includes('/weather') || requestUrl.pathname.includes('api.openweathermap.org')) {
        event.respondWith(handleWeatherRequest(event.request));
        return;
    }

    // Handle static assets with cache-first strategy
    if (isStaticAsset(requestUrl)) {
        event.respondWith(handleStaticRequest(event.request));
        return;
    }

    // Default network-first strategy for other requests
    event.respondWith(handleDefaultRequest(event.request));
});

/**
 * Handle weather API requests with stale-while-revalidate strategy
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>} Cached or network response
 */
async function handleWeatherRequest(request) {
    const cache = await caches.open(WEATHER_CACHE_NAME);

    try {
        // Try to get cached response first
        const cachedResponse = await cache.match(request);
        const cacheTime = cachedResponse ? await getCacheTime(cache, request) : null;

        // Check if cached response is still valid
        if (cachedResponse && cacheTime && Date.now() - cacheTime < WEATHER_CACHE_MAX_AGE) {
            console.log('[ServiceWorker] Returning cached weather data');
            return cachedResponse;
        }

        // Fetch fresh data from network
        console.log('[ServiceWorker] Fetching fresh weather data');
        const networkResponse = await fetch(request.clone());

        // Clone response before using it
        const responseClone = networkResponse.clone();

        // Update cache with fresh data
        await cache.put(request, responseClone);
        await setCacheTime(cache, request, Date.now());

        return networkResponse;
    } catch (error) {
        console.error('[ServiceWorker] Weather fetch failed:', error);

        // Return cached response if available as fallback
        if (cachedResponse) {
            console.log('[ServiceWorker] Returning stale weather data due to network error');
            return cachedResponse;
        }

        // Return error response if no cache available
        return new Response('Weather data unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
        });
    }
}

/**
 * Handle static asset requests with cache-first strategy
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>} Cached or network response
 */
async function handleStaticRequest(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        // Try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.log(`[ServiceWorker] Returning cached asset: ${request.url}`);
            return cachedResponse;
        }

        // Fetch from network if not in cache
        console.log(`[ServiceWorker] Fetching asset from network: ${request.url}`);
        const networkResponse = await fetch(request);

        // Cache the response for future use
        await cache.put(request, networkResponse.clone());

        return networkResponse;
    } catch (error) {
        console.error(`[ServiceWorker] Static asset fetch failed: ${request.url}`, error);

        // Return cached response if available
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

/**
 * Handle default requests with network-first strategy
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>} Network or cached response
 */
async function handleDefaultRequest(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        // Try network first
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.status === 200) {
            await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error(`[ServiceWorker] Default fetch failed: ${request.url}`, error);

        // Return cached response as fallback
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

/**
 * Check if URL is a static asset
 * @param {URL} url - The URL to check
 * @returns {boolean} True if static asset
 */
function isStaticAsset(url) {
    const staticExtensions = ['.html', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const pathname = url.pathname;

    return (
        staticExtensions.some((ext) => pathname.endsWith(ext)) ||
        pathname === '/' ||
        pathname.startsWith('/icons/') ||
        pathname.startsWith('/assets/')
    );
}

/**
 * Get cache timestamp for a request
 * @param {Cache} cache - The cache object
 * @param {Request} request - The request
 * @returns {Promise<number|null>} Cache timestamp or null
 */
async function getCacheTime(cache, request) {
    try {
        const response = await cache.match(request);
        if (response && response.headers.has('x-cache-time')) {
            return parseInt(response.headers.get('x-cache-time'));
        }
    } catch (error) {
        console.error('[ServiceWorker] Error getting cache time:', error);
    }
    return null;
}

/**
 * Set cache timestamp for a request
 * @param {Cache} cache - The cache object
 * @param {Request} request - The request
 * @param {number} timestamp - The timestamp to set
 */
async function setCacheTime(cache, request, timestamp) {
    try {
        const response = await cache.match(request);
        if (response) {
            const headers = new Headers(response.headers);
            headers.set('x-cache-time', timestamp.toString());

            const modifiedResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });

            await cache.put(request, modifiedResponse);
        }
    } catch (error) {
        console.error('[ServiceWorker] Error setting cache time:', error);
    }
}

/**
 * Message handler for client communication
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[ServiceWorker] WeatherFlow Service Worker loaded');
