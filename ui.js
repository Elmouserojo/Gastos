/**
 * UI Manager - Versión con CRUD Completo
 * Maneja la visualización, edición, eliminación y navegación.
 */

const CONFIG = {
    CURRENCY_FORMAT: { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 },
    CHART_COLORS: ['#bb86fc', '#03dac6', '#ff7597', '#ffde03', '#4caf50', '#ff9800']
};

class StateManager {
    constructor() {
        this.state = {
            currentPage: 'dashboard',
            selectedDate: null,
            editingId: null // Almacena el ID cuando estamos editando
        };
    }
    update(newState) { this.state = { ...this.state, ...newState }; }
    getState() { return { ...this.state }; }
}

class NotificationManager {
    constructor() { this.el = document.getElementById('notification'); }
    show(message, type = 'info') {
        if (!this.el) return;
        this.el.textContent = message;
        this.el.className = `notification active ${type}`;
        setTimeout(() => this.el.classList.remove('active'), 3000);
    }
}

class ChartManager {
    constructor() { this.instance = null; }
    updateChart(txs) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        const expenses = txs.filter(t => t.type === 'egreso');
        const dataMap = {};
        expenses.forEach(t => dataMap[t.category] = (dataMap[t.category] || 0) + t.amount);

        if (this.instance) this.instance.destroy();
        this.instance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(dataMap),
                datasets: [{ data: Object.values(dataMap), backgroundColor: CONFIG.CHART_COLORS, borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

class UI {
    constructor() {
        this.stateManager = new StateManager();
        this.notificationManager = new NotificationManager();
        this.chartManager = new ChartManager();
        this.db = window.db;
        this.pages = document.querySelectorAll('.page');
        this.navLinks = document.querySelectorAll('.nav-btn');
    }

    async init() {
        this._setupTheme();
        this._setupNavigation();
        this._setupForm();
        await this.loadDashboard();
    }

    _setupTheme() {
        const toggle = document.getElementById('theme-toggle');
        const apply = (t) => {
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem('app-theme', t);
        };
        apply(localStorage.getItem('app-theme') || 'dark');
        if (toggle) toggle.onclick = () => {
            const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            apply(next);
            this.loadDashboard();
        };
    }

    _setupNavigation() {
        this.navLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                // Si cambiamos de página, cancelamos cualquier edición pendiente
                if (this.stateManager.getState().editingId) this._cancelEdit();
                this.switchPage(link.getAttribute('data-page'));
            };
        });
    }

