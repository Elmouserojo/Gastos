/**
 * Repositorio de Presupuestos (Budgets)
 * Maneja los límites de gasto por categoría.
 */
class BudgetStore {
    constructor(engine) {
        this.engine = engine;
        this.storeName = 'budgets';
    }

    /**
     * Guarda o actualiza un presupuesto para una categoría
     * @param {string} category 
     * @param {number} limit 
     */
    async save(category, limit) {
        const store = await this.engine.getStore(this.storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            // Usamos put: si la categoría existe, la actualiza; si no, la crea.
            const request = store.put({ 
                category: category, 
                limit: Number(limit),
                updatedAt: new Date().toISOString()
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtiene el presupuesto de una categoría específica
     */
    async getByCategory(category) {
        const store = await this.engine.getStore(this.storeName);
        return new Promise((resolve) => {
            const request = store.get(category);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Obtiene todos los presupuestos configurados
     */
    async getAll() {
        const store = await this.engine.getStore(this.storeName);
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Elimina el límite de una categoría
     */
    async delete(category) {
        const store = await this.engine.getStore(this.storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(category);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}

// Lo globalizamos para que sea accesible
window.budgetDb = new BudgetStore(window.dbEngine);