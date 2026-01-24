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
     */
    async _requestStoragePersistence() {
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persisted();
                console.log(`¿Persistencia actual?: ${isPersisted ? "Si" : "No"}`);
                
                if (!isPersisted) {
                    const granted = await navigator.storage.persist();
                    console.log(`¿Persistencia concedida?: ${granted ? "Si" : "No"}`);
                }
            } catch (err) {
                console.warn("Error al solicitar persistencia de datos:", err);
            }
        }
    }

    /**
     * Inicialización asíncrona
     */
    async init() {
        if (this.state.isInitialized) return;

        try {
            console.log('🚀 Iniciando Cuentas Claras...');

            // A. NUEVO: Solicitar persistencia de almacenamiento antes de abrir la DB
            await this._requestStoragePersistence();

            // B. Inicializar Base de Datos (Motor IndexedDB v3)
            await this.db.init();

            // C. Sembrar categorías iniciales si es la primera vez
            await this.categoryDb.seed();

            // D. Inicializar Sistema de Backup
            if (this.backup.init) await this.backup.init();

            // E. Configurar UI y Eventos
            this._setupEventListeners();
            await this.ui.init(); 

            // F. Verificar primer uso
            await this._checkFirstTime();

            this.state.isInitialized = true;
            console.log('✅ Aplicación lista y sincronizada');

        } catch (error) {
            this._handleFatalError(error);
        }
    }

    /**
     * Refresca toda la visualización de la app
     */
    async refresh() {
        if (!this.state.isInitialized) return;
        
        try {
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

        window.addEventListener('online', this.handleOnlineStatus, { signal });
        window.addEventListener('offline', this.handleOnlineStatus, { signal });

        window.addEventListener('beforeunload', () => {
            if (this.backup && typeof this.backup.runAutoBackup === 'function') {
                this.backup.runAutoBackup();
            }
        }, { signal });
    }

    handleOnlineStatus() {
        this.state.isOnline = navigator.onLine;
        const message = this.state.isOnline ? 'Conexión restaurada' : 'Sin conexión a internet';
        
        const notifier = this.ui.notifications || this.ui.notificationManager;
        if (notifier) {
            notifier.show(message, this.state.isOnline ? 'success' : 'info');
        }
    }

    async _checkFirstTime() {
        const transactions = await this.db.getAllTransactions();
        
        if (transactions.length === 0) {
            setTimeout(() => {
                const notifier = this.ui.notifications || this.ui.notificationManager;
                if (notifier) {
                    notifier.show('¡Bienvenido! Comienza agregando un movimiento.', 'info');
                }
            }, 1000);
        }
    }

    _handleFatalError(error) {
        console.error('❌ Error fatal:', error);
        this.state.error = error;

        const container = document.createElement('div');
        container.className = 'fatal-error-overlay';
        container.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:#121212;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;padding:20px;text-align:center;font-family:sans-serif;";

        container.innerHTML = `
            <h2 style="color:#ff5252">Error de Inicialización</h2>
            <p style="margin:15px 0;opacity:0.8">Hubo un problema al cargar la aplicación: ${error.message}</p>
            <button onclick="location.reload()" style="background:#bb86fc;border:none;padding:12px 24px;border-radius:8px;color:#000;font-weight:bold;cursor:pointer">Reintentar</button>
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
        const dbEngine = new Database();

        window.db = new TransactionStore(dbEngine);
        window.budgetDb = new BudgetStore(dbEngine);
        window.categoryDb = new CategoryStore(dbEngine);

        window.charts = new ChartManager();
        window.budgetManager = new BudgetManager();
        window.calendar = new Calendar();
        window.backupSystem = new BackupSystem({ db: window.db, ui: window.ui });

        const app = new App({
            db: window.db,
            categoryDb: window.categoryDb,
            ui: window.ui,
            calendar: window.calendar,
            backup: window.backupSystem 
        });

        window.app = app;
        app.init();

    } catch (error) {
        console.error('Error crítico en el arranque (Bootstrap):', error);
    }
});