    switchPage(pageId) {
    this.pages.forEach(p => p.classList.toggle('active', p.id === pageId));
    this.navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('data-page') === pageId));
    
    // AGREGAMOS ESTO: Pone o saca la clase 'calendar-mode' al body
    document.body.classList.toggle('calendar-mode', pageId === 'calendar');

    if (pageId === 'dashboard') this.loadDashboard();
    if (pageId === 'calendar' && window.calendar) window.calendar.init();
}

    async loadDashboard() {
        const txs = await this.db.getAllTransactions();
        const inc = txs.filter(t => t.type === 'ingreso').reduce((a, b) => a + b.amount, 0);
        const exp = txs.filter(t => t.type === 'egreso').reduce((a, b) => a + b.amount, 0);
        
        this._setText('total-balance', this.formatCurrency(inc - exp));
        this._setText('total-income', this.formatCurrency(inc));
        this._setText('total-expense', this.formatCurrency(exp));
        
        this.chartManager.updateChart(txs);
        this._renderTransactionList('recent-list', txs.slice(0, 5));
    }

    /**
     * Renderiza listas de transacciones con botones de acción
     */
    _renderTransactionList(containerId, txs) {
        const list = document.getElementById(containerId);
        if (!list) return;

        list.innerHTML = txs.map(t => `
            <div class="transaction-item ${t.type}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; flex-direction: column;">
                    <span>${t.name}</span>
                    <small style="opacity: 0.6; font-size: 10px;">${new Date(t.date).toLocaleDateString()}</small>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <strong>${this.formatCurrency(t.amount)}</strong>
                    <div class="transaction-actions" style="display: flex; gap: 5px;">
                        <button onclick="ui.prepareEdit(${t.id})" style="background:none; border:none; color:var(--primary-color); cursor:pointer;">
                            <i class="material-icons" style="font-size: 18px;">edit</i>
                        </button>
                        <button onclick="ui.confirmDelete(${t.id})" style="background:none; border:none; color:var(--expense-color); cursor:pointer;">
                            <i class="material-icons" style="font-size: 18px;">delete</i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('') || '<p style="text-align:center; opacity:0.5; padding: 20px;">Sin movimientos</p>';
    }

    // --- Funciones de Calendario ---

    showDayDetail(date, transactions) {
        const container = document.getElementById('day-detail');
        if (!container) return;

        container.innerHTML = `
            <div class="card" style="margin-top: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="font-size: 16px;">${date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</h3>
                    <button class="btn-primary" style="width:auto; padding: 6px 12px; font-size:12px;" onclick="ui.prepareAddForDate('${date.toISOString()}')">
                        <i class="material-icons" style="font-size:14px; vertical-align:middle;">add</i> Añadir
                    </button>
                </div>
                <div id="day-tx-list"></div>
            </div>
        `;
        this._renderTransactionList('day-tx-list', transactions);
    }

    prepareAddForDate(dateISO) {
        this.stateManager.update({ selectedDate: dateISO, editingId: null });
        this.switchPage('transactions');
        this._resetFormUI("Nuevo Movimiento", "Guardar Movimiento");
    }

    // --- Lógica de Edición y Eliminación ---

    async prepareEdit(id) {
        const txs = await this.db.getAllTransactions();
        const tx = txs.find(t => t.id === id);
        if (!tx) return;

        this.stateManager.update({ editingId: id, selectedDate: tx.date });
        
        // Llenar formulario
        const form = document.getElementById('transaction-form');
        form.name.value = tx.name;
        form.amount.value = tx.amount;
        form.type.value = tx.type;
        form.category.value = tx.category;

        this.switchPage('transactions');
        this._resetFormUI("Editar Movimiento", "Actualizar Cambios");
    }

    async confirmDelete(id) {
        if (confirm("¿Estás seguro de que quieres eliminar este movimiento?")) {
            await this.db.deleteTransaction(id);
            this.notificationManager.show("Movimiento eliminado", "error");
            await this.loadDashboard();
            if (window.calendar) window.calendar.init();
        }
    }

    _cancelEdit() {
        this.stateManager.update({ editingId: null, selectedDate: null });
        this._resetFormUI("Añadir Movimiento", "Guardar Movimiento");
        document.getElementById('transaction-form').reset();
    }

    _resetFormUI(title, btnText) {
        const section = document.getElementById('transactions');
        if (section) section.querySelector('h1').textContent = title;
        const btn = document.querySelector('#transaction-form button[type="submit"]');
        if (btn) btn.textContent = btnText;
    }

    // --- Manejo de Formulario ---

    _setupForm() {
        const form = document.getElementById('transaction-form');
        if (form) form.onsubmit = (e) => this._handleFormSubmit(e);
    }

    async _handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const d = new FormData(form);
        const state = this.stateManager.getState();
        
        const txData = {
            name: d.get('name'),
            amount: parseFloat(d.get('amount')),
            type: d.get('type'),
            category: d.get('category'),
            date: state.selectedDate || new Date().toISOString()
        };

        try {
            if (state.editingId) {
                await this.db.updateTransaction(state.editingId, txData);
                this.notificationManager.show('¡Actualizado con éxito!', 'success');
            } else {
                await this.db.addTransaction(txData);
                this.notificationManager.show('¡Guardado con éxito!', 'success');
            }

            form.reset();
            this._cancelEdit();
            this.switchPage('dashboard');
        } catch (error) {
            this.notificationManager.show('Error al guardar', 'error');
        }
    }

    formatCurrency(num) { return new Intl.NumberFormat('es-AR', CONFIG.CURRENCY_FORMAT).format(num); }
    _setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
}

window.ui = new UI();