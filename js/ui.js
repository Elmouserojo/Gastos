/**
 * Módulo de Interfaz de Usuario
 * Maneja toda la interacción con el DOM
 */

class UI {
    constructor() {
        this.currentPage = 'dashboard';
        this.selectedDate = null;
        this.currentMonth = new Date();
        this.editingId = null;
    }

    // Inicializar UI
    async init() {
        this.initTheme();
        await this.setupEventListeners();
        await this.loadDashboard();
        this.setupDateInputs();
    }

    // Configurar listeners de eventos
    setupEventListeners() {
        // Navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
            });
        });

        // Formulario de transacción
        const form = document.getElementById('transaction-form');
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Selector de tipo
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectType(e.currentTarget.dataset.type);
            });
        });

        // Botón cancelar
        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.resetForm();
            this.switchPage('transactions');
        });

        // Botón eliminar
        document.getElementById('delete-btn').addEventListener('click', () => {
            this.deleteTransaction();
        });

        // Filtros
        document.getElementById('filter-type').addEventListener('change', () => {
            this.loadTransactions();
        });

        document.getElementById('search-input').addEventListener('input', () => {
            this.loadTransactions();
        });

        document.getElementById('start-date').addEventListener('change', () => {
            this.loadTransactions();
        });

        document.getElementById('end-date').addEventListener('change', () => {
            this.loadTransactions();
        });

        // Validación en tiempo real
        document.getElementById('name').addEventListener('input', (e) => {
            this.validateField(e.target, 'name');
        });

        document.getElementById('amount').addEventListener('input', (e) => {
            this.validateField(e.target, 'amount');
        });

        // Inicializar fecha en formulario
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        document.getElementById('date').max = today;

        // Botón alternar tema
        const themeToggleBtn = document.getElementById('theme-toggle');
        if (themeToggleBtn) {
            console.debug('Attaching theme toggle listener to button', themeToggleBtn);
            themeToggleBtn.addEventListener('click', (e) => {
                console.debug('themeToggle clicked', e);
                this.toggleTheme();
            });
            // Soporte por teclado (Enter / Space)
            themeToggleBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    console.debug('themeToggle keydown', e.key);
                    this.toggleTheme();
                }
            });
        }
    }

    // Configurar inputs de fecha
    setupDateInputs() {
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        
        // Establecer valores por defecto (últimos 30 días)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        endDateInput.value = today;
        endDateInput.max = today;
        
        // Validar que start <= end
        startDateInput.addEventListener('change', () => {
            if (startDateInput.value > endDateInput.value) {
                endDateInput.value = startDateInput.value;
            }
        });
        
        endDateInput.addEventListener('change', () => {
            if (endDateInput.value < startDateInput.value) {
                startDateInput.value = endDateInput.value;
            }
        });
    }

    // Inicializar tema (dark / light)
    initTheme() {
        const saved = localStorage.getItem('theme');
        const theme = saved || 'dark'; // por defecto: oscuro
        this.applyTheme(theme, false);
    }

    applyTheme(theme, persist = true) {
        const btn = document.getElementById('theme-toggle');
        const meta = document.querySelector('meta[name="theme-color"]');
        console.debug('applyTheme: incoming theme ->', theme, 'current data-theme ->', document.documentElement.getAttribute('data-theme'));

        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (btn) {
                btn.innerHTML = '<i class="material-icons">light_mode</i>';
                btn.setAttribute('title','Cambiar a modo claro');
                btn.setAttribute('aria-pressed','true');
            }
            if (meta) meta.setAttribute('content','#121212');
        } else {
            // light / default
            document.documentElement.setAttribute('data-theme', 'light');
            if (btn) {
                btn.innerHTML = '<i class="material-icons">dark_mode</i>';
                btn.setAttribute('title','Cambiar a modo oscuro');
                btn.setAttribute('aria-pressed','false');
            }
            if (meta) meta.setAttribute('content','#6200ee');
        }

        if (persist) {
            localStorage.setItem('theme', theme);
            console.debug('applyTheme: saved theme in localStorage ->', localStorage.getItem('theme'));
        }

        console.debug('applyTheme: resulting data-theme ->', document.documentElement.getAttribute('data-theme'));
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        console.debug('toggleTheme: current ->', current, 'next ->', next);
        this.applyTheme(next, true);
    }

    // Cambiar página
    switchPage(page) {
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        
        // Mostrar página seleccionada
        document.getElementById(page).classList.add('active');
        
        // Actualizar navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === page) {
                btn.classList.add('active');
            }
        });
        
        this.currentPage = page;
        
        // Cargar contenido específico de la página
        switch(page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'calendar':
                this.loadCalendar();
                break;
            case 'add':
                // Formulario ya está listo
                break;
        }
    }

    // Seleccionar tipo de transacción
    selectType(type) {
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === type) {
                btn.classList.add('active');
            }
        });
        
        document.getElementById('type').value = type;
    }

    // Validar campo
    validateField(field, fieldName) {
        const errorElement = document.getElementById(`${fieldName}-error`);
        let isValid = true;
        let message = '';

        switch(fieldName) {
            case 'name':
                if (!field.value.trim()) {
                    isValid = false;
                    message = 'El nombre es obligatorio';
                } else if (field.value.trim().length > 50) {
                    isValid = false;
                    message = 'Máximo 50 caracteres';
                }
                break;
                
            case 'amount':
                const value = parseFloat(field.value);
                if (isNaN(value) || value <= 0) {
                    isValid = false;
                    message = 'El monto debe ser mayor a 0';
                }
                break;
        }

        if (!isValid) {
            field.classList.add('error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            field.classList.remove('error');
            errorElement.style.display = 'none';
        }

        return isValid;
    }

    // Validar formulario completo
    validateForm() {
        const nameField = document.getElementById('name');
        const amountField = document.getElementById('amount');
        
        const isNameValid = this.validateField(nameField, 'name');
        const isAmountValid = this.validateField(amountField, 'amount');
        
        return isNameValid && isAmountValid;
    }

    // Manejar envío del formulario
    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            this.showNotification('Por favor corrige los errores', 'error');
            return;
        }
        
        const formData = {
            type: document.getElementById('type').value,
            name: document.getElementById('name').value.trim(),
            description: document.getElementById('description').value.trim(),
            amount: parseFloat(document.getElementById('amount').value),
            date: document.getElementById('date').value,
            id: document.getElementById('transaction-id').value || db.generateId()
        };
        
        try {
            if (this.editingId) {
                await db.updateTransaction(this.editingId, formData);
                this.showNotification('Transacción actualizada', 'success');
            } else {
                await db.addTransaction(formData);
                this.showNotification('Transacción guardada', 'success');
            }
            
            this.resetForm();
            this.switchPage('transactions');
            await this.loadDashboard();
        } catch (error) {
            console.error('Error al guardar:', error);
            this.showNotification('Error al guardar la transacción', 'error');
        }
    }

    // Cargar dashboard
    async loadDashboard() {
        try {
            const stats = await db.getStats();
            const recentTransactions = await db.getAllTransactions();
            
            // Actualizar resumen
            document.getElementById('total-income').textContent = 
                this.formatCurrency(stats.totalIncome);
            document.getElementById('total-expense').textContent = 
                this.formatCurrency(stats.totalExpense);
            document.getElementById('total-balance').textContent = 
                this.formatCurrency(stats.balance);
            
            // Actualizar lista reciente (últimas 5)
            const recentList = recentTransactions.slice(0, 5);
            this.renderTransactionList(recentList, 'recent-list');
        } catch (error) {
            console.error('Error al cargar dashboard:', error);
            this.showNotification('Error al cargar el resumen', 'error');
        }
    }

    // Cargar transacciones con filtros
    async loadTransactions() {
        try {
            let transactions = await db.getAllTransactions();
            
            // Aplicar filtro de tipo
            const typeFilter = document.getElementById('filter-type').value;
            if (typeFilter !== 'all') {
                transactions = transactions.filter(t => t.type === typeFilter);
            }
            
            // Aplicar filtro de búsqueda
            const searchText = document.getElementById('search-input').value.trim();
            if (searchText) {
                transactions = transactions.filter(t => 
                    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
                    (t.description && 
                     t.description.toLowerCase().includes(searchText.toLowerCase()))
                );
            }
            
            // Aplicar filtro de fechas
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            
            if (startDate && endDate) {
                transactions = transactions.filter(t => {
                    const transDate = t.date;
                    return transDate >= startDate && transDate <= endDate;
                });
            }
            
            this.renderTransactionList(transactions, 'transactions-list');
        } catch (error) {
            console.error('Error al cargar transacciones:', error);
            this.showNotification('Error al cargar transacciones', 'error');
        }
    }

    // Renderizar lista de transacciones
    renderTransactionList(transactions, containerId) {
        const container = document.getElementById(containerId);
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="material-icons">receipt</i>
                    <p>No hay transacciones</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        transactions.forEach(transaction => {
            const isIncome = transaction.type === 'income';
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            
            html += `
                <div class="transaction-item ${isIncome ? 'income' : 'expense'}" 
                     data-id="${transaction.id}">
                    <div class="transaction-icon">
                        <i class="material-icons">${isIncome ? 'arrow_upward' : 'arrow_downward'}</i>
                    </div>
                    <div class="transaction-info">
                        <h4>${transaction.name}</h4>
                        ${transaction.description ? `<p>${transaction.description}</p>` : ''}
                        <span class="transaction-date">${formattedDate}</span>
                    </div>
                    <div class="transaction-amount">
                        <span>${isIncome ? '+' : '-'}${this.formatCurrency(transaction.amount)}</span>
                        <div class="transaction-actions">
                            <button class="icon-btn edit-btn" title="Editar">
                                <i class="material-icons">edit</i>
                            </button>
                            <button class="icon-btn delete-btn" title="Eliminar">
                                <i class="material-icons">delete</i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Agregar event listeners a los botones
        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.closest('.transaction-item').dataset.id;
                this.editTransaction(id);
            });
        });
        
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.closest('.transaction-item').dataset.id;
                this.confirmDelete(id);
            });
        });
        
        // Hacer clicable toda la transacción
        container.querySelectorAll('.transaction-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.transaction-actions')) {
                    const id = item.dataset.id;
                    this.editTransaction(id);
                }
            });
        });
    }

    // Editar transacción
    async editTransaction(id) {
        try {
            const transaction = await db.getTransaction(id);
            
            if (!transaction) {
                this.showNotification('Transacción no encontrada', 'error');
                return;
            }
            
            this.editingId = id;
            
            // Llenar formulario
            document.getElementById('form-title').textContent = 'Editar Transacción';
            document.getElementById('transaction-id').value = id;
            this.selectType(transaction.type);
            document.getElementById('name').value = transaction.name;
            document.getElementById('description').value = transaction.description || '';
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('date').value = transaction.date;
            
            // Mostrar botón eliminar
            document.getElementById('delete-btn').style.display = 'block';
            
            // Ir a página de edición
            this.switchPage('add');
        } catch (error) {
            console.error('Error al cargar transacción:', error);
            this.showNotification('Error al cargar transacción', 'error');
        }
    }

    // Confirmar eliminación
    confirmDelete(id) {
        if (confirm('¿Estás seguro de eliminar esta transacción?')) {
            this.deleteTransaction(id);
        }
    }

    // Eliminar transacción
    async deleteTransaction(id = this.editingId) {
        if (!id) return;
        
        try {
            await db.deleteTransaction(id);
            this.showNotification('Transacción eliminada', 'success');
            
            if (this.editingId === id) {
                this.resetForm();
                this.switchPage('transactions');
            }
            
            // Recargar vistas
            await this.loadDashboard();
            await this.loadTransactions();
            
            if (this.currentPage === 'calendar') {
                await this.loadCalendar();
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
            this.showNotification('Error al eliminar transacción', 'error');
        }
    }

    // Resetear formulario
    resetForm() {
        document.getElementById('form-title').textContent = 'Nueva Transacción';
        document.getElementById('transaction-form').reset();
        document.getElementById('transaction-id').value = '';
        document.getElementById('delete-btn').style.display = 'none';
        
        // Restaurar valores por defecto
        this.selectType('income');
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        
        this.editingId = null;
        
        // Limpiar errores
        document.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
        });
    }

    // Mostrar notificación
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // Formatear moneda
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Cargar calendario
    async loadCalendar() {
        try {
            const calendar = new Calendar();
            await calendar.init(this.currentMonth);
        } catch (error) {
            console.error('Error al cargar calendario:', error);
            this.showNotification('Error al cargar calendario', 'error');
        }
    }
}

// Instancia global de UI
const ui = new UI();