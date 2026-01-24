/**
 * Componente de Notificaciones
 */
class NotificationManager {
    constructor() {
        this.el = document.getElementById('notification');
    }

    show(message, type = 'info') {
        if (!this.el) return;
        this.el.textContent = message;
        this.el.className = `notification active ${type}`;
        setTimeout(() => this.el.classList.remove('active'), 3000);
    }
}

// Instancia global
window.notifications = new NotificationManager();