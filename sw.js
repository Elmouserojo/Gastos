const CACHE_NAME = 'cuentas-claras-v2';
const ASSETS = [
    './',
    './index.html',
    './estilos/variables.css',
    './estilos/base.css',
    './estilos/layout.css',
    './estilos/components.css',
    './estilos/forms.css',
    './estilos/calendar.css',
    './estilos/navbar.css',
    './estilos/theme.css',
    './database.js',
    './ui.js',
    './calendar.js',
    './backup-system.js',
    './app.js',
    './offline.html',
    './manifest.json'
];

// 1. INSTALACIÓN: Guardar todos los archivos en el celular
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('📦 Archivos cacheados para uso offline');
            return cache.addAll(ASSETS);
        })
    );
});

// 2. ACTIVACIÓN: Borrar cachés viejos si actualizás la app
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// 3. ESTRATEGIA DE CARGA: Primero busca en caché, si falla (offline), intenta red
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                // Si falla internet y es una página, mostrar offline.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./offline.html');
                }
            });
        })
    );
});

// 4. ACTUALIZACIÓN: Escuchar el mensaje de sw-registration para renovarse
self.addEventListener('message', event => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});