/**
 * Repositorio de Transacciones
 * Actúa como interfaz entre el Motor de DB y la lógica de la App.
 */
class TransactionStore {
    constructor(engine) {
        this.engine = engine;
        this.storeName = 'transactions';
    }

    /**
     * Inicialización requerida por app.js
     */
    async init() {
        return await this.engine.init();
    }

    // --- MÉTODOS NATIVOS (Nuevos) ---

    async getAll() {
        const store = await this.engine.getStore(this.storeName);
        const index = store.index('date');
        return new Promise(resolve => {
            const request = index.getAll();
            request.onsuccess = () => resolve(request.result.reverse());
        });
    }

    async add(data) {
        const store = await this.engine.getStore(this.storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(id, data) {
        const store = await this.engine.getStore(this.storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put({ ...data, id: Number(id) });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(id) {
        const store = await this.engine.getStore(this.storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(Number(id));
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // --- ALIAS DE COMPATIBILIDAD (Legacy Support) ---
    // Esto evita que tengamos que modificar ui.js y app.js ahora mismo.

    async getAllTransactions() { return this.getAll(); }
    async addTransaction(data) { return this.add(data); }
    async updateTransaction(id, data) { return this.update(id, data); }
    async deleteTransaction(id) { return this.delete(id); }
}

// Vinculación global
window.db = new TransactionStore(window.dbEngine);