/**
 * UI Manager - Controlador Principal
 * Maneja la navegación, el estado de la pantalla, los formularios y categorías dinámicas.
 */
class UI {
    constructor() {
        // Estado interno de la interfaz
        this.state = {
            currentPage: 'dashboard',
            selectedDate: null,
            editingId: null
        };

        this.pages = document.querySelectorAll('.page');
        this.navLinks = document.querySelectorAll('.nav-btn');
    }

    /**
     * Inicialización de la interfaz
     * Inyecta dependencias y prepara la carga inicial de datos.
     */
    async init() {
        this.db = window.db;
        this.categoryDb = window.categoryDb;
        this.notifications = window.notifications;
        this.charts = window.charts;

        this._setupTheme();
        this._setupNavigation();
        this._setupForm();
        this._setupBudgetForm();
        this._setupCategoryForm();
        
        await this.refreshCategorySelects(); 
        await this.loadDashboard();
    }

    /**
     * Helper: Configuración visual de SweetAlert2 adaptada al tema actual
     */
    _getAlertConfig() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            background: isDark ? '#1e1e1e' : '#ffffff',
            color: isDark ? '#ffffff' : '#1a1a1b',
            confirmButtonColor: isDark ? '#bb86fc' : '#6200ee', // Violeta según tema
            cancelButtonColor: '#e57373', // Rojo para cancelar/peligro
            reverseButtons: true,
            backdrop: `rgba(0,0,0,0.5)`,
            heightAuto: false // Evita saltos de scroll en móviles
        };
    }

    /**
     * Manejo del tema Claro/Oscuro con persistencia e iconos dinámicos
     */
    _setupTheme() {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        const iconEl = toggle.querySelector('.material-icons');

        const apply = (t) => {
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem('app-theme', t);
            
            if (iconEl) {
                // Luna para ir a oscuro, Sol para ir a claro
                iconEl.textContent = t === 'light' ? 'dark_mode' : 'light_mode';
            }
        };

        apply(localStorage.getItem('app-theme') || 'dark');

        toggle.onclick = () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            apply(next);
            
            // Forzar refresco de gráficos para actualizar colores de fuente
            this.loadDashboard();
        };
    }

    _setupNavigation() {
        this.navLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                // Si salimos de una página mientras editamos, cancelamos la edición
                if (this.state.editingId) this._cancelEdit();
                this.switchPage(link.getAttribute('data-page'));
            };
        });
    }

    _setupForm() {
        const form = document.getElementById('transaction-form');
        if (form) form.onsubmit = (e) => this._handleFormSubmit(e);
    }

    /**
     * Prepara el formulario para registrar un movimiento en una fecha específica
     */
    prepareTransactionWithDate(date) {
        this.state.selectedDate = date.toISOString();
        this.switchPage('transactions');
        
        const formattedDate = date.toLocaleDateString();
        // Feedback visual en el encabezado
        this._resetFormUI(`Registrar para el ${formattedDate}`, "Guardar Movimiento");
        this.notifications.show(`Fecha: ${formattedDate}`, "info");
    }

    _setupCategoryForm() {
        const form = document.getElementById('category-form');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById('new-category-name');
            const name = input.value.trim();

            try {
                await this.categoryDb.add(name);
                this.notifications.show(`Categoría "${name}" añadida`, "success");
                input.value = '';
                await this.refreshCategorySelects();
                this.loadCategoriesSettingsList();
            } catch (error) {
                this.notifications.show(error, "error");
            }
        };
    }

    _setupBudgetForm() {
        const form = document.getElementById('budget-form');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const category = document.getElementById('budget-category').value;
            const limit = parseFloat(document.getElementById('budget-limit').value);

            try {
                await window.budgetDb.save(category, limit);
                this.notifications.show(`Límite para ${category} guardado`, "success");
                form.reset();
                this.loadBudgetsSettingsList();
                this.loadDashboard(); 
            } catch (error) {
                this.notifications.show("Error al guardar presupuesto", "error");
            }
        };
    }

    async refreshCategorySelects() {
        const categories = await this.categoryDb.getAll();
        const selects = ['transaction-category', 'budget-category'];

        selects.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const currentValue = el.value;
            el.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            if (categories.includes(currentValue)) el.value = currentValue;
        });
    }

    switchPage(pageId) {
        this.pages.forEach(p => p.classList.toggle('active', p.id === pageId));
        this.navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('data-page') === pageId));
        
        if (pageId === 'dashboard') this.loadDashboard();
        if (pageId === 'calendar' && window.calendar) window.calendar.init();
        
        if (pageId === 'transactions') {
            this.refreshCategorySelects();
            this.loadBudgetsSettingsList();
        }
        if (pageId === 'settings') this.loadCategoriesSettingsList();
    }

    async loadDashboard() {
        const txs = await this.db.getAllTransactions();
        const inc = txs.filter(t => t.type === 'ingreso').reduce((a, b) => a + b.amount, 0);
        const exp = txs.filter(t => t.type === 'egreso').reduce((a, b) => a + b.amount, 0);
        
        this._setText('total-balance', this.formatCurrency(inc - exp));
        this._setText('total-income', this.formatCurrency(inc));
        this._setText('total-expense', this.formatCurrency(exp));
        
        this.charts.updateCategoryChart(txs);
        this.charts.updateEvolutionChart(txs);
        
        if (window.budgetManager) {
            await window.budgetManager.renderProgress('budget-progress-container');
        }
        this._renderTransactionList('recent-list', txs.slice(0, 5));
    }

    async loadCategoriesSettingsList() {
        const container = document.getElementById('manage-categories-list');
        if (!container) return;
        const categories = await this.categoryDb.getAll();
        
        container.innerHTML = categories.map(cat => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px; margin-bottom: 5px; border: 1px solid var(--border-color);">
                <span style="font-size: 13px;">${cat}</span>
                <button onclick="ui.deleteCategory('${cat}')" style="background: none; border: none; color: var(--expense-color); cursor: pointer;">
                    <i class="material-icons" style="font-size: 18px;">delete_outline</i>
                </button>
            </div>
        `).join('');
    }

    /**
     * Eliminación de categoría con confirmación de SweetAlert2
     */
    async deleteCategory(name) {
        const result = await Swal.fire({
            title: '¿Eliminar categoría?',
            text: `¿Estás seguro de eliminar "${name}"? Los movimientos existentes se mantendrán sin categoría asignada.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            ...this._getAlertConfig()
        });

        if (result.isConfirmed) {
            await this.categoryDb.delete(name);
            this.notifications.show("Categoría eliminada", "success");
            await this.refreshCategorySelects();
            this.loadCategoriesSettingsList();
            this.loadDashboard();
        }
    }

    async loadBudgetsSettingsList() {
        const container = document.getElementById('active-budgets-list');
        if (!container) return;
        const budgets = await window.budgetDb.getAll();
        
        if (budgets.length === 0) {
            container.innerHTML = '<p style="font-size:12px; opacity:0.5; text-align:center; padding:10px;">No hay límites configurados.</p>';
            return;
        }

        let html = '<h4 style="font-size: 12px; margin-bottom: 10px; opacity: 0.7; border-top: 1px solid var(--border-color); padding-top:15px;">Límites Actuales:</h4>';
        html += budgets.map(b => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border-color);">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-size: 13px; font-weight:bold;">${b.category}</span>
                    <small style="opacity:0.7;">Límite: ${this.formatCurrency(b.limit)}</small>
                </div>
                <button onclick="ui.deleteBudget('${b.category}')" style="background: none; border: none; color: var(--expense-color); cursor: pointer; padding: 5px;">
                    <i class="material-icons" style="font-size: 20px;">delete_outline</i>
                </button>
            </div>
        `).join('');
        container.innerHTML = html;
    }

    /**
     * Eliminación de presupuesto con confirmación de SweetAlert2
     */
    async deleteBudget(category) {
        const result = await Swal.fire({
            title: '¿Eliminar límite?',
            text: `¿Deseas eliminar el presupuesto para la categoría "${category}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, borrar',
            ...this._getAlertConfig()
        });

        if (result.isConfirmed) {
            await window.budgetDb.delete(category);
            this.notifications.show("Presupuesto eliminado", "info");
            this.loadBudgetsSettingsList();
            this.loadDashboard();
        }
    }

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
                    <strong style="color: ${t.type === 'ingreso' ? 'var(--income-color)' : 'var(--expense-color)'}">${this.formatCurrency(t.amount)}</strong>
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

    async _handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const d = new FormData(form);
        const txData = {
            name: d.get('name'),
            amount: parseFloat(d.get('amount')),
            type: d.get('type'),
            category: d.get('category'),
            date: this.state.selectedDate || new Date().toISOString()
        };

        try {
            if (this.state.editingId) {
                await this.db.updateTransaction(this.state.editingId, txData);
                this.notifications.show('¡Actualizado!', 'success');
            } else {
                await this.db.addTransaction(txData);
                this.notifications.show('¡Guardado!', 'success');
            }
            form.reset();
            this._cancelEdit();
            this.switchPage('dashboard');
        } catch (error) {
            this.notifications.show('Error al guardar', 'error');
        }
    }

    async prepareEdit(id) {
        const txs = await this.db.getAllTransactions();
        const tx = txs.find(t => t.id === id);
        if (!tx) return;
        
        this.state.editingId = id;
        this.state.selectedDate = tx.date;
        const form = document.getElementById('transaction-form');
        form.name.value = tx.name;
        form.amount.value = tx.amount;
        form.type.value = tx.type;
        
        await this.refreshCategorySelects();
        form.category.value = tx.category;
        
        this.switchPage('transactions');
        this._resetFormUI("Editar Movimiento", "Actualizar Cambios");
    }

    /**
     * Eliminación de transacción con confirmación de SweetAlert2
     */
    async confirmDelete(id) {
        const result = await Swal.fire({
            title: '¿Borrar transacción?',
            text: "Esta acción es definitiva y no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            ...this._getAlertConfig()
        });

        if (result.isConfirmed) {
            await this.db.deleteTransaction(id);
            this.notifications.show("Movimiento eliminado", "error");
            await this.loadDashboard();
            if (window.calendar) window.calendar.init();
        }
    }

    _cancelEdit() {
        this.state.editingId = null;
        this.state.selectedDate = null;
        this._resetFormUI("Añadir Movimiento", "Guardar Movimiento");
        document.getElementById('transaction-form').reset();
    }

    _resetFormUI(title, btnText) {
        const section = document.getElementById('transactions');
        if (section) {
            const h1 = section.querySelector('h1');
            if (h1) h1.textContent = title;
        }
        const btn = document.querySelector('#transaction-form button[type="submit"]');
        if (btn) btn.textContent = btnText;
    }

    formatCurrency(num) { 
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num); 
    }

    _setText(id, txt) { 
        const el = document.getElementById(id); 
        if (el) el.textContent = txt; 
    }
}

// Inicialización global
window.ui = new UI();