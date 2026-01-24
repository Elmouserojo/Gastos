/**
 * Sistema de Copia de Seguridad Universal
 * Maneja la exportación e importación de Transacciones, Presupuestos y Categorías.
 */
class BackupSystem {
    constructor(dependencies = {}) {
        this.db = dependencies.db || window.db;
        this.budgetDb = window.budgetDb;     // Nuevo: Acceso a presupuestos
        this.categoryDb = window.categoryDb; // Nuevo: Acceso a categorías
    }

    init() {
        console.log('💾 Sistema de Backup Universal listo');
    }

    /**
     * Exporta toda la base de datos a un archivo JSON
     */
    async exportToJSON() {
        try {
            // Recolectamos todos los datos de la aplicación
            const fullData = {
                transactions: await this.db.getAllTransactions(),
                budgets: await this.budgetDb.getAll(),
                categories: await this.categoryDb.getAll(),
                exportDate: new Date().toISOString(),
                version: "2.0"
            };

            // Verificamos si hay algo que exportar
            if (fullData.transactions.length === 0 && fullData.categories.length === 0) {
                this._notify("No hay datos para exportar.", "info");
                return;
            }

            const dataStr = JSON.stringify(fullData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `cuentas_claras_full_${new Date().toISOString().split('T')[0]}.json`;
            
            // Forzamos la descarga
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            this._notify("¡Copia de seguridad creada!", "success");

        } catch (err) {
            console.error("Error al exportar:", err);
            this._notify("Error técnico al exportar", "error");
        }
    }

    /**
     * Importa datos desde un archivo JSON
     */
    async importFromJSON(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm("¿Importar datos? Esto sobreescribirá tus presupuestos y categorías actuales.")) {
                    
                    // 1. Importar Transacciones
                    if (data.transactions) {
                        for (const tx of data.transactions) {
                            delete tx.id; // Evitamos conflictos de IDs autoincrementales
                            await this.db.addTransaction(tx);
                        }
                    }

                    // 2. Importar Presupuestos
                    if (data.budgets) {
                        for (const b of data.budgets) {
                            await this.budgetDb.save(b.category, b.limit);
                        }
                    }

                    // 3. Importar Categorías
                    if (data.categories) {
                        for (const catName of data.categories) {
                            try { await this.categoryDb.add(catName); } catch(e) { /* omitir duplicados */ }
                        }
                    }

                    this._notify("¡Importación exitosa!", "success");
                    
                    // Recarga la app para aplicar cambios
                    setTimeout(() => window.location.reload(), 1500);
                }
            } catch (err) {
                console.error("Error al importar:", err);
                this._notify("Archivo de respaldo no válido", "error");
            }
        };
        reader.readAsText(file);
    }

    /**
     * Helper privado para notificaciones (Corregido para window.notifications)
     */
    _notify(msg, type) {
        if (window.notifications) {
            window.notifications.show(msg, type);
        } else {
            console.log(`[Backup]: ${msg}`);
        }
    }
}