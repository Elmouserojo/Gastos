/**
 * Service Worker - Cuentas Claras
 * Versión: v3 (Modelo Mensual y Modular)
 * Estrategia: Network First para archivos locales / Cache First para recursos externos
 */

const VERSION = 'v3';
const CACHE_NAME = `cuentas-claras-${VERSION}`;

// Lista de activos (Rutas mantenidas exactamente según tu configuración)
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './sw-registration.js',
    
    // Estilos Modularizados
    './estilos/variables.css',
    './estilos/base.css',
    './estilos/layout.css',
    './estilos/components.css',
    './estilos/forms.css',
    './estilos/calendar.css',
    './estilos/navbar.css',
    './estilos/theme.css',

    // Motor y Stores de Datos
    './database.js',
    './transaction-store.js',
    './budget-store.js',
    './category-store.js',

    // Controladores de UI y Reportes
    './ui-notifications.js',
    './ui-charts.js',
    './ui-budget.js',
    './ui-reports.js',
    './ui.js',

    // Módulos de Lógica
    './calendar.js',
    './cotizador.js',
    './backup-system.js',
    './app.js',

    // CDN y Fuentes
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

/**
 * Instalación: Cacheo de activos y forzado de activación
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log(`📦 SW ${VERSION}: Almacenando activos estáticos`);
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

/**
 * Activación: Limpieza de versiones previas para liberar espacio
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

/**
 * Intercepción de peticiones (Fetch)
 */
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Estrategia: Cache First para activos externos (Fuentes y CDNs)
    if (url.origin === 'https://fonts.gstatic.com' || 
        url.origin === 'https://fonts.googleapis.com' ||
        url.hostname.includes('cdn.jsdelivr.net')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // Estrategia: Network First para archivos locales (asegura datos frescos)
    event.respondWith(networkFirst(event.request));
});

/**
 * Lógica Network First: Intenta red, si falla busca en caché
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
 * Lógica Cache First: Usa caché, si no existe va a red
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || fetch(request);
}

/**
 * Listener de Mensajes: Control de actualización desde la App
 */
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});