<template>
    <Transition name="modal-fade">
        <div v-if="isVisible" class="modal-root" @click.self="cancel">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>{{ modalTitle }}</h3>
                    <button class="btn-close" @click="cancel">×</button>
                </div>

                <div v-if="modalMessage" class="modal-body">
                    <p>{{ modalMessage }}</p>
                </div>

                <div class="modal-footer">
                    <button v-if="modalType === 'confirm'" class="btn-secondary" @click="cancel">
                        {{ cancelLabel }}
                    </button>
                    <button class="btn-primary" @click="submit">
                        {{ confirmLabel }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
const {
    isVisible,
    modalTitle,
    modalMessage,
    modalType,
    confirmLabel,
    cancelLabel,
    submit,
    cancel
} = useModal();
</script>

<style scoped>
.modal-root {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    z-index: 1000;
}

.modal-dialog {
    background: var(--bg-secondary);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 400px;
    box-shadow: var(--shadow-card);
    overflow: hidden;
}

.modal-header {
    padding: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-glass);
}

.modal-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.modal-body {
    padding: 1.5rem 1.25rem;
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
}

.modal-footer {
    padding: 1.25rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
}

.btn-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    transition: color var(--transition-fast);
}

.btn-close:hover {
    color: var(--text-primary);
}

/* Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 300ms ease, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
}
</style>
