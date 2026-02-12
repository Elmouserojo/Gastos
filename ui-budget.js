/**
 * UI Budget Manager
 * Maneja la visualización de los límites de gastos y progreso filtrado por mes.
 */
class BudgetManager {
    constructor() {
        this.db = window.db;             // TransactionStore
        this.budgetDb = window.budgetDb; // BudgetStore
    }

    /**
     * Renderiza las barras de presupuesto filtradas por período
     * @param {string} containerId 
     * @param {number} year 
     * @param {number} month (1-12)
     */
    async renderProgress(containerId, year, month) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Si no vienen parámetros, usamos el mes actual como respaldo
        if (!year || !month) {
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth() + 1;
        }

        const budgets = await this.budgetDb.getAll();
        const txs = await this.db.getAllTransactions();
        
        // Filtrar transacciones del mes SELECCIONADO y que sean egresos
        const filteredTxs = txs.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === year && 
                   (d.getMonth() + 1) === month &&
                   t.type === 'egreso';
        });

        if (budgets.length === 0) {
            container.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:12px;">No hay presupuestos configurados.</p>';
            return;
        }

        // Título dinámico para contexto
        let html = '<h3 style="font-size: 14px; margin-bottom: 15px;">Progreso de Presupuestos</h3>';

        budgets.forEach(budget => {
            // Sumar gastos de esta categoría en el mes específico
            const spent = filteredTxs
                .filter(t => t.category === budget.category)
                .reduce((acc, t) => acc + t.amount, 0);
            
            const percent = Math.min((spent / budget.limit) * 100, 100);
            const isOver = spent > budget.limit;

            html += `
                <div class="budget-item" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                        <span>${budget.category}</span>
                        <span style="font-weight: bold; color: ${isOver ? 'var(--expense-color)' : 'inherit'}">
                            ${window.ui.formatCurrency(spent)} / ${window.ui.formatCurrency(budget.limit)}
                        </span>
                    </div>
                    <div class="progress-bar-bg" style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div class="progress-bar-fill" style="width: ${percent}%; height: 100%; background: ${this._getColor(percent)}; transition: width 0.5s ease;"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Retorna el color según el porcentaje de consumo
     */
    _getColor(percent) {
        if (percent < 70) return 'var(--income-color)'; // Verde (Saludable)
        if (percent < 90) return '#ffb74d';             // Naranja (Advertencia)
        return 'var(--expense-color)';                  // Rojo (Crítico/Superado)
    }
}

window.budgetManager = new BudgetManager();