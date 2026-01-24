/**
 * Core de Base de Datos - IndexedDB (Versión Dinámica)
 */
class Database {
    constructor() {
        this.dbName = 'cuentas-claras-db';
        this.dbVersion = 3; // Subimos a v3 para incluir categorías personalizables
        this.db = null;
    }

    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (e) => reject(e.target.error);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 1. Tabla de Transacciones
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('date', 'date', { unique: false });
                }

                // 2. Tabla de Presupuestos
                if (!db.objectStoreNames.contains('budgets')) {
                    db.createObjectStore('budgets', { keyPath: 'category' }); 
                }

                // 3. NUEVO: Tabla de Categorías Personalizables
                if (!db.objectStoreNames.contains('categories')) {
                    db.createObjectStore('categories', { keyPath: 'name' });
                    // Usamos 'name' como clave única para evitar duplicados
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log("✅ Motor de Base de Datos listo (v3)");
                resolve(this.db);
            };
        });
    }

    async getStore(storeName, mode = 'readonly') {
        const db = await this.init();
        const transaction = db.transaction([storeName], mode);
        return transaction.objectStore(storeName);
    }
}

window.dbEngine = new Database();