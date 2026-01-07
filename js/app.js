/**
 * Archivo principal - Punto de entrada de la aplicación
 * Coordina todos los módulos
 */

class App {
    constructor() {
        this.ui = ui;
        this.db = db;
        this.calendar = new Calendar();
        this.isOnline = navigator.onLine;
    }

    // Inicializar la aplicación
    async init() {
        console.log('Iniciando aplicación...');
        
        try {
            // 1. Inicializar base de datos
            await this.db.init();
            console.log('Base de datos lista');
            
            // 2. Inicializar interfaz
            await this.ui.init();
            console.log('Interfaz lista');
            
            // 3. Configurar detección de conexión
            this.setupConnectionDetection();
            
            // 4. Verificar si es la primera vez
            await this.checkFirstTime();
            
            console.log('Aplicación iniciada correctamente');
            
        } catch (error) {
            console.error('Error al iniciar la aplicación:', error);
            this.showFatalError();
        }
    }

    // Configurar detección de conexión
    setupConnectionDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.ui.showNotification('Conectado a internet', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.ui.showNotification('Modo offline activado', 'info');
        });
        
        // Mostrar estado inicial
        if (!this.isOnline) {
            this.ui.showNotification('Trabajando en modo offline', 'info');
        }
    }

    // Verificar si es la primera vez que se usa la app
    async checkFirstTime() {
        const transactions = await this.db.getAllTransactions();
        
        if (transactions.length === 0) {
            // Agregar datos de ejemplo para primera vez
            //await this.addSampleData();
            this.ui.showNotification('¡Bienvenido!', 'info');
        }
    }

  
    // Mostrar error fatal
    showFatalError() {
        document.body.innerHTML = `
            <div class="fatal-error">
                <i class="material-icons">error_outline</i>
                <h2>Error Crítico</h2>
                <p>No se pudo iniciar la aplicación. Por favor:</p>
                <ol>
                    <li>Recarga la página</li>
                    <li>Verifica que tienes almacenamiento disponible</li>
                    <li>Intenta en otro navegador</li>
                </ol>
                <button onclick="window.location.reload()" class="btn btn-primary">
                    <i class="material-icons">refresh</i>
                    Reintentar
                </button>
            </div>
        `;
        
        // Agregar estilos básicos
        const style = document.createElement('style');
        style.textContent = `
            .fatal-error {
                padding: 2rem;
                text-align: center;
                max-width: 500px;
                margin: 0 auto;
            }
            .fatal-error i.material-icons {
                font-size: 4rem;
                color: #dc3545;
                margin-bottom: 1rem;
            }
            .fatal-error h2 {
                color: #dc3545;
                margin-bottom: 1rem;
            }
            .fatal-error ol {
                text-align: left;
                margin: 1rem auto;
                max-width: 300px;
            }
        `;
        document.head.appendChild(style);
    }

    // Exportar datos (para backup)
    async exportData() {
        try {
            const data = await this.db.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-taller-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.ui.showNotification('Backup creado exitosamente', 'success');
        } catch (error) {
            console.error('Error al exportar:', error);
            this.ui.showNotification('Error al crear backup', 'error');
        }
    }

    // Importar datos (para restore)
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const count = await this.db.importData(data);
                
                this.ui.showNotification(`${count} transacciones importadas`, 'success');
                
                // Recargar vistas
                await this.ui.loadDashboard();
                await this.ui.loadTransactions();
                
                if (this.ui.currentPage === 'calendar') {
                    await this.calendar.refresh();
                }
            } catch (error) {
                console.error('Error al importar:', error);
                this.ui.showNotification('Error al importar datos', 'error');
            }
        };
        
        reader.readAsText(file);
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    window.app = app; // Hacer disponible globalmente para debugging
    
    await app.init();
    
    // Agregar funcionalidades adicionales al objeto global
    window.exportData = () => app.exportData();
    
    // Crear input para importar
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    importInput.addEventListener('change', (e) => app.importData(e));
    document.body.appendChild(importInput);
    window.importData = () => importInput.click();
});