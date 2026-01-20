/**
 * Service Worker - Cuentas Claras
 * Gestión de modo offline y estrategias de caché
 */

const VERSION = 'v2.1';
const CACHE_NAME = `cuentas-claras-${VERSION}`;

// Archivos esenciales para que la app funcione offline
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/app.js',
    '/database.js',
    '/ui.js',
    '/calendar.js',
    '/backup-system.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

/**
 * Instalación: Guardar archivos críticos en caché
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Almacenando assets estáticos');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting()) // Forzar activación inmediata
    );
});

/**
 * Activación: Limpiar versiones viejas de caché
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim()) // Tomar control de las pestañas abiertas
    );
});

/**
 * Intercepción de peticiones (Fetch)
 */
self.addEventListener('fetch', (event) => {
    // Solo manejar peticiones GET
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Estrategia: Cache First para fuentes e iconos (rara vez cambian)
    if (url.origin === 'https://fonts.gstatic.com' || url.origin === 'https://fonts.googleapis.com') {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // Estrategia: Network First para el resto (asegura tener lo último)
    event.respondWith(networkFirst(event.request));
});

/**
 * Estrategia: Primero Red, con caída a Caché
 */
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        return cachedResponse || Response.error();
    }
}

/**
 * Estrategia: Primero Caché, con caída a Red
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || fetch(request);
}

/**
 * Mensajería: Recibir comandos desde la app principal
 */
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});