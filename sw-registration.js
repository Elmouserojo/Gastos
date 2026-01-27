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
      this.registration = await navigator.serviceWorker.register('/Gastos/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Siempre verificar updates
      });

      console.log('Service Worker registrado:', this.registration);

      this.setupEventListeners();
      this.checkForUpdates();
      this.setupPeriodicUpdates();
    } catch (error) {
      console.error('Error registrando Service Worker:', error);
    }
  }

  setupEventListeners() {
    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
      this.handleSWMessage(event.data);
    });

    // Controlador para cuando se actualiza el Service Worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Nuevo Service Worker tomó control');
      window.location.reload();
    });
  }

  handleSWMessage(message) {
    console.log('Mensaje de Service Worker:', message);

    switch (message.type) {
      case 'SW_INSTALLED':
        console.log(`Service Worker instalado (v${message.version})`);
        this.showToast('Aplicación lista para usar offline');
        break;

      case 'SW_ACTIVATED':
        console.log(`Service Worker activado (v${message.version})`);
        break;

      case 'ASSET_UPDATED':
        console.log('Recurso actualizado:', message.url);
        if (message.url.includes('.js')) {
          this.notifyAppUpdate();
        }
        break;

      case 'SYNC_COMPLETE':
        this.showToast(`${message.successful} transacciones sincronizadas`);
        break;

      case 'APP_UPDATED':
        this.updateAvailable = true;
        this.showUpdateNotification();
        break;
    }
  }

  async checkForUpdates() {
    if (!this.registration) return;

    try {
      // Forzar verificación de actualizaciones
      const newRegistration = await this.registration.update();
      
      if (newRegistration.installing) {
        console.log('Nueva versión del Service Worker encontrada');
        this.updateAvailable = true;
        this.showUpdateNotification();
      }
    } catch (error) {
      console.debug('Error verificando updates:', error);
    }
  }

  setupPeriodicUpdates() {
    // Verificar updates cada 1 hora
    setInterval(() => this.checkForUpdates(), 60 * 60 * 1000);
    
    // Verificar cuando la app vuelve a primer plano
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
  }

  showUpdateNotification() {
    if (!this.updateAvailable) return;

    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <i class="material-icons">system_update</i>
        <span>Nueva versión disponible</span>
        <div class="update-actions">
          <button class="btn-secondary" id="update-later">Después</button>
          <button class="btn-primary" id="update-now">Actualizar</button>
        </div>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      max-width: 320px;
    `;

    document.body.appendChild(notification);

    // Event listeners para los botones
    notification.querySelector('#update-now').addEventListener('click', () => {
      this.applyUpdate();
      notification.remove();
    });

    notification.querySelector('#update-later').addEventListener('click', () => {
      notification.remove();
    });

    // Auto-ocultar después de 30 segundos
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 30000);
  }

  async applyUpdate() {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    // Pedir al Service Worker que salte la espera
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Recargar la página después de un breve delay
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  showToast(message, type = 'info') {
    // Implementar sistema de notificaciones toast
    console.log(`[Toast ${type}]: ${message}`);
    
    // Si tienes un sistema de notificaciones en la UI, usarlo aquí
    if (window.ui && window.ui.showNotification) {
      window.ui.showNotification(message, type);
    }
  }

  notifyAppUpdate() {
    // Notificar a la aplicación sobre actualización de assets
    if (window.ui && window.ui.showNotification) {
      window.ui.showNotification('Aplicación actualizada, recarga para ver cambios', 'info');
    }
  }

  // Métodos públicos
  async clearCache() {
    if (!this.registration) return false;

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Error limpiando caché:', error);
      return false;
    }
  }

  async getVersion() {
    if (!this.registration) return null;

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.version);
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_VERSION' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('Error obteniendo versión:', error);
      return null;
    }
  }

  async registerSync(tag = 'sync-transactions') {
    if (!('SyncManager' in window)) {
      console.warn('Background Sync no soportado');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log('Background Sync registrado:', tag);
      return true;
    } catch (error) {
      console.error('Error registrando Background Sync:', error);
      return false;
    }
  }
}

// Instancia global
const swManager = new ServiceWorkerManager();

// Exportar para uso global
window.ServiceWorkerManager = swManager;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.swManager = swManager;
  });
} else {
  window.swManager = swManager;
}