const CACHE_NAME = 'cuentas-claras-v3'; // Subimos a v3 para forzar la actualización
const ASSETS = [
    './',
    './index.html',
    './offline.html',

    // Estilos
    './estilos/variables.css',
    './estilos/base.css',
    './estilos/layout.css',
    './estilos/components.css',
    './estilos/forms.css',
    './estilos/calendar.css',
    './estilos/navbar.css',
    './estilos/theme.css',
    
    // Scripts de Datos (NUEVOS MÓDULOS)
    './database.js',
    './transaction-store.js',
    './budget-store.js',
    './category-store.js',

    // Scripts de UI (NUEVOS MÓDULOS)
    './ui-notifications.js',
    './ui-charts.js',
    './ui-budget.js',
    './ui-reports.js', // Reporte Mensual
    './ui.js',

    // Lógica General
    './cotizador.js',
    './calendar.js',
    './backup-system.js',
    './app.js',
    './manifest.json',
    './sw-registration.js',
    
    // CDNs
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

// 1. INSTALACIÓN: Guardar todos los archivos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('📦 SW v3: Archivos modulares cacheados');
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 2. ACTIVACIÓN: Limpiar versiones viejas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// 3. ESTRATEGIA DE CARGA: Cache First, Network Fallback
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./offline.html');
                }
            });
        })
    );
});

// 4. ACTUALIZACIÓN: Sincronizado con sw-registration.js
self.addEventListener('message', event => {
    // Aceptamos ambos formatos para mayor compatibilidad
    if (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});