/**
 * Gestión de Base de Datos - IndexedDB
 * Almacena de forma persistente todas las transacciones de la aplicación.
 */

class Database {
    constructor() {
        this.dbName = 'cuentas-claras-db';
        this.dbVersion = 1;
        this.storeName = 'transactions';
        this.db = null;
        this.init();
    }

    /**
     * Inicializa la conexión con IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error("Error abriendo IndexedDB:", event.target.error);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Creamos el almacén con un ID autoincremental
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                    // Creamos un índice por fecha para ordenar los movimientos
                    store.createIndex('date', 'date', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("✅ IndexedDB conectada");
                resolve(this.db);
            };
        });
    }

    /**
     * Obtiene todos los movimientos ordenados por fecha (más recientes primero)
     */
    async getAllTransactions() {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('date');
            const request = index.getAll();

            request.onsuccess = () => {
                // Devolvemos la lista invertida para que lo más nuevo aparezca arriba
                resolve(request.result.reverse());
            };
        });
    }

    /**
     * Guarda un nuevo movimiento
     */
    async addTransaction(data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Actualiza un movimiento existente
     */
    async updateTransaction(id, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            // Aseguramos que el objeto lleve el ID correcto
            const request = store.put({ ...data, id: Number(id) });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Elimina un movimiento por su ID
     */
    async deleteTransaction(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(Number(id));

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}

// Instancia global para que todos los archivos puedan usarla
window.db = new Database();