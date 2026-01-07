/**
 * Módulo de Calendario
 * Maneja la vista y funcionalidad del calendario
 */

class Calendar {
    constructor() {
        this.currentMonth = new Date();
        this.selectedDate = null;
        this.transactionsByDate = {};
    }

    // Inicializar calendario
    async init(month = new Date()) {
        this.currentMonth = month;
        await this.loadTransactionsForMonth();
        this.renderCalendar();
        this.setupEventListeners();
    }

    // Cargar transacciones para el mes actual
    async loadTransactionsForMonth() {
        try {
            // Calcular primer y último día del mes
            const firstDay = new Date(
                this.currentMonth.getFullYear(),
                this.currentMonth.getMonth(),
                1
            );
            
            const lastDay = new Date(
                this.currentMonth.getFullYear(),
                this.currentMonth.getMonth() + 1,
                0
            );
            
            // Formatear fechas para la búsqueda
            const startDate = firstDay.toISOString().split('T')[0];
            const endDate = lastDay.toISOString().split('T')[0];
            
            // Obtener transacciones del rango
            const transactions = await db.getTransactionsByDateRange(startDate, endDate);
            
            // Organizar transacciones por fecha
            this.transactionsByDate = {};
            transactions.forEach(transaction => {
                const date = transaction.date;
                if (!this.transactionsByDate[date]) {
                    this.transactionsByDate[date] = [];
                }
                this.transactionsByDate[date].push(transaction);
            });
        } catch (error) {
            console.error('Error al cargar transacciones para el mes:', error);
            throw error;
        }
    }

    // Renderizar calendario
    renderCalendar() {
        const container = document.getElementById('calendar-container');
        const monthYear = document.getElementById('current-month');
        
        // Actualizar título del mes
        const monthName = this.currentMonth.toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric'
        }).toUpperCase();
        monthYear.textContent = monthName;
        
        // Crear estructura del calendario
        const calendarHTML = this.generateCalendarHTML();
        container.innerHTML = calendarHTML;
        
        // Resaltar día seleccionado
        if (this.selectedDate) {
            const selectedElement = container.querySelector(`[data-date="${this.selectedDate}"]`);
            if (selectedElement) {
                selectedElement.classList.add('selected');
            }
        }
        
        // Mostrar transacciones del día seleccionado
        if (this.selectedDate && this.transactionsByDate[this.selectedDate]) {
            this.showDayTransactions(this.selectedDate);
        }
    }

    // Generar HTML del calendario
    generateCalendarHTML() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Primer día del mes
        const firstDay = new Date(year, month, 1);
        // Último día del mes
        const lastDay = new Date(year, month + 1, 0);
        // Días en el mes
        const daysInMonth = lastDay.getDate();
        // Día de la semana del primer día (0 = Domingo, 1 = Lunes, etc.)
        const firstDayOfWeek = firstDay.getDay();
        
        // Ajustar para que la semana empiece en lunes
        const adjustedFirstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        
        // Nombres de los días de la semana
        const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        
        let html = '<div class="calendar-grid">';
        
        // Encabezados de días de la semana
        html += '<div class="calendar-header">';
        weekdays.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        html += '</div>';
        
        html += '<div class="calendar-days">';
        
        // Días vacíos al inicio
        for (let i = 0; i < adjustedFirstDayOfWeek; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        
        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const hasTransactions = this.transactionsByDate[dateStr];
            const today = new Date().toISOString().split('T')[0];
            const isToday = dateStr === today;
            const isSelected = this.selectedDate === dateStr;
            
            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (isSelected) dayClass += ' selected';
            if (hasTransactions) dayClass += ' has-transactions';
            
            // Calcular total del día
            let dayTotal = 0;
            let hasIncome = false;
            let hasExpense = false;
            
            if (hasTransactions) {
                this.transactionsByDate[dateStr].forEach(transaction => {
                    if (transaction.type === 'income') {
                        dayTotal += parseFloat(transaction.amount);
                        hasIncome = true;
                    } else {
                        dayTotal -= parseFloat(transaction.amount);
                        hasExpense = true;
                    }
                });
            }
            
            html += `<div class="${dayClass}" data-date="${dateStr}">`;
            html += `<div class="day-number">${day}</div>`;
            
            if (hasTransactions) {
                html += `<div class="day-indicator">`;
                if (hasIncome && hasExpense) {
                    html += `<span class="mixed">●</span>`;
                } else if (hasIncome) {
                    html += `<span class="income-indicator">●</span>`;
                } else {
                    html += `<span class="expense-indicator">●</span>`;
                }
                html += `</div>`;
                
                if (dayTotal !== 0) {
                    const indicatorClass = dayTotal > 0 ? 'positive' : 'negative';
                    html += `<div class="day-total ${indicatorClass}">`;
                    html += dayTotal > 0 ? '+' : '';
                    html += ui.formatCurrency(Math.abs(dayTotal));
                    html += '</div>';
                }
            }
            
            html += '</div>';
        }
        
        // Días vacíos al final para completar la cuadrícula
        const totalCells = 42; // 6 semanas * 7 días
        const usedCells = adjustedFirstDayOfWeek + daysInMonth;
        const emptyCells = totalCells - usedCells;
        
        for (let i = 0; i < emptyCells; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        
        html += '</div></div>';
        
        return html;
    }

    // Configurar event listeners del calendario
    setupEventListeners() {
        // Navegación de meses
        document.getElementById('prev-month').addEventListener('click', () => {
            this.changeMonth(-1);
        });
        
        document.getElementById('next-month').addEventListener('click', () => {
            this.changeMonth(1);
        });
        
        // Selección de días
        document.getElementById('calendar-container').addEventListener('click', (e) => {
            const dayElement = e.target.closest('.calendar-day:not(.empty)');
            if (dayElement && dayElement.dataset.date) {
                this.selectDate(dayElement.dataset.date);
            }
        });
    }

    // Cambiar mes
    async changeMonth(delta) {
        this.currentMonth = new Date(
            this.currentMonth.getFullYear(),
            this.currentMonth.getMonth() + delta,
            1
        );
        
        await this.loadTransactionsForMonth();
        this.renderCalendar();
    }

    // Seleccionar fecha
    async selectDate(date) {
        this.selectedDate = date;
        
        // Actualizar clases seleccionadas
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
        
        const selectedElement = document.querySelector(`[data-date="${date}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
        
        // Mostrar transacciones del día
        await this.showDayTransactions(date);
    }

    // Mostrar transacciones del día seleccionado
    async showDayTransactions(date) {
        const title = document.getElementById('selected-date-title');
        const list = document.getElementById('day-transactions-list');
        
        // Formatear fecha para mostrar
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        title.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        
        if (this.transactionsByDate[date]) {
            ui.renderTransactionList(this.transactionsByDate[date], 'day-transactions-list');
        } else {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="material-icons">event</i>
                    <p>No hay transacciones este día</p>
                    <button id="add-for-date" class="btn btn-primary">
                        <i class="material-icons">add</i>
                        Agregar Transacción
                    </button>
                </div>
            `;
            
            // Agregar evento al botón
            document.getElementById('add-for-date').addEventListener('click', () => {
                document.getElementById('date').value = date;
                ui.switchPage('add');
            });
        }
    }

    // Actualizar calendario (para cuando se agregan/eliminan transacciones)
    async refresh() {
        await this.loadTransactionsForMonth();
        this.renderCalendar();
    }
}