/**
 * UI Budget Manager
 * Maneja la visualización de los límites de gastos y progreso.
 */
class BudgetManager {
    constructor() {
        this.db = window.db;        // TransactionStore
        this.budgetDb = window.budgetDb; // BudgetStore
    }

    /**
     * Renderiza las barras de presupuesto en el dashboard
     * @param {string} containerId 
     */
    async renderProgress(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const budgets = await this.budgetDb.getAll();
        const txs = await this.db.getAllTransactions();
        
        // Filtrar transacciones del mes actual y que sean egresos
        const now = new Date();
        const currentMonthTxs = txs.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && 
                   d.getFullYear() === now.getFullYear() &&
                   t.type === 'egreso';
        });

        if (budgets.length === 0) {
            container.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:12px;">No hay presupuestos configurados.</p>';
            return;
        }

        let html = '<h3 style="font-size: 14px; margin-bottom: 15px;">Progreso de Presupuestos</h3>';

        budgets.forEach(budget => {
            // Sumar gastos de esta categoría en el mes
            const spent = currentMonthTxs
                .filter(t => t.category === budget.category)
                .reduce((acc, t) => acc + t.amount, 0);
            
            const percent = Math.min((spent / budget.limit) * 100, 100);
            const colorClass = this._getColorClass(percent);
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

    _getColor(percent) {
        if (percent < 70) return 'var(--income-color)'; // Verde
        if (percent < 90) return '#ffb74d';             // Naranja
        return 'var(--expense-color)';                 // Rojo
    }

    _getColorClass(percent) {
        if (percent < 70) return 'safe';
        if (percent < 90) return 'warning';
        return 'danger';
    }
}

window.budgetManager = new BudgetManager();