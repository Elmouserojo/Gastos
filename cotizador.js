/**
 * Módulo de Cotización (ARS/USD)
 */
class Cotizador {
    constructor() {
        this.apiUrl = "https://dolarapi.com/v1/dolares";
        this.data = null;
        this.isArsToUsd = true; // Dirección de conversión
        this.init();
    }

    async init() {
        await this.refreshRates(false); // Carga inicial (usa cache si existe)
        this.setupListeners();
    }

    setupListeners() {
        document.getElementById('cotizador-input').addEventListener('input', () => this.calculate());
        document.getElementById('dolar-tipo').addEventListener('change', () => this.calculate());
        document.getElementById('update-rates').addEventListener('click', () => this.refreshRates(true));
        document.getElementById('toggle-direction').addEventListener('click', () => {
            this.isArsToUsd = !this.isArsToUsd;
            document.getElementById('direction-label').innerText = this.isArsToUsd ? "ARS ➔ USD" : "USD ➔ ARS";
            this.calculate();
        });
    }

    async refreshRates(force = false) {
        const cacheKey = 'cotizaciones_cache';
        const cacheTimeKey = 'cotizaciones_time';
        const oneHour = 3600000;

        const cachedData = localStorage.getItem(cacheKey);
        const lastFetch = localStorage.getItem(cacheTimeKey);

        if (!force && cachedData && (Date.now() - lastFetch < oneHour)) {
            this.data = JSON.parse(cachedData);
        } else {
            try {
                const res = await fetch(this.apiUrl);
                this.data = await res.json();
                localStorage.setItem(cacheKey, JSON.stringify(this.data));
                localStorage.setItem(cacheTimeKey, Date.now());
                if(force) window.notifications.show('Cotizaciones actualizadas', 'success');
            } catch (err) {
                window.notifications.show('Error al obtener el dólar', 'expense');
                return;
            }
        }
        this.calculate();
    }

    calculate() {
        if (!this.data) return;

        const monto = parseFloat(document.getElementById('cotizador-input').value) || 0;
        const tipo = document.getElementById('dolar-tipo').value;
        const cotizacion = this.data.find(d => d.casa === tipo);

        if (!cotizacion) return;

        let total;
        if (this.isArsToUsd) {
            total = monto / cotizacion.venta;
            document.getElementById('result-text').innerText = `u$s ${total.toFixed(2)}`;
        } else {
            total = monto * cotizacion.venta;
            document.getElementById('result-text').innerText = `$ ${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }

        document.getElementById('rate-info').innerText = 
            `${tipo.toUpperCase()} - Venta: $${cotizacion.venta} | Actualizado: ${new Date(cotizacion.fechaActualizacion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.cotizador = new Cotizador();
});