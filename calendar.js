/**
 * Módulo de Calendario Interactivo Pro
 * Gestiona la cuadrícula, indicadores y el panel de acciones diarias.
 */
class Calendar {
    constructor() {
        this.db = window.db;
        this.currentDate = new Date(); // Mes en vista
        this.selectedDate = new Date(); // Día enfocado
        
        this.monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
    }

    async init() {
        await this.render();
    }

    /**
     * Vuelve al mes y día actual
     */
    async goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        await this.render();
    }

    async changeMonth(value) {
        this.currentDate.setMonth(this.currentDate.getMonth() + value);
        await this.render();
    }

    async render() {
        const container = document.getElementById('calendar-container');
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const transactions = await this.db.getAllTransactions();
        const monthData = this._groupTransactionsByDay(transactions, year, month);

        container.innerHTML = `
            <div class="calendar-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <button onclick="calendar.changeMonth(-1)" class="nav-btn-circle"><i class="material-icons">chevron_left</i></button>
                    <h3 style="text-transform: capitalize; min-width: 120px; text-align: center; font-size: 16px;">${this.monthNames[month]} ${year}</h3>
                    <button onclick="calendar.changeMonth(1)" class="nav-btn-circle"><i class="material-icons">chevron_right</i></button>
                </div>
                <button onclick="calendar.goToToday()" class="btn-today">HOY</button>
            </div>
            <div class="calendar-grid">
                ${['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => `<div class="day-header">${d}</div>`).join('')}
                ${this._generateDays(year, month, monthData)}
            </div>
        `;

        this._renderDayDetail(transactions);
    }

    _generateDays(year, month, monthData) {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let html = '';

        for (let i = 0; i < firstDay; i++) html += `<div class="day-cell empty"></div>`;

        for (let day = 1; day <= daysInMonth; day++) {
            const dayTxs = monthData[day] || [];
            const hasIncome = dayTxs.some(t => t.type === 'ingreso');
            const hasExpense = dayTxs.some(t => t.type === 'egreso');
            
            const isSelected = this.selectedDate.getDate() === day && 
                               this.selectedDate.getMonth() === month && 
                               this.selectedDate.getFullYear() === year;

            const isToday = new Date().getDate() === day && 
                            new Date().getMonth() === month && 
                            new Date().getFullYear() === year;

            html += `
                <div class="day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" onclick="calendar.selectDay(${day})">
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

    async selectDay(day) {
        this.selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
        await this.render();
    }

    /**
     * RENDER DEL PANEL INFERIOR (Detalle y Acciones)
     */
    async _renderDayDetail(allTransactions) {
        const detailContainer = document.getElementById('day-detail');
        if (!detailContainer) return;

        const dayTxs = allTransactions.filter(t => {
            const d = new Date(t.date);
            return d.getDate() === this.selectedDate.getDate() &&
                   d.getMonth() === this.selectedDate.getMonth() &&
                   d.getFullYear() === this.selectedDate.getFullYear();
        });

        const dateLabel = this.selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

        let html = `
            <div class="detail-header" style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding: 10px 0; border-top: 1px solid var(--border-color);">
                <h3 style="font-size: 14px; text-transform: capitalize;">${dateLabel}</h3>
                <button onclick="ui.prepareTransactionWithDate(new Date('${this.selectedDate.toISOString()}'))" 
                        style="background:var(--primary-color); border:none; border-radius:50%; width:35px; height:35px; color:var(--text-on-primary); cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: var(--shadow);">
                    <i class="material-icons">add</i>
                </button>
            </div>
            <div class="detail-list">
        `;

        if (dayTxs.length === 0) {
            html += `<p style="text-align:center; opacity:0.5; padding: 20px; font-size:13px;">No hay movimientos este día.</p>`;
        } else {
            html += dayTxs.map(t => `
                <div class="transaction-item ${t.type}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 10px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px;">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; font-size:14px;">${t.name}</span>
                        <small style="opacity:0.6; font-size:11px;">${t.category}</small>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <strong style="color: ${t.type === 'ingreso' ? 'var(--income-color)' : 'var(--expense-color)'}">${ui.formatCurrency(t.amount)}</strong>
                        <div style="display:flex; gap:5px;">
                            <button onclick="ui.prepareEdit(${t.id})" style="background:none; border:none; color:var(--primary-color); cursor:pointer;"><i class="material-icons" style="font-size:18px;">edit</i></button>
                            <button onclick="ui.confirmDelete(${t.id})" style="background:none; border:none; color:var(--expense-color); cursor:pointer;"><i class="material-icons" style="font-size:18px;">delete</i></button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        html += `</div>`;
        detailContainer.innerHTML = html;
    }

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

window.calendar = new Calendar();