/**
 * UI Reports Manager
 * Maneja la lógica detallada del resumen mensual y estadísticas.
 */
class MonthlyReport {
    constructor() {
        this.db = window.db; // TransactionStore
    }

    /**
     * Genera el análisis detallado para el mes y año seleccionados
     * @param {number} year 
     * @param {number} month 
     */
    async generate(year, month) {
        const allTransactions = await this.db.getAllTransactions();

        // Filtrar transacciones por el período seleccionado
        const monthlyTxs = allTransactions.filter(tx => {
            const date = new Date(tx.date);
            return date.getFullYear() === year && (date.getMonth() + 1) === month;
        });

        const totals = monthlyTxs.reduce((acc, tx) => {
            if (tx.type === 'ingreso') acc.income += tx.amount;
            else acc.expense += tx.amount;
            return acc;
        }, { income: 0, expense: 0 });

        this._renderDetailedStats(totals);
        this._renderCategoryBreakdown(monthlyTxs, totals.expense);
    }

    /**
     * Calcula y muestra estadísticas como porcentaje de ahorro
     */
    _renderDetailedStats(totals) {
        const saving = totals.income - totals.expense;
        const savingPerc = totals.income > 0 ? Math.max(0, (saving / totals.income) * 100) : 0;

        // Si decides agregar una barra de ahorro en el futuro, 
        // podrías usar estos valores aquí.
        console.log(`Análisis Mensual: ${savingPerc.toFixed(1)}% de ahorro.`);
    }

    /**
     * Genera la lista de gastos por categoría para el mes
     */
    _renderCategoryBreakdown(txs, totalExpense) {
        const expenseTxs = txs.filter(t => t.type === 'egreso');
        
        // Agrupar por categoría
        const catMap = expenseTxs.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

        // Podríamos usar esto para alimentar listas dinámicas de gastos mensuales
        // en tarjetas específicas de reporte.
    }
}

// Inicializar instancia global
window.monthlyReport = new MonthlyReport();