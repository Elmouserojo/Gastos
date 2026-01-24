/**
 * Repositorio de Categorías
 * Maneja la lista dinámica de etiquetas para gastos e ingresos.
 */
class CategoryStore {
    constructor(engine) {
        this.engine = engine;
        this.storeName = 'categories';
        this.defaults = ["Comida", "Local", "Ventas", "Repuestos", "Salud", "Otros"];
    }

    /**
     * Obtiene todas las categorías ordenadas alfabéticamente
     */
    async getAll() {
        const store = await this.engine.getStore(this.storeName);
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result.map(c => c.name);
                // Si no hay categorías, devolvemos las de por defecto
                resolve(results.length > 0 ? results.sort() : this.defaults);
            };
        });
    }

    /**
     * Agrega una nueva categoría
     */
    async add(name) {
        const store = await this.engine.getStore(this.storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add({ 
                name: name.trim(),
                createdAt: new Date().toISOString()
            });
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject("La categoría ya existe");
        });
    }

    /**
     * Elimina una categoría
     */
    async delete(name) {
        const store = await this.engine.getStore(this.storeName, 'readwrite');
        return new Promise((resolve) => {
            const request = store.delete(name);
            request.onsuccess = () => resolve(true);
        });
    }

    /**
     * Semilla inicial: Guarda las categorías por defecto si la DB está limpia
     */
    async seed() {
        const current = await this.getAll();
        // Solo sembramos si realmente no hay nada en la DB
        const store = await this.engine.getStore(this.storeName, 'readwrite');
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
            if (countRequest.result === 0) {
                this.defaults.forEach(cat => this.add(cat));
                console.log("🌱 Categorías iniciales creadas");
            }
        };
    }
}