/**
 * Sistema de Copia de Seguridad Universal
 * Maneja la exportación, importación y restauración de Transacciones, Presupuestos y Categorías.
 */
class BackupSystem {
    constructor(dependencies = {}) {
        this.db = dependencies.db || window.db;
        this.budgetDb = window.budgetDb;
        this.categoryDb = window.categoryDb;
    }

    init() {
        console.log('💾 Sistema de Backup Universal listo');
    }

    /**
     * Helper: Configuración visual de SweetAlert2 según el tema
     */
    _getAlertConfig() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            background: isDark ? '#1e1e1e' : '#ffffff',
            color: isDark ? '#ffffff' : '#1a1a1b',
            confirmButtonColor: isDark ? '#bb86fc' : '#6200ee',
            cancelButtonColor: '#e57373',
            reverseButtons: true
        };
    }

    /**
     * Exporta toda la base de datos a un archivo JSON
     */
    async exportToJSON() {
        try {
            const fullData = {
                transactions: await this.db.getAllTransactions(),
                budgets: await this.budgetDb.getAll(),
                categories: await this.categoryDb.getAll(),
                exportDate: new Date().toISOString(),
                version: "2.0"
            };

            if (fullData.transactions.length === 0 && fullData.categories.length === 0) {
                Swal.fire({
                    title: 'Sin datos',
                    text: 'No hay información para exportar.',
                    icon: 'info',
                    ...this._getAlertConfig()
                });
                return;
            }

            const dataStr = JSON.stringify(fullData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `cuentas_claras_full_${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            window.notifications.show("¡Copia de seguridad creada!", "success");

        } catch (err) {
            console.error("Error al exportar:", err);
            Swal.fire('Error', 'No se pudo generar el archivo de exportación', 'error');
        }
    }

    /**
     * IMPORTAR: Añade los datos del archivo a los actuales (Aditivo)
     */
    async importFromJSON(file) {
        if (!file) return;

        const result = await Swal.fire({
            title: '¿Importar datos?',
            text: "Los datos del archivo se sumarán a tus movimientos actuales. Los presupuestos y categorías se actualizarán.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, importar',
            cancelButtonText: 'Cancelar',
            ...this._getAlertConfig()
        });

        if (result.isConfirmed) {
            this._processFile(file, false);
        }
    }

    /**
     * RESTAURAR: Borra todo y carga el archivo (Destructivo)
     */
    async restoreFromJSON(file) {
        if (!file) return;

        const result = await Swal.fire({
            title: '¿Restaurar Backup?',
            text: "¡ATENCIÓN! Se eliminarán TODOS los datos actuales y se reemplazarán por los del archivo. Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'SÍ, BORRAR Y RESTAURAR',
            cancelButtonText: 'Cancelar',
            ...this._getAlertConfig(),
            confirmButtonColor: '#e57373' // Rojo para advertencia crítica
        });

        if (result.isConfirmed) {
            this._processFile(file, true);
        }
    }

    /**
     * Lógica interna de procesamiento de archivos
     */
    _processFile(file, shouldClearFirst) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Mostrar cargando
                Swal.fire({
                    title: 'Procesando...',
                    didOpen: () => Swal.showLoading(),
                    ...this._getAlertConfig()
                });

                if (shouldClearFirst) {
                    // Limpieza total antes de restaurar
                    // Usamos el motor de base de datos para limpiar los almacenes
                    const engine = this.db.engine;
                    await engine.clearStore('transactions');
                    await engine.clearStore('budgets');
                    await engine.clearStore('categories');
                }
                
                // 1. Cargar Transacciones
                if (data.transactions) {
                    for (const tx of data.transactions) {
                        delete tx.id; // Evitar conflictos de ID
                        await this.db.addTransaction(tx);
                    }
                }

                // 2. Cargar Presupuestos
                if (data.budgets) {
                    for (const b of data.budgets) {
                        await this.budgetDb.save(b.category, b.limit);
                    }
                }

                // 3. Cargar Categorías
                if (data.categories) {
                    for (const catName of data.categories) {
                        try { await this.categoryDb.add(catName); } catch(e) {}
                    }
                }

                await Swal.fire({
                    title: '¡Completado!',
                    text: 'Los datos se han cargado correctamente.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    ...this._getAlertConfig()
                });
                
                // Recarga forzosa para refrescar toda la lógica
                window.location.reload();

            } catch (err) {
                console.error("Error al procesar el backup:", err);
                Swal.fire('Error', 'El archivo no es un respaldo válido.', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Globalización
window.backupSystem = new BackupSystem();