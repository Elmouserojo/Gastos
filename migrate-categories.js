/**
 * Script de migración para actualizar transacciones existentes
 * Este script se ejecuta manualmente desde la consola del navegador
 */

class MigrationHelper {
    /**
     * @param {Database} db - Instancia de la base de datos
     */
    constructor(db) {
        if (!db) {
            throw new Error('Se requiere la instancia de Database');
        }
        
        this.db = db;
        this.migrationLog = [];
        this.isRunning = false;
    }

    /**
     * Ejecutar migración de categorías
     * @param {Object} options - Opciones de migración
     * @returns {Promise<Object>} Resultado de la migración
     */
    async migrateCategories(options = {}) {
        if (this.isRunning) {
            throw new Error('Ya hay una migración en ejecución');
        }

        this.isRunning = true;
        this.migrationLog = [];
        
        const startTime = Date.now();
        
        try {
            console.log('🚀 Iniciando migración de categorías...');
            this._log('INFO', 'Iniciando migración de categorías');
            
            // Verificar que la base de datos esté inicializada
            if (!this.db.isInitialized) {
                await this.db.init();
            }
            
            // Obtener todas las transacciones
            const transactions = await this.db.getAllTransactions();
            this._log('INFO', `Encontradas ${transactions.length} transacciones`);
            
            // Filtrar transacciones que necesitan migración
            const transactionsToMigrate = transactions.filter(t => !t.category || t.category.trim() === '');
            this._log('INFO', `${transactionsToMigrate.length} transacciones necesitan migración`);
            
            if (transactionsToMigrate.length === 0) {
                this._log('INFO', 'No se encontraron transacciones que requieran migración');
                return this._createResult(startTime, 0, 0);
            }
            
            // Obtener categorías disponibles
            const categories = await this.db.getAllCategories();
            this._log('INFO', `Disponibles ${categories.length} categorías`);
            
            // Mapeo de tipos a categorías por defecto
            const defaultCategoryMap = this._createDefaultCategoryMap(categories);
            
            // Migrar transacciones
            let migratedCount = 0;
            let errorCount = 0;
            
            for (const transaction of transactionsToMigrate) {
                try {
                    await this._migrateTransaction(transaction, defaultCategoryMap, options);
                    migratedCount++;
                    
                    if (migratedCount % 10 === 0) {
                        console.log(`⏳ Migradas ${migratedCount}/${transactionsToMigrate.length} transacciones...`);
                    }
                    
                } catch (error) {
                    errorCount++;
                    this._log('ERROR', `Error migrando transacción ${transaction.id}: ${error.message}`);
                    console.warn(`⚠️ Error migrando transacción ${transaction.id}:`, error);
                    
                    // Continuar con la siguiente transacción
                    continue;
                }
            }
            
            // Resultado final
            const result = this._createResult(startTime, migratedCount, errorCount);
            
            console.log(`✅ Migración completada: ${migratedCount} actualizadas, ${errorCount} errores`);
            this._log('SUCCESS', `Migración completada: ${migratedCount} actualizadas, ${errorCount} errores`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error en la migración:', error);
            this._log('ERROR', `Error en la migración: ${error.message}`);
            throw error;
            
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Migrar una transacción individual
     * @private
     */
    async _migrateTransaction(transaction, defaultCategoryMap, options) {
        // Determinar categoría por defecto basada en el tipo
        const defaultCategory = this._getDefaultCategoryForType(transaction.type, defaultCategoryMap);
        
        // Preparar actualización
        const updates = {
            category: defaultCategory,
            updatedAt: new Date().toISOString()
        };
        
        // Opcional: agregar metadatos de migración
        if (options.addMigrationMetadata) {
            updates.migrationInfo = {
                migratedAt: new Date().toISOString(),
                originalCategory: transaction.category,
                migrationType: 'category_assignment'
            };
        }
        
        // Actualizar transacción
        await this.db.updateTransaction(transaction.id, updates);
        
        this._log('DEBUG', `Transacción ${transaction.id} migrada a categoría: ${defaultCategory}`);
    }

    /**
     * Crear mapeo de categorías por defecto
     * @private
     */
    _createDefaultCategoryMap(categories) {
        const map = {
            income: 'otros',
            expense: 'otros'
        };
        
        // Buscar categorías por defecto específicas por tipo
        const incomeCategories = categories.filter(c => c.type === 'income' || c.type === 'both');
        const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');
        
        // Preferir categorías comunes
        const preferredIncome = ['salario', 'ingresos', 'ventas'];
        const preferredExpense = ['gastos', 'compras', 'servicios'];
        
        // Encontrar categoría preferida para ingresos
        for (const preferred of preferredIncome) {
            const category = incomeCategories.find(c => c.id === preferred || c.name.toLowerCase().includes(preferred));
            if (category) {
                map.income = category.id;
                break;
            }
        }
        
        // Encontrar categoría preferida para gastos
        for (const preferred of preferredExpense) {
            const category = expenseCategories.find(c => c.id === preferred || c.name.toLowerCase().includes(preferred));
            if (category) {
                map.expense = category.id;
                break;
            }
        }
        
        this._log('DEBUG', `Mapa de categorías: ingresos -> ${map.income}, gastos -> ${map.expense}`);
        return map;
    }

    /**
     * Obtener categoría por defecto para un tipo
     * @private
     */
    _getDefaultCategoryForType(type, categoryMap) {
        if (type === 'income') {
            return categoryMap.income;
        } else if (type === 'expense') {
            return categoryMap.expense;
        }
        
        return categoryMap.income; // Fallback
    }

    /**
     * Crear objeto de resultado
     * @private
     */
    _createResult(startTime, migratedCount, errorCount) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
            success: errorCount === 0,
            migratedCount,
            errorCount,
            totalCount: migratedCount + errorCount,
            durationMs: duration,
            durationFormatted: this._formatDuration(duration),
            log: [...this.migrationLog],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Formatear duración
     * @private
     */
    _formatDuration(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(2)}s`;
        } else {
            const minutes = Math.floor(ms / 60000);
            const seconds = ((ms % 60000) / 1000).toFixed(2);
            return `${minutes}m ${seconds}s`;
        }
    }

    /**
     * Registrar mensaje de migración
     * @private
     */
    _log(level, message) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message
        };
        
        this.migrationLog.push(entry);
        
        // También log a consola con formato
        const prefix = {
            INFO: 'ℹ️',
            DEBUG: '🔍',
            WARN: '⚠️',
            ERROR: '❌',
            SUCCESS: '✅'
        }[level] || '📝';
        
        console.log(`${prefix} [${new Date().toLocaleTimeString()}] ${message}`);
    }

    /**
     * Obtener historial de migraciones
     * @returns {Array} Historial de migraciones
     */
    getMigrationHistory() {
        return [...this.migrationLog];
    }

    /**
     * Limpiar historial de migraciones
     */
    clearMigrationHistory() {
        this.migrationLog = [];
    }

    /**
     * Verificar si hay migraciones pendientes
     * @returns {Promise<boolean>}
     */
    async hasPendingMigrations() {
        try {
            if (!this.db.isInitialized) {
                await this.db.init();
            }
            
            const transactions = await this.db.getAllTransactions();
            const needsMigration = transactions.some(t => !t.category || t.category.trim() === '');
            
            return needsMigration;
            
        } catch (error) {
            console.error('❌ Error verificando migraciones pendientes:', error);
            return false;
        }
    }

    /**
     * Obtener estadísticas de migración
     * @returns {Promise<Object>}
     */
    async getMigrationStats() {
        try {
            if (!this.db.isInitialized) {
                await this.db.init();
            }
            
            const transactions = await this.db.getAllTransactions();
            const totalTransactions = transactions.length;
            
            const transactionsWithoutCategory = transactions.filter(t => !t.category || t.category.trim() === '');
            const transactionsWithCategory = totalTransactions - transactionsWithoutCategory.length;
            
            return {
                totalTransactions,
                transactionsWithCategory,
                transactionsWithoutCategory: transactionsWithoutCategory.length,
                percentageWithCategory: totalTransactions > 0 ? 
                    (transactionsWithCategory / totalTransactions * 100).toFixed(2) : 0,
                needsMigration: transactionsWithoutCategory.length > 0
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            throw error;
        }
    }
}

// ========== FUNCIÓN DE MIGRACIÓN MANUAL ==========

/**
 * Función de migración para ejecutar desde consola
 * @param {Object} options - Opciones de migración
 * @returns {Promise<Object>} Resultado de la migración
 */
async function migrateCategories(options = {}) {
    console.log('='.repeat(60));
    console.log('🚀 EJECUTANDO MIGRACIÓN DE CATEGORÍAS');
    console.log('='.repeat(60));
    
    try {
        // Verificar que la base de datos esté disponible
        if (typeof db === 'undefined') {
            throw new Error(
                'La base de datos (db) no está disponible.\n' +
                'Asegúrate de que la aplicación esté cargada y que hayas ejecutado:\n' +
                '1. Abrir la aplicación en el navegador\n' +
                '2. Abrir las herramientas de desarrollo (F12)\n' +
                '3. Ir a la pestaña "Console"\n' +
                '4. Ejecutar este script'
            );
        }
        
        // Crear helper de migración
        const migrationHelper = new MigrationHelper(db);
        
        // Verificar si hay migraciones pendientes
        const stats = await migrationHelper.getMigrationStats();
        console.log('📊 Estadísticas antes de la migración:');
        console.log(`   • Total de transacciones: ${stats.totalTransactions}`);
        console.log(`   • Con categoría: ${stats.transactionsWithCategory}`);
        console.log(`   • Sin categoría: ${stats.transactionsWithoutCategory}`);
        console.log(`   • Porcentaje con categoría: ${stats.percentageWithCategory}%`);
        
        if (!stats.needsMigration) {
            console.log('✅ Todas las transacciones ya tienen categoría asignada.');
            console.log('💡 No es necesaria la migración.');
            return { success: true, skipped: true, stats };
        }
        
        // Confirmar con el usuario (solo en consola)
        if (!options.skipConfirmation) {
            const shouldContinue = confirm(
                `Se migrarán ${stats.transactionsWithoutCategory} transacciones sin categoría.\n\n` +
                '¿Continuar con la migración?\n\n' +
                'Nota: Esta acción no se puede deshacer fácilmente.\n' +
                'Se recomienda hacer un backup antes de continuar.'
            );
            
            if (!shouldContinue) {
                console.log('❌ Migración cancelada por el usuario.');
                return { success: false, cancelled: true };
            }
        }
        
        console.log('\n🔄 Iniciando migración...');
        
        // Ejecutar migración
        const result = await migrationHelper.migrateCategories(options);
        
        // Mostrar resultados
        console.log('\n' + '='.repeat(60));
        console.log('📋 RESULTADOS DE LA MIGRACIÓN');
        console.log('='.repeat(60));
        
        console.log(`✅ Transacciones migradas: ${result.migratedCount}`);
        console.log(`❌ Errores: ${result.errorCount}`);
        console.log(`⏱️  Duración: ${result.durationFormatted}`);
        console.log(`📅 Fecha: ${new Date(result.timestamp).toLocaleString()}`);
        
        if (result.success) {
            console.log('\n🎉 ¡Migración completada con éxito!');
            
            // Mostrar sugerencia para recargar
            console.log('\n💡 Sugerencia: Recarga la página para ver los cambios.');
            console.log('   Ejecuta: location.reload()');
            
        } else {
            console.log('\n⚠️  Migración completada con errores.');
            console.log('   Revisa la consola para más detalles.');
        }
        
        // Opción para recargar automáticamente
        if (result.success && options.autoReload !== false) {
            console.log('\n🔄 Recargando aplicación en 3 segundos...');
            
            setTimeout(() => {
                console.log('🔁 Recargando...');
                window.location.reload();
            }, 3000);
        }
        
        return result;
        
    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO EN LA MIGRACIÓN:');
        console.error(error);
        
        // Mostrar ayuda para errores comunes
        if (error.message.includes('db is not defined')) {
            console.error('\n💡 SOLUCIÓN:');
            console.error('1. Asegúrate de estar en la página de la aplicación');
            console.error('2. Espera a que la aplicación se cargue completamente');
            console.error('3. Intenta ejecutar el script de nuevo');
        }
        
        throw error;
    }
}

// ========== FUNCIONES DE UTILIDAD PARA CONSOLA ==========

/**
 * Verificar estado de migración sin ejecutarla
 */
async function checkMigrationStatus() {
    console.log('🔍 Verificando estado de migración...');
    
    try {
        if (typeof db === 'undefined') {
            console.error('❌ La base de datos no está disponible.');
            return null;
        }
        
        const migrationHelper = new MigrationHelper(db);
        const stats = await migrationHelper.getMigrationStats();
        
        console.log('\n📊 ESTADO DE MIGRACIÓN:');
        console.log('='.repeat(40));
        console.log(`Total de transacciones: ${stats.totalTransactions}`);
        console.log(`Con categoría: ${stats.transactionsWithCategory}`);
        console.log(`Sin categoría: ${stats.transactionsWithoutCategory}`);
        console.log(`Porcentaje con categoría: ${stats.percentageWithCategory}%`);
        
        if (stats.needsMigration) {
            console.log('\n⚠️  NECESITA MIGRACIÓN');
            console.log(`   Hay ${stats.transactionsWithoutCategory} transacciones sin categoría.`);
            console.log('\n💡 Para migrar, ejecuta: migrateCategories()');
        } else {
            console.log('\n✅ TODO EN ORDEN');
            console.log('   Todas las transacciones tienen categoría asignada.');
        }
        
        return stats;
        
    } catch (error) {
        console.error('❌ Error verificando estado:', error);
        return null;
    }
}

/**
 * Crear backup antes de migrar
 */
async function createBackupBeforeMigration() {
    console.log('💾 Creando backup antes de la migración...');
    
    try {
        if (typeof backupSystem === 'undefined') {
            console.warn('⚠️  Sistema de backup no disponible.');
            console.log('💡 Creando backup manual...');
            
            if (typeof db === 'undefined') {
                throw new Error('Base de datos no disponible');
            }
            
            // Crear backup manual
            const data = await db.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const dateStr = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `backup-pre-migration-${dateStr}.json`;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            console.log('✅ Backup manual creado y descargado.');
            
        } else {
            // Usar sistema de backup
            await backupSystem.createBackup('manual', 'Backup-Pre-Migracion');
            console.log('✅ Backup creado con el sistema automático.');
        }
        
        console.log('💡 Guarda este archivo en un lugar seguro antes de continuar.');
        
    } catch (error) {
        console.error('❌ Error creando backup:', error);
        console.warn('⚠️  Continuar sin backup puede ser riesgoso.');
        
        const shouldContinue = confirm(
            'No se pudo crear el backup.\n\n' +
            '¿Deseas continuar con la migración sin backup?\n\n' +
            'Esto es RISGOSO. Se recomienda cancelar y solucionar el problema primero.'
        );
        
        if (!shouldContinue) {
            throw new Error('Migración cancelada por falta de backup');
        }
    }
}

/**
 * Restaurar desde backup (en caso de problemas)
 */
async function restoreFromBackup() {
    console.log('🔄 Función de restauración desde backup');
    console.log('💡 Esta función requiere interacción manual.');
    
    if (typeof backupSystem === 'undefined') {
        console.error('❌ Sistema de backup no disponible.');
        console.log('\n💡 Para restaurar manualmente:');
        console.log('1. Exporta los datos actuales primero (por seguridad)');
        console.log('2. Ve a la sección "Backup" de la aplicación');
        console.log('3. Usa la función de importación');
        return;
    }
    
    try {
        const backups = await backupSystem.getAllBackups();
        
        if (backups.length === 0) {
            console.log('ℹ️  No hay backups disponibles.');
            return;
        }
        
        console.log('\n📦 Backups disponibles:');
        backups.forEach((backup, index) => {
            const date = new Date(backup.date);
            console.log(`${index + 1}. ${backup.name} (${date.toLocaleString()}) - ${backup.transactionCount} transacciones`);
        });
        
        console.log('\n💡 Para restaurar:');
        console.log('1. Ve a la sección "Backup" de la aplicación');
        console.log('2. Busca el backup que quieres restaurar');
        console.log('3. Haz clic en "Restaurar"');
        
    } catch (error) {
        console.error('❌ Error obteniendo backups:', error);
    }
}

// ========== EXPORTAR FUNCIONES PARA CONSOLA ==========

// Hacer las funciones disponibles en el ámbito global para ejecutar desde consola
if (typeof window !== 'undefined') {
    window.migrateCategories = migrateCategories;
    window.checkMigrationStatus = checkMigrationStatus;
    window.createBackupBeforeMigration = createBackupBeforeMigration;
    window.restoreFromBackup = restoreFromBackup;
    
    // Mensaje de ayuda automático
    console.log('📦 Script de migración cargado.');
    console.log('💡 Comandos disponibles:');
    console.log('   • migrateCategories() - Ejecutar migración');
    console.log('   • checkMigrationStatus() - Verificar estado');
    console.log('   • createBackupBeforeMigration() - Crear backup');
    console.log('   • restoreFromBackup() - Restaurar desde backup');
    console.log('\n🔧 Para migrar, ejecuta: migrateCategories()');
}

// Exportar para módulos (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MigrationHelper,
        migrateCategories,
        checkMigrationStatus,
        createBackupBeforeMigration,
        restoreFromBackup
    };
}