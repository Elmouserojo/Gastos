/**
 * Archivo principal - Punto de entrada de la aplicación
 * Coordina todos los módulos con inyección de dependencias optimizada
 */

class App {
    /**
     * @param {Object} dependencies - Dependencias inyectadas
     * @param {Database} dependencies.db - Instancia de la base de datos
     * @param {UI} dependencies.ui - Instancia de la interfaz de usuario
     * @param {Calendar} dependencies.calendar - Instancia del calendario
     * @param {BackupSystem} dependencies.backup - Instancia del sistema de backup
     */
    constructor(dependencies = {}) {
        // 1. Validación de dependencias críticas
        this._validateDependencies(dependencies);

        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.calendar = dependencies.calendar;
        this.backup = dependencies.backup;
        
        // 2. Estado de la aplicación
        this.state = {
            isInitialized: false,
            isOnline: navigator.onLine,
            error: null,
            abortController: new AbortController()
        };

        // Bind de métodos para asegurar el contexto 'this'
        this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
    }

    /**
     * Valida que las dependencias necesarias estén presentes
     * @private
     */
    _validateDependencies(deps) {
        const required = ['db', 'ui', 'calendar', 'backup'];
        required.forEach(dep => {
            if (!deps[dep]) {
                throw new Error(`Dependencia crítica faltante: ${dep}`);
            }
        });
    }

    /**
     * Inicialización asíncrona de la aplicación
     */
    async init() {
        if (this.state.isInitialized) return;

        try {
            console.log('🚀 Iniciando aplicación...');

            // A. Inicializar Base de Datos
            await this.db.init();

            // B. Inicializar Sistema de Backup
            await this.backup.init();

            // C. Configurar UI y Eventos
            this._setupEventListeners();
            await this.ui.init();

            // D. Verificar primer uso (tutorial o datos iniciales)
            await this._checkFirstTime();

            this.state.isInitialized = true;
            console.log('✅ Aplicación lista');

        } catch (error) {
            this._handleFatalError(error);
        }
    }

    /**
     * Configuración centralizada de listeners de eventos globales
     * @private
     */
    _setupEventListeners() {
        const { signal } = this.state.abortController;

        // Estado de conexión
        window.addEventListener('online', this.handleOnlineStatus, { signal });
        window.addEventListener('offline', this.handleOnlineStatus, { signal });

        // Backup preventivo al cerrar
        window.addEventListener('beforeunload', () => {
            if (this.backup && typeof this.backup.runAutoBackup === 'function') {
                this.backup.runAutoBackup();
            }
        }, { signal });
    }

    /**
     * Maneja los cambios de conexión a internet
     */
    handleOnlineStatus() {
        this.state.isOnline = navigator.onLine;
        const status = this.state.isOnline ? 'online' : 'offline';
        const message = this.state.isOnline ? 'Conexión restaurada' : 'Sin conexión a internet';
        
        this.ui.notificationManager.show(message, status === 'online' ? 'success' : 'info');
    }

    /**
     * Lógica para usuarios nuevos
     * @private
     */
    async _checkFirstTime() {
        const transactions = await this.db.getAllTransactions();
        if (transactions.length === 0) {
            setTimeout(() => {
                this.ui.notificationManager.show('¡Bienvenido! Comienza agregando un movimiento.', 'info');
            }, 1000);
        }
    }

    /**
     * Manejo seguro de errores fatales (XSS Protected)
     * @private
     */
    _handleFatalError(error) {
        console.error('❌ Error fatal:', error);
        this.state.error = error;

        const container = document.createElement('div');
        container.className = 'fatal-error-overlay';

        const title = document.createElement('h2');
        title.textContent = 'Error de Inicialización';

        const message = document.createElement('p');
        message.textContent = `Hubo un problema al cargar la aplicación: ${error.message}`;

        const retryBtn = document.createElement('button');
        retryBtn.textContent = 'Reintentar';
        retryBtn.onclick = () => location.reload();

        container.append(title, message, retryBtn);
        
        // Limpiar body de forma segura y mostrar error
        document.body.innerHTML = ''; 
        document.body.appendChild(container);
    }

    /**
     * Limpieza de recursos
     */
    destroy() {
        this.state.abortController.abort();
        this.state.isInitialized = false;
        console.log('🧹 Recursos de App liberados');
    }
}

// ========== INICIALIZACIÓN GLOBAL ==========

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Se asume que las instancias de los módulos ya fueron creadas por sus respectivos scripts
        const app = new App({
            db: window.db,
            ui: window.ui,
            calendar: window.calendar,
            backup: window.backupSystem
        });

        // Exponer instancia controlada
        window.app = app;
        
        // Ejecutar
        app.init();

    } catch (error) {
        console.error('Error crítico en el arranque:', error);
    }
});