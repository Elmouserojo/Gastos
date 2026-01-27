/**
 * Componente de Notificaciones
 * Controla la visibilidad temporal de los mensajes.
 */
class NotificationManager {
    constructor() {
        this.el = document.getElementById('notification');
        this.timeoutId = null; // Almacena el temporizador activo
    }

    show(message, type = 'info') {
        if (!this.el) return;

        // 1. LIMPIAR: Si ya había un mensaje contando, lo detenemos
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        // 2. MOSTRAR: Seteamos el contenido y activamos
        this.el.textContent = message;
        // Respetamos estrictamente tu estructura de clases de layout.css
        this.el.className = `notification active ${type}`;

        // 3. OCULTAR: Programamos la desaparición
        this.timeoutId = setTimeout(() => {
            this.el.classList.remove('active');
            this.timeoutId = null;
        }, 3000); 
    }
}

// Instancia global
window.notifications = new NotificationManager();