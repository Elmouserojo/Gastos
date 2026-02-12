/**
 * ui-reports.js
 * Genera el análisis detallado por mes
 */
class MonthlyReport {
    constructor(db) {
        this.db = db;
        this.picker = document.getElementById('report-month-picker');
        this.init();
    }

    init() {
        // Setear el mes actual por defecto en el picker (YYYY-MM)
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        this.picker.value = `${now.getFullYear()}-${month}`;

        this.picker.addEventListener('change', () => this.generate());
        // Escuchar cuando se agrega una transacción para actualizar el reporte si es el mismo mes
        window.addEventListener('transaction-updated', () => this.generate());
    }

    async generate() {
        const [year, month] = this.picker.value.split('-').map(Number);
        const allTransactions = await this.db.getAllTransactions();

        // Filtrar por el mes y año seleccionado
        const monthTxs = allTransactions.filter(tx => {
            const date = new Date(tx.date);
            return date.getFullYear() === year && (date.getMonth() + 1) === month;
        });

        const totals = monthTxs.reduce((acc, tx) => {
            if (tx.type === 'ingreso') acc.income += tx.amount;
            else acc.expense += tx.amount;
            return acc;
        }, { income: 0, expense: 0 });

        this.render(totals, monthTxs);
    }

    render(totals, txs) {
        // 1. Totales
        document.getElementById('report-income').innerText = ui.formatCurrency(totals.income);
        document.getElementById('report-expense').innerText = ui.formatCurrency(totals.expense);

        // 2. Cálculo de Ahorro
        const saving = totals.income - totals.expense;
        const savingPerc = totals.income > 0 ? Math.max(0, (saving / totals.income) * 100) : 0;

        document.getElementById('saving-percentage').innerText = `${savingPerc.toFixed(0)}%`;
        document.getElementById('saving-bar').style.width = `${savingPerc}%`;
        document.getElementById('saving-amount').innerText = `Ahorro neto: ${ui.formatCurrency(saving)}`;

        // 3. Distribución por Categoría (Gastos)
        const catList = document.getElementById('report-category-list');
        const expenseTxs = txs.filter(t => t.type === 'egreso');
        
        const catMap = expenseTxs.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

        // Ordenar categorías de mayor a menor gasto
        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

        catList.innerHTML = sortedCats.map(([name, amount]) => {
            const perc = (amount / totals.expense) * 100;
            return `
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px;">
                        <span>${name}</span>
                        <span>${ui.formatCurrency(amount)} (${perc.toFixed(1)}%)</span>
                    </div>
                    <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; margin-top: 4px;">
                        <div style="width: ${perc}%; height: 100%; background: var(--expense-color); border-radius: 2px; opacity: 0.6;"></div>
                    </div>
                </div>
            `;
        }).join('') || '<p style="font-size: 12px; opacity: 0.5; text-align: center;">Sin gastos este mes</p>';
    }
}

// Inicializar en app.js