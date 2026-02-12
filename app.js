/**
 * Archivo principal - Punto de entrada de la aplicación
 * Coordina todos los módulos con inyección de dependencias optimizada
 */

class App {
    /**
     * @param {Object} dependencies - Dependencias inyectadas
     */
    constructor(dependencies = {}) {
        this._validateDependencies(dependencies);

        this.db = dependencies.db;
        this.categoryDb = dependencies.categoryDb;
        this.ui = dependencies.ui;
        this.calendar = dependencies.calendar;
        this.backup = dependencies.backup;
        
        this.state = {
            isInitialized: false,
            isOnline: navigator.onLine,
            error: null,
            abortController: new AbortController()
        };

        this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
    }

    _validateDependencies(deps) {
        const required = ['db', 'categoryDb', 'ui', 'calendar', 'backup'];
        required.forEach(dep => {
            if (!deps[dep]) {
                throw new Error(`Dependencia crítica faltante: ${dep}`);
            }
        });
    }

    /**
     * Solicita al navegador que no borre los datos de IndexedDB automáticamente.
     * Vital para evitar la pérdida de datos en limpiezas automáticas del sistema.
     */
    async _requestStoragePersistence() {
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persisted();
                if (!isPersisted) {
                    const granted = await navigator.storage.persist();
                    console.log(`¿Persistencia de datos concedida?: ${granted ? "Sí" : "No"}`);
                }
            } catch (err) {
                console.warn("Error al solicitar persistencia de datos:", err);
            }
        }
    }

    /**
     * Inicialización asíncrona de la aplicación
     */
    async init() {
        if (this.state.isInitialized) return;

        try {
            console.log('🚀 Iniciando Cuentas Claras...');

            // A. Garantizar persistencia de almacenamiento
            await this._requestStoragePersistence();

            // B. Inicializar Base de Datos (Motor IndexedDB v3)
            await this.db.init();

            // C. Sembrar categorías iniciales si es la primera vez
            if (this.categoryDb && typeof this.categoryDb.seed === 'function') {
                await this.categoryDb.seed();
            }

            // D. Configurar UI y Eventos Globales
            this._setupEventListeners();
            
            // ui.init() ahora configura el month-selector y carga el primer dashboard mensual
            await this.ui.init(); 

            // E. Verificar si es el primer uso para dar la bienvenida
            await this._checkFirstTime();

            this.state.isInitialized = true;
            console.log('✅ Aplicación lista y sincronizada con el modelo mensual');

        } catch (error) {
            this._handleFatalError(error);
        }
    }

    /**
     * Refresca la visualización de la app respetando el filtro mensual seleccionado
     */
    async refresh() {
        if (!this.state.isInitialized) return;
        
        try {
            // ui.loadDashboard() lee automáticamente el valor del month-selector
            await this.ui.loadDashboard();
            
            if (this.calendar && typeof this.calendar.init === 'function') {
                this.calendar.init();
            }
        } catch (error) {
            console.error('Error al refrescar la aplicación:', error);
        }
    }

    _setupEventListeners() {
        const { signal } = this.state.abortController;

        // Detectar cambios de conexión
        window.addEventListener('online', this.handleOnlineStatus, { signal });
        window.addEventListener('offline', this.handleOnlineStatus, { signal });

        // Escuchar cambios de datos para disparar refrescos globales
        window.addEventListener('transaction-updated', () => this.refresh(), { signal });

        // Auto-backup al cerrar (si está implementado)
        window.addEventListener('beforeunload', () => {
            if (this.backup && typeof this.backup.runAutoBackup === 'function') {
                this.backup.runAutoBackup();
            }
        }, { signal });
    }

    handleOnlineStatus() {
        this.state.isOnline = navigator.onLine;
        const message = this.state.isOnline ? 'Conexión restaurada' : 'Sin conexión a internet (Modo Offline)';
        
        const notifier = this.ui.notifications;
        if (notifier) {
            notifier.show(message, this.state.isOnline ? 'success' : 'info');
        }
    }

    async _checkFirstTime() {
        const transactions = await this.db.getAllTransactions();
        
        if (transactions.length === 0) {
            setTimeout(() => {
                if (this.ui.notifications) {
                    this.ui.notifications.show('¡Bienvenido! Comienza eligiendo un mes y agregando un movimiento.', 'info');
                }
            }, 1000);
        }
    }

    _handleFatalError(error) {
        console.error('❌ Error fatal de sistema:', error);
        this.state.error = error;

        const container = document.createElement('div');
        container.className = 'fatal-error-overlay';
        container.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:#121212;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;padding:20px;text-align:center;font-family:sans-serif;";

        container.innerHTML = `
            <div style="max-width:400px">
                <h2 style="color:#ff5252; margin-bottom:10px">Error de Inicialización</h2>
                <p style="margin:15px 0;opacity:0.8;line-height:1.5">No pudimos conectar con la base de datos local. Por favor, intenta recargar la página.</p>
                <code style="display:block;background:#222;padding:10px;border-radius:4px;font-size:12px;margin-bottom:20px;color:#ff8a80">${error.message}</code>
                <button onclick="location.reload()" style="background:#bb86fc;border:none;padding:12px 24px;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;width:100%">Reintentar</button>
            </div>
        `;
        
        document.body.innerHTML = ''; 
        document.body.appendChild(container);
    }

    destroy() {
        this.state.abortController.abort();
        this.state.isInitialized = false;
        console.log('Sweep: Recursos liberados');
    }
}

// ========== INICIALIZACIÓN GLOBAL (BOOTSTRAP) ==========



document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializar Motor de Datos
        const dbEngine = new Database();

        // Inyectar motor en los Stores específicos
        window.db = new TransactionStore(dbEngine);
        window.budgetDb = new BudgetStore(dbEngine);
        window.categoryDb = new CategoryStore(dbEngine);

        // Inicializar Gestores de UI y Lógica
        window.charts = new ChartManager();
        window.budgetManager = new BudgetManager();
        window.calendar = new Calendar();
        window.backupSystem = new BackupSystem({ db: window.db, ui: window.ui });

        // Crear instancia de la App con inyección de dependencias
        const app = new App({
            db: window.db,
            categoryDb: window.categoryDb,
            ui: window.ui,
            calendar: window.calendar,
            backup: window.backupSystem 
        });

        // Hacer la instancia accesible globalmente para depuración o refrescos manuales
        window.app = app;
        
        // Arrancar aplicación
        app.init();

    } catch (error) {
        console.error('Error crítico en el arranque (Bootstrap):', error);
    }
});