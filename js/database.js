/**
 * Módulo de base de datos usando IndexedDB
 * Para principiantes: IndexedDB es como una base de datos dentro del navegador
 */

class Database {
    constructor() {
        this.dbName = 'TallerFinanzasDB';
        this.dbVersion = 1;
        this.db = null;
        this.storeName = 'transactions';
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
                console.log('Base de datos inicializada');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear almacén de transacciones si no existe
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    
                    // Crear índices para búsquedas rápidas
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('amount', 'amount', { unique: false });
                    
                    console.log('Almacén de transacciones creado');
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
}

// Crear instancia global de la base de datos
const db = new Database();