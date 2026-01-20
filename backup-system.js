/**
 * Sistema de Copia de Seguridad - Versión Corregida
 */
class BackupSystem {
    constructor() {
        this.db = window.db;
    }

    /**
     * Función exigida por app.js para el arranque
     */
    init() {
        console.log('💾 Sistema de Backup listo');
    }

    async exportToJSON() {
        try {
            const txs = await window.db.getAllTransactions();
            if (txs.length === 0) {
                alert("No hay datos para exportar.");
                return;
            }
            const dataStr = JSON.stringify(txs, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `cuentas-claras-bak-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error al exportar:", err);
            alert("Error al generar el archivo de respaldo.");
        }
    }

    async importFromJSON(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    for (const tx of data) {
                        await window.db.addTransaction(tx);
                    }
                    alert("¡Importación exitosa! La página se recargará.");
                    window.location.reload();
                } else {
                    throw new Error("Formato inválido");
                }
            } catch (err) {
                alert("Error: El archivo no es un respaldo válido.");
            }
        };
        reader.readAsText(file);
    }

runAutoBackup() {
    // Guarda una copia rápida en el localStorage como último recurso
    this.db.getAllTransactions().then(txs => {
        if (txs.length > 0) {
            localStorage.setItem('last_auto_backup', JSON.stringify(txs));
            console.log('📦 Auto-backup preventivo guardado');
        }
    });
}
}

// Globalización para app.js
window.backup = new BackupSystem();
window.backupSystem = window.backup;