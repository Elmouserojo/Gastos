/**
 * Módulo de Calendario Interactivo
 * Gestiona la cuadrícula de días, indicadores de transacciones y selección de fechas.
 */
class Calendar {
    constructor() {
        this.db = window.db;
        this.currentDate = new Date(); // Mes que se está visualizando
        this.selectedDate = new Date(); // Día seleccionado por el usuario
        
        this.monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
    }

    /**
     * Inicializa el calendario
     */
    async init() {
        console.log('📅 Inicializando Calendario...');
        await this.render();
    }

    /**
     * Cambia el mes en vista (atrás o adelante)
     */
    async changeMonth(value) {
        this.currentDate.setMonth(this.currentDate.getMonth() + value);
        await this.render();
    }

    /**
     * Renderiza la estructura completa del calendario
     */
    async render() {
        const container = document.getElementById('calendar-container');
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Obtener transacciones para dibujar los puntos (indicadores)
        const transactions = await this.db.getAllTransactions();
        const monthData = this._groupTransactionsByDay(transactions, year, month);

        container.innerHTML = `
            <div class="calendar-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <button onclick="calendar.changeMonth(-1)" class="nav-btn" style="padding: 10px;">
                    <i class="material-icons">chevron_left</i>
                </button>
                <h3 style="text-transform: capitalize; margin: 0;">${this.monthNames[month]} ${year}</h3>
                <button onclick="calendar.changeMonth(1)" class="nav-btn" style="padding: 10px;">
                    <i class="material-icons">chevron_right</i>
                </button>
            </div>
            <div class="calendar-grid">
                ${['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => `
                    <div class="day-header" style="text-align: center; font-weight: bold; opacity: 0.6; font-size: 12px;">${d}</div>
                `).join('')}
                ${this._generateDays(year, month, monthData)}
            </div>
        `;

        // Al terminar de renderizar, actualizamos el detalle del día seleccionado abajo
        this._updateDayDetail(transactions);
    }

    /**
     * Genera las celdas de los días
     */
    _generateDays(year, month, monthData) {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let html = '';

        // Celdas vacías del mes anterior
        for (let i = 0; i < firstDay; i++) {
            html += `<div class="day-cell empty"></div>`;
        }

        // Celdas de los días del mes actual
        for (let day = 1; day <= daysInMonth; day++) {
            const dayTxs = monthData[day] || [];
            const hasIncome = dayTxs.some(t => t.type === 'ingreso');
            const hasExpense = dayTxs.some(t => t.type === 'egreso');
            
            // Comprobar si es el día seleccionado
            const isSelected = this.selectedDate.getDate() === day && 
                               this.selectedDate.getMonth() === month && 
                               this.selectedDate.getFullYear() === year;

            html += `
                <div class="day-cell ${isSelected ? 'selected' : ''}" onclick="calendar.selectDay(${day})">
                    <span>${day}</span>
                    <div class="indicators">
                        ${hasIncome ? '<div class="dot income"></div>' : ''}
                        ${hasExpense ? '<div class="dot expense"></div>' : ''}
                    </div>
                </div>
            `;
        }
        return html;
    }

    /**
     * Lógica al hacer clic en un día
     */
    async selectDay(day) {
        this.selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
        await this.render(); // Re-render para mostrar el círculo de selección
    }

    /**
     * Envía la información a la UI para mostrar la lista de movimientos debajo
     */
    async _updateDayDetail(allTransactions) {
        const dayTxs = allTransactions.filter(t => {
            const d = new Date(t.date);
            return d.getDate() === this.selectedDate.getDate() &&
                   d.getMonth() === this.selectedDate.getMonth() &&
                   d.getFullYear() === this.selectedDate.getFullYear();
        });

        if (window.ui && window.ui.showDayDetail) {
            window.ui.showDayDetail(this.selectedDate, dayTxs);
        }
    }

    /**
     * Helper para agrupar transacciones por día del mes
     */
    _groupTransactionsByDay(txs, year, month) {
        const grouped = {};
        txs.forEach(t => {
            const date = new Date(t.date);
            if (date.getFullYear() === year && date.getMonth() === month) {
                const day = date.getDate();
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(t);
            }
        });
        return grouped;
    }
}

// Instancia global
window.calendar = new Calendar();