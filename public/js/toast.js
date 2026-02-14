// Toast Notification System
const Toast = {
    success: (message) => {
        showToast(message, 'success');
    },

    error: (message) => {
        showToast(message, 'error');
    },

    warning: (message) => {
        showToast(message, 'warning');
    },

    info: (message) => {
        showToast(message, 'info');
    }
};

function showToast(message, type = 'info') {
    const colors = {
        success: { bg: '#10b981', icon: '✓' },
        error: { bg: '#ef4444', icon: '✕' },
        warning: { bg: '#f59e0b', icon: '⚠' },
        info: { bg: '#3b82f6', icon: 'ℹ' }
    };

    const config = colors[type] || colors.info;

    Toastify({
        text: `${config.icon} ${message}`,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        stopOnFocus: true,
        style: {
            background: config.bg,
            borderRadius: '8px',
            padding: '12px 20px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }
    }).showToast();
}

// Auto-show toasts from server messages
document.addEventListener('DOMContentLoaded', () => {
    const successMsg = document.querySelector('[data-success-message]');
    const errorMsg = document.querySelector('[data-error-message]');
    const warningMsg = document.querySelector('[data-warning-message]');
    const infoMsg = document.querySelector('[data-info-message]');

    if (successMsg) Toast.success(successMsg.dataset.successMessage);
    if (errorMsg) Toast.error(errorMsg.dataset.errorMessage);
    if (warningMsg) Toast.warning(warningMsg.dataset.warningMessage);
    if (infoMsg) Toast.info(infoMsg.dataset.infoMessage);
});
