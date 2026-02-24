/**
 * useModal composable - Global modal management 🛠️
 * Handles showing alerts and confirmations with Promises
 */

const isVisible = ref(false);
const modalTitle = ref('');
const modalMessage = ref('');
const modalType = ref('confirm'); // 'alert' | 'confirm'
const confirmLabel = ref('Confirm');
const cancelLabel = ref('Cancel');

let resolveModal: ((value: any) => void) | null = null;

export function useModal() {
    /**
     * Show a confirmation modal
     * Returns a Promise that resolves to true (submit) or false (cancel)
     */
    const confirm = (options: { title: string, message?: string, confirmText?: string, cancelText?: string }) => {
        modalTitle.value = options.title;
        modalMessage.value = options.message || '';
        modalType.value = 'confirm';
        confirmLabel.value = options.confirmText || 'Confirm';
        cancelLabel.value = options.cancelText || 'Cancel';
        isVisible.value = true;

        return new Promise<boolean>((resolve) => {
            resolveModal = resolve;
        });
    };

    /**
     * Show an alert modal
     */
    const alert = (options: { title: string, message?: string, confirmText?: string }) => {
        modalTitle.value = options.title;
        modalMessage.value = options.message || '';
        modalType.value = 'alert';
        confirmLabel.value = options.confirmText || 'OK';
        isVisible.value = true;

        return new Promise<void>((resolve) => {
            resolveModal = resolve;
        });
    };

    const submit = () => {
        isVisible.value = false;
        if (resolveModal) resolveModal(true);
    };

    const cancel = () => {
        isVisible.value = false;
        if (resolveModal) resolveModal(false);
    };

    return {
        isVisible,
        modalTitle,
        modalMessage,
        modalType,
        confirmLabel,
        cancelLabel,
        confirm,
        alert,
        submit,
        cancel
    };
}
