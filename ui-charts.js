/**
 * Gestor de Gráficos (Chart.js)
 */
class ChartManager {
    constructor() { 
        this.categoryInstance = null; 
        this.evolutionInstance = null;
    }

    updateCategoryChart(txs) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        
        const expenses = txs.filter(t => t.type === 'egreso');
        const dataMap = {};
        expenses.forEach(t => dataMap[t.category] = (dataMap[t.category] || 0) + t.amount);

        if (this.categoryInstance) this.categoryInstance.destroy();
        
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();

        this.categoryInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(dataMap),
                datasets: [{ 
                    data: Object.values(dataMap), 
                    backgroundColor: ['#bb86fc', '#03dac6', '#ff7597', '#ffde03', '#4caf50', '#ff9800'], 
                    borderWidth: 0 
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                }
            }
        });
    }

    updateEvolutionChart(txs) {
        const canvas = document.getElementById('evolutionChart');
        if (!canvas) return;

        const monthsLabels = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthName = date.toLocaleString('es-ES', { month: 'short' });
            monthsLabels.push(monthName);

            const monthData = txs.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
            });

            incomeData.push(monthData.filter(t => t.type === 'ingreso').reduce((a, b) => a + b.amount, 0));
            expenseData.push(monthData.filter(t => t.type === 'egreso').reduce((a, b) => a + b.amount, 0));
        }

        if (this.evolutionInstance) this.evolutionInstance.destroy();
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();

        this.evolutionInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: monthsLabels,
                datasets: [
                    { label: 'Ingresos', data: incomeData, backgroundColor: '#4caf50', borderRadius: 4 },
                    { label: 'Gastos', data: expenseData, backgroundColor: '#f44336', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: textColor }, grid: { display: false } },
                    y: { 
                        ticks: { color: textColor }, 
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        beginAtZero: true 
                    }
                },
                plugins: { legend: { labels: { color: textColor } } }
            }
        });
    }
}

window.charts = new ChartManager();