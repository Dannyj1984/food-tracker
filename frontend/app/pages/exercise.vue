<template>
    <div>
        <div class="page-header">
            <h1 class="page-title">Exercise</h1>
            <span class="text-sm text-muted">{{ formattedDate }}</span>
        </div>

        <!-- Today's Total -->
        <div v-if="!loading && exerciseEntries.length > 0" class="card mb-2">
            <div class="tracker-widget">
                <span class="tracker-icon">🔥</span>
                <div class="tracker-content">
                    <div class="tracker-value" style="color: var(--accent-amber);">{{ totalCaloriesBurnt }} kcal burnt
                    </div>
                    <div class="tracker-target">{{ exerciseEntries.length }} exercise{{ exerciseEntries.length !== 1 ?
                        's' : '' }} today</div>
                </div>
            </div>
        </div>

        <!-- Log Exercise Form -->
        <div class="card mb-2">
            <h2 class="card-title mb-1">Log Exercise</h2>

            <form @submit.prevent="logExercise">
                <div class="form-group">
                    <label class="form-label" for="exerciseType">Exercise Type</label>
                    <select id="exerciseType" v-model="form.exerciseType" class="form-select" required>
                        <option v-for="opt in exerciseTypes" :key="opt.value" :value="opt.value">{{ opt.label }}
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label" for="caloriesBurnt">Calories Burnt</label>
                    <input id="caloriesBurnt" v-model.number="form.caloriesBurnt" type="number" class="form-input"
                        placeholder="e.g. 400" min="1" max="99999" required inputmode="numeric" />
                </div>

                <!-- HR Zones (collapsible) -->
                <div class="form-group">
                    <button type="button" class="hr-zone-toggle" @click="showHrZones = !showHrZones">
                        <span>❤️ HR Zones</span>
                        <span class="hr-zone-arrow" :class="{ open: showHrZones }">▸</span>
                    </button>
                </div>

                <template v-if="showHrZones">
                    <div v-for="zone in 5" :key="zone" class="form-group">
                        <label class="form-label" :for="'hrZone' + zone">Zone {{ zone }} Time (mm:ss)</label>
                        <input :id="'hrZone' + zone" v-model="hrZoneInputs[zone - 1]" type="text" class="form-input"
                            placeholder="00:00" pattern="[0-9]{1,3}:[0-5][0-9]" inputmode="numeric" />
                    </div>
                </template>

                <div class="form-group">
                    <label class="form-label" for="notes">Notes (optional)</label>
                    <input id="notes" v-model="form.notes" type="text" class="form-input" placeholder="e.g. 5K park run"
                        maxlength="500" />
                </div>

                <div v-if="formError" class="alert alert-error">{{ formError }}</div>
                <div v-if="formSuccess" class="alert alert-success">Exercise logged! ✓</div>

                <button type="submit" class="btn btn-primary btn-block" :disabled="formLoading">
                    <span v-if="formLoading" class="spinner"></span>
                    <span v-else>Log Exercise</span>
                </button>
            </form>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-center">
            <div class="spinner"></div>
        </div>

        <!-- Today's Exercises -->
        <template v-if="!loading">
            <div v-if="exerciseEntries.length === 0" class="card mb-2">
                <div class="empty-state">
                    <div class="empty-state-icon">🏃</div>
                    <div class="empty-state-text">No exercises logged today</div>
                </div>
            </div>

            <div v-for="entry in exerciseEntries" :key="entry.id" class="log-entry">
                <div class="log-entry-info">
                    <div class="log-entry-name">{{ exerciseLabel(entry.exerciseType) }}</div>
                    <div class="log-entry-meta">
                        <span v-if="totalHrSeconds(entry) > 0">{{ formatSeconds(totalHrSeconds(entry)) }} total</span>
                        <span v-if="entry.notes"> · {{ entry.notes }}</span>
                    </div>
                </div>
                <span class="log-entry-calories" style="color: var(--accent-green);">−{{ entry.caloriesBurnt }}
                    kcal</span>
                <button class="log-entry-delete" @click="deleteEntry(entry.id)" title="Remove">✕</button>
            </div>
        </template>
    </div>
</template>

<script setup>
const api = useApi();
const today = new Date().toISOString().split('T')[0];

const formattedDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
});

const exerciseTypes = [
    { value: 'football', label: '⚽ Football' },
    { value: 'running', label: '🏃 Running' },
    { value: 'walking', label: '🚶 Walking' },
    { value: 'netball', label: '🏐 Netball' },
    { value: 'gym', label: '🏋️ Gym' },
    { value: 'swimming', label: '🏊 Swimming' },
    { value: 'other', label: '🎯 Other' },
];

const loading = ref(false);
const exerciseEntries = ref([]);
const totalCaloriesBurnt = ref(0);
const showHrZones = ref(false);

const form = ref({
    exerciseType: 'running',
    caloriesBurnt: null,
    notes: '',
});

const hrZoneInputs = ref(['', '', '', '', '']);
const formLoading = ref(false);
const formError = ref('');
const formSuccess = ref(false);

function parseMMSS(value) {
    if (!value || !value.trim()) return null;
    const parts = value.trim().split(':');
    if (parts.length !== 2) return null;
    const mins = parseInt(parts[0]) || 0;
    const secs = parseInt(parts[1]) || 0;
    if (secs > 59) return null;
    return mins * 60 + secs;
}

function formatSeconds(totalSec) {
    if (!totalSec || totalSec <= 0) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function exerciseLabel(type) {
    const found = exerciseTypes.find(e => e.value === type);
    return found ? found.label : type;
}

function totalHrSeconds(entry) {
    return (entry.hrZone1Seconds || 0) + (entry.hrZone2Seconds || 0) +
        (entry.hrZone3Seconds || 0) + (entry.hrZone4Seconds || 0) +
        (entry.hrZone5Seconds || 0);
}

async function fetchData() {
    loading.value = true;
    try {
        const data = await api.get(`/api/exercise-log?date=${today}`);
        exerciseEntries.value = data.entries;
        totalCaloriesBurnt.value = data.totalCaloriesBurnt;
    } catch (err) {
        console.error('Failed to load exercises:', err);
    } finally {
        loading.value = false;
    }
}

async function logExercise() {
    formLoading.value = true;
    formError.value = '';
    formSuccess.value = false;

    try {
        const body = {
            date: today,
            exerciseType: form.value.exerciseType,
            caloriesBurnt: form.value.caloriesBurnt,
            notes: form.value.notes || null,
        };

        // Parse HR zone inputs
        for (let i = 0; i < 5; i++) {
            const seconds = parseMMSS(hrZoneInputs.value[i]);
            if (seconds !== null && seconds > 0) {
                body[`hrZone${i + 1}Seconds`] = seconds;
            }
        }

        await api.post('/api/exercise-log', body);
        formSuccess.value = true;

        // Reset form
        form.value.caloriesBurnt = null;
        form.value.notes = '';
        hrZoneInputs.value = ['', '', '', '', ''];

        // Refresh list
        await fetchData();

        setTimeout(() => { formSuccess.value = false; }, 3000);
    } catch (err) {
        formError.value = err.message;
    } finally {
        formLoading.value = false;
    }
}

async function deleteEntry(id) {
    try {
        await api.del(`/api/exercise-log/${id}`);
        await fetchData();
    } catch (err) {
        console.error('Failed to delete exercise:', err);
    }
}

onMounted(fetchData);
</script>

<style scoped>
.hr-zone-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.6rem 0.8rem;
    background: var(--bg-glass);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.hr-zone-toggle:hover {
    background: var(--bg-card-hover);
    border-color: rgba(255, 255, 255, 0.15);
}

.hr-zone-arrow {
    transition: transform var(--transition-fast);
    font-size: 0.8rem;
}

.hr-zone-arrow.open {
    transform: rotate(90deg);
}
</style>
