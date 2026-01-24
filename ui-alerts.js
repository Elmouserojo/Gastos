/**
 * Configuración personalizada de SweetAlert2 para Cuentas Claras
 */
const Alert = Swal.mixin({
    customClass: {
        confirmButton: 'btn-primary', // Usará tus estilos de CSS
        cancelButton: 'btn-modal-secondary'
    },
    buttonsStyling: true,
    confirmButtonColor: '#bb86fc', // Tu violeta primario
    background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e1e1e' : '#ffffff',
    color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#1a1a1b'
});