// sw-registration.js - Manejo del Service Worker desde la aplicación

class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
    this.init();
  }

  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker no soportado');
      return;
    }

    try {
      // Mantenemos tus rutas y scope intactos
      this.registration = await navigator.serviceWorker.register('/Gastos/sw.js', {
        scope: './Gastos/',
        updateViaCache: 'none'
      });

      console.log('✅ Service Worker registrado:', this.registration);

      this.setupEventListeners();
      this.checkForUpdates();
      this.setupPeriodicUpdates();
    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
    }
  }

  setupEventListeners() {
    // Detectar si hay un SW esperando apenas cargamos
    if (this.registration && this.registration.waiting) {
        this.updateAvailable = true;
        this.showUpdateNotification();
    }

    // Escuchar si aparece un nuevo SW mientras la app está abierta
    this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                this.showUpdateNotification();
            }
        });
    });

    // Recargar automáticamente cuando el nuevo SW tome el control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Aplicando nueva versión...');
      window.location.reload();
    });
  }

  async checkForUpdates() {
    if (!this.registration) return;
    try {
      await this.registration.update();
    } catch (error) {
      console.debug('Error verificando updates:', error);
    }
  }

  setupPeriodicUpdates() {
    setInterval(() => this.checkForUpdates(), 1000 * 60 * 60); // Cada hora
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.checkForUpdates();
    });
  }

  showUpdateNotification() {
    // Evitar duplicados si ya hay una notificación
    if (document.querySelector('.update-notification')) return;

    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content" style="display:flex; align-items:center; gap:10px;">
        <i class="material-icons" style="color:var(--primary-color)">system_update</i>
        <span style="font-size:13px; color:var(--text-primary)">Nueva versión v3 lista</span>
        <div class="update-actions" style="display:flex; gap:10px; margin-left:auto;">
          <button id="update-now" class="btn-primary" style="padding:6px 12px; font-size:12px; width:auto;">Actualizar</button>
        </div>
      </div>
    `;

    // Usamos el estilo que ya tenías pero optimizado
    notification.style.cssText = `
      position: fixed;
      bottom: 80px; /* Por encima de la navbar */
      left: 20px;
      right: 20px;
      background: var(--surface-color);
      border: 1px solid var(--primary-color);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 2000;
    `;

    document.body.appendChild(notification);

    notification.querySelector('#update-now').addEventListener('click', () => {
      this.applyUpdate();
    });
  }

  async applyUpdate() {
    if (!this.registration || !this.registration.waiting) return;

    // Sincronizado con el listener de sw.js: usamos 'action' y 'skipWaiting'
    this.registration.waiting.postMessage({ action: 'skipWaiting' });
  }
}

// Inicialización
const swManager = new ServiceWorkerManager();
window.swManager = swManager;