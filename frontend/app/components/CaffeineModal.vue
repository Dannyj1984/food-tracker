<template>
    <Transition name="modal-fade">
        <div v-if="isVisible" class="modal-root" @click.self="close">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>☕ Quick Caffeine Log</h3>
                    <button class="btn-close" @click="close">×</button>
                </div>

                <div class="modal-body">
                    <div v-if="!presets || presets.length === 0" class="empty-state">
                        <p>No presets found.</p>
                        <NuxtLink to="/settings" class="btn btn-secondary btn-sm" @click="close">Go to Settings
                        </NuxtLink>
                    </div>

                    <div v-else>
                        <p class="text-sm text-muted mb-1">Select a drink and size:</p>

                        <div class="preset-grid">
                            <div v-for="(preset, index) in presets" :key="index" class="preset-card">
                                <div class="preset-name">{{ preset.name }}</div>
                                <div class="size-buttons">
                                    <button v-if="preset.small > 0" class="btn btn-sm btn-outline"
                                        @click="logCaffeine(preset, 'small')" :disabled="loading">
                                        S ({{ preset.small }}mg)
                                    </button>
                                    <button v-if="preset.medium > 0" class="btn btn-sm btn-outline"
                                        @click="logCaffeine(preset, 'medium')" :disabled="loading">
                                        M ({{ preset.medium }}mg)
                                    </button>
                                    <button v-if="preset.large > 0" class="btn btn-sm btn-outline"
                                        @click="logCaffeine(preset, 'large')" :disabled="loading">
                                        L ({{ preset.large }}mg)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="error" class="alert alert-error mx-1 mb-1">{{ error }}</div>
                <div v-if="success" class="alert alert-success mx-1 mb-1">Logged! ✓</div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
const props = defineProps({
    isVisible: Boolean,
    presets: Array,
});

const emit = defineEmits(['close', 'logged']);
const api = useApi();

const loading = ref(false);
const error = ref('');
const success = ref(false);

const close = () => {
    if (loading.value) return;
    emit('close');
    // Reset state after transition
    setTimeout(() => {
        error.value = '';
        success.value = false;
    }, 300);
};

const logCaffeine = async (preset, size) => {
    const amount = preset[size];
    if (!amount) return;

    loading.value = true;
    error.value = '';

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
        await api.post('/api/food-log', {
            date,
            time,
            mealType: 'snack',
            source: 'custom_food', // We use custom_food source for simplicity in UI tracking
            sourceId: 'caffeine_preset',
            name: `${preset.name} (${size.charAt(0).toUpperCase()})`,
            quantityG: 0,
            calories: 0,
            fat: 0,
            saturatedFat: 0,
            carbs: 0,
            sugars: 0,
            fiber: 0,
            protein: 0,
            salt: 0,
            caffeine: amount,
        });

        success.value = true;
        emit('logged');

        setTimeout(() => {
            close();
        }, 1000);
    } catch (err) {
        error.value = err.message || 'Failed to log caffeine';
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.modal-root {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
}

.modal-dialog {
    background: var(--bg-card);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    overflow: hidden;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--border-glass);
}

.modal-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.btn-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
}

.modal-body {
    padding: 1rem;
    max-height: 60vh;
    overflow-y: auto;
}

.preset-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.preset-card {
    background: var(--bg-glass);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    padding: 0.75rem;
}

.preset-name {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}

.size-buttons {
    display: flex;
    gap: 0.4rem;
}

.btn-outline {
    flex: 1;
    background: none;
    border: 1px solid var(--accent-indigo);
    color: var(--accent-indigo);
    padding: 0.4rem;
    font-size: 0.75rem;
    transition: all var(--transition-fast);
}

.btn-outline:hover:not(:disabled) {
    background: var(--accent-indigo-glow);
}

.mx-1 {
    margin-left: 1rem;
    margin-right: 1rem;
}

.mb-1 {
    margin-bottom: 1rem;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-active .modal-dialog {
    animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-leave-active .modal-dialog {
    animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) reverse;
}

@keyframes modal-pop {
    from {
        transform: scale(0.9);
    }

    to {
        transform: scale(1);
    }
}
</style>
