/**
 * Módulo de base de datos usando IndexedDB
 * Para principiantes: IndexedDB es como una base de datos dentro del navegador
 */

class Database {
    constructor() {
        this.dbName = 'TallerFinanzasDB';
        this.dbVersion = 2; // versión actualizada para soportar categorías
        this.db = null;
        this.storeName = 'transactions';
        this.categoriesStore = 'categories';
    }

    // Inicializar la base de datos
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Error al abrir la BD:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Base de datos inicializada (v' + this.dbVersion + ')');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log('Actualizando base de datos a versión', this.dbVersion);
                const db = event.target.result;
                
                // 1. Crear almacén de transacciones (si no existe)
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    
                    // Crear índices para búsquedas rápidas
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('amount', 'amount', { unique: false });
                    store.createIndex('category', 'category', { unique: false });
                    
                    console.log('Almacén de transacciones creado');
                } else {
                    // Si ya existe, agregar índice de categoría si falta
                    const tx = event.currentTarget.transaction;
                    const store = tx.objectStore(this.storeName);
                    if (!store.indexNames.contains('category')) {
                        store.createIndex('category', 'category', { unique: false });
                        console.log('Índice de categoría agregado a transacciones');
                    }
                }
                
                // 2. Crear almacén de categorías
                if (!db.objectStoreNames.contains(this.categoriesStore)) {
                    const catStore = db.createObjectStore(this.categoriesStore, {
                        keyPath: 'id'
                    });
                    
                    // Crear índices
                    catStore.createIndex('type', 'type', { unique: false });
                    catStore.createIndex('name', 'name', { unique: true });
                    
                    console.log('Almacén de categorías creado');
                }
            };
        });
    }

    // Generar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // CRUD: Create - Crear transacción
    async addTransaction(transaction) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            
            // Agregar ID y timestamp si no existe
            if (!transaction.id) {
                transaction.id = this.generateId();
            }
            if (!transaction.createdAt) {
                transaction.createdAt = new Date().toISOString();
            }
            
            const request = store.add(transaction);

            request.onsuccess = () => {
                resolve(transaction.id);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // CRUD: Read - Obtener todas las transacciones
    async getAllTransactions() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const transactions = event.target.result;
                // Ordenar por fecha (más recientes primero)
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(transactions);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // CRUD: Read - Obtener transacción por ID
    async getTransaction(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // CRUD: Update - Actualizar transacción
    async updateTransaction(id, updates) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            
            // Primero obtener, luego actualizar
            const getRequest = store.get(id);

            getRequest.onsuccess = (event) => {
                const transaction = event.target.result;
                if (!transaction) {
                    reject(new Error('Transacción no encontrada'));
                    return;
                }

                // Actualizar campos
                const updatedTransaction = {
                    ...transaction,
                    ...updates,
                    updatedAt: new Date().toISOString()
                };

                const putRequest = store.put(updatedTransaction);

                putRequest.onsuccess = () => {
                    resolve(updatedTransaction);
                };

                putRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            };

            getRequest.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // CRUD: Delete - Eliminar transacción
    async deleteTransaction(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Obtener transacciones por fecha
    async getTransactionsByDateRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const index = store.index('date');
            
            // Crear rango de fechas
            const range = IDBKeyRange.bound(startDate, endDate);
            const request = index.getAll(range);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Obtener transacciones por tipo
    async getTransactionsByType(type) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const index = store.index('type');
            const request = index.getAll(type);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Obtener estadísticas
    async getStats() {
        const transactions = await this.getAllTransactions();
        
        const stats = {
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            count: transactions.length
        };

        transactions.forEach(transaction => {
            if (transaction.type === 'income') {
                stats.totalIncome += parseFloat(transaction.amount);
            } else {
                stats.totalExpense += parseFloat(transaction.amount);
            }
        });

        stats.balance = stats.totalIncome - stats.totalExpense;
        
        return stats;
    }

    // Buscar transacciones por texto
    async searchTransactions(searchText) {
        const transactions = await this.getAllTransactions();
        
        return transactions.filter(transaction => {
            const searchLower = searchText.toLowerCase();
            return (
                transaction.name.toLowerCase().includes(searchLower) ||
                (transaction.description && 
                 transaction.description.toLowerCase().includes(searchLower))
            );
        });
    }

    // Exportar datos (backup)
    async exportData() {
        const transactions = await this.getAllTransactions();
        return {
            exportedAt: new Date().toISOString(),
            count: transactions.length,
            transactions: transactions
        };
    }

    // Importar datos (restore)
    async importData(data) {
        if (!data.transactions || !Array.isArray(data.transactions)) {
            throw new Error('Formato de datos inválido');
        }

        // Limpiar base de datos existente
        await this.clearAll();

        // Agregar cada transacción
        for (const transaction of data.transactions) {
            await this.addTransaction(transaction);
        }

        return data.transactions.length;
    }

    // Limpiar todas las transacciones
    async clearAll() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // ================= CATEGORÍAS (ADICIONALES) =================

    // Inicializar categorías por defecto (si no existen)
    async initDefaultCategories() {
        try {
            const existing = await this.getAllCategories();
            if (existing.length === 0) {
                console.log('Agregando categorías por defecto...');
                const defaultCategories = [
                    { id: 'ventas', name: 'Ventas', color: '#4CAF50', icon: 'store', type: 'income', createdAt: new Date().toISOString() },
                    { id: 'servicios', name: 'Servicios', color: '#2196F3', icon: 'build', type: 'income', createdAt: new Date().toISOString() },
                    { id: 'reparaciones', name: 'Reparaciones', color: '#00BCD4', icon: 'handyman', type: 'income', createdAt: new Date().toISOString() },
                    { id: 'repuestos', name: 'Repuestos', color: '#FF9800', icon: 'settings', type: 'expense', createdAt: new Date().toISOString() },
                    { id: 'materiales', name: 'Materiales', color: '#9C27B0', icon: 'inventory_2', type: 'expense', createdAt: new Date().toISOString() },
                    { id: 'herramientas', name: 'Herramientas', color: '#795548', icon: 'construction', type: 'expense', createdAt: new Date().toISOString() },
                    { id: 'alquiler', name: 'Alquiler', color: '#607D8B', icon: 'house', type: 'expense', createdAt: new Date().toISOString() },
                    { id: 'servicios-publicos', name: 'Servicios Públicos', color: '#3F51B5', icon: 'flash_on', type: 'expense', createdAt: new Date().toISOString() },
                    { id: 'nomina', name: 'Nómina', color: '#F44336', icon: 'groups', type: 'expense', createdAt: new Date().toISOString() },
                    { id: 'otros', name: 'Otros', color: '#9E9E9E', icon: 'category', type: 'both', createdAt: new Date().toISOString() }
                ];

                for (const cat of defaultCategories) {
                    try {
                        await this.addCategory(cat);
                    } catch (e) {
                        console.warn('Error al insertar categoría por defecto', cat.id, e);
                    }
                }

                console.log('Categorías por defecto añadidas');
            }
        } catch (err) {
            console.error('Error inicializando categorías por defecto', err);
        }
    }

    async addCategory(category) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Base de datos no inicializada'));

            if (!category.id) category.id = this.generateId();
            if (!category.createdAt) category.createdAt = new Date().toISOString();

            const tx = this.db.transaction([this.categoriesStore], 'readwrite');
            const store = tx.objectStore(this.categoriesStore);
            const req = store.add(category);

            req.onsuccess = () => resolve(category.id);
            req.onerror = (e) => {
                // Si existe, intentar actualizar
                if (e.target && e.target.error && e.target.error.name === 'ConstraintError') {
                    this.updateCategory(category.id, category).then(resolve).catch(reject);
                } else {
                    reject(e.target ? e.target.error : e);
                }
            };
        });
    }

    async getAllCategories() {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Base de datos no inicializada'));
            const tx = this.db.transaction([this.categoriesStore], 'readonly');
            const store = tx.objectStore(this.categoriesStore);
            const req = store.getAll();
            req.onsuccess = (e) => resolve(e.target.result || []);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async getCategoriesByType(type) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Base de datos no inicializada'));
            const tx = this.db.transaction([this.categoriesStore], 'readonly');
            const store = tx.objectStore(this.categoriesStore);
            try {
                const idx = store.index('type');
                const range = type === 'both' ? undefined : IDBKeyRange.only(type);
                const req = idx.getAll(range);
                req.onsuccess = (e) => {
                    const cats = e.target.result || [];
                    cats.sort((a,b) => a.name.localeCompare(b.name));
                    resolve(cats);
                };
                req.onerror = (e) => reject(e.target.error);
            } catch (err) {
                // Si no hay índice, devolver todo
                this.getAllCategories().then(resolve).catch(reject);
            }
        });
    }

    async getCategory(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Base de datos no inicializada'));
            const tx = this.db.transaction([this.categoriesStore], 'readonly');
            const store = tx.objectStore(this.categoriesStore);
            const req = store.get(id);
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async updateCategory(id, updates) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Base de datos no inicializada'));
            const tx = this.db.transaction([this.categoriesStore], 'readwrite');
            const store = tx.objectStore(this.categoriesStore);
            const getReq = store.get(id);
            getReq.onsuccess = (e) => {
                const category = e.target.result;
                if (!category) return reject(new Error('Categoría no encontrada'));
                const updated = { ...category, ...updates, updatedAt: new Date().toISOString() };
                const putReq = store.put(updated);
                putReq.onsuccess = () => resolve(updated);
                putReq.onerror = (er) => reject(er.target ? er.target.error : er);
            };
            getReq.onerror = (er) => reject(er.target ? er.target.error : er);
        });
    }

    async deleteCategory(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Base de datos no inicializada'));
            // verificar uso
            this.getTransactionsByCategory(id).then(transactions => {
                if (transactions.length > 0) return reject(new Error(`No se puede eliminar: ${transactions.length} transacciones usan esta categoría`));
                const tx = this.db.transaction([this.categoriesStore], 'readwrite');
                const store = tx.objectStore(this.categoriesStore);
                const req = store.delete(id);
                req.onsuccess = () => resolve(true);
                req.onerror = (e) => reject(e.target ? e.target.error : e);
            }).catch(reject);
        });
    }

    async getTransactionsByCategory(categoryId) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Base de datos no inicializada'));
            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            try {
                const idx = store.index('category');
                const req = idx.getAll(categoryId);
                req.onsuccess = (e) => resolve(e.target.result || []);
                req.onerror = (e) => reject(e.target.error);
            } catch (err) {
                // índice no disponible
                resolve([]);
            }
        });
    }

}

// Crear instancia global de la base de datos
const db = new Database();