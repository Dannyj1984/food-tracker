<template>
    <div class="calendar-page container">
        <header class="header">
            <div class="calendar-nav">
                <button class="btn-icon" @click="prevWeek">←</button>
                <div class="nav-title">
                    <h1>{{ monthName }} {{ currentYear }}</h1>
                    <span class="week-range">{{ weekRangeText }}</span>
                </div>
                <button class="btn-icon" @click="nextWeek">→</button>
            </div>
            <p class="subtitle">Shared Family Evening Meals</p>
        </header>

        <div class="weekly-list">
            <div v-for="item in calendarDays" :key="item.dateString" class="day-row" :class="{
                'is-today': item.isToday,
                'has-meal': plannedMeals[item.dateString]
            }" @click="openSelectModal(item.dateString)" @dragover.prevent @drop="onDrop($event, item.dateString)">
                <div class="day-info">
                    <span class="day-name">{{ item.dayName }}</span>
                    <span class="day-date">{{ item.dayNumber }} {{ item.monthName }}</span>
                </div>

                <div class="meal-slot">
                    <div v-if="plannedMeals[item.dateString]" class="meal-card" draggable="true"
                        @dragstart="onDragStart($event, item.dateString)">
                        <div class="meal-content">
                            <span class="meal-title">{{ plannedMeals[item.dateString].customMeal.name }}</span>
                            <span class="meal-cals">{{ Math.round(plannedMeals[item.dateString].customMeal.calories) }}
                                kcal</span>
                        </div>
                        <button class="btn-remove" @click.stop="removeMeal(item.dateString)">×</button>
                    </div>
                    <div v-else class="meal-placeholder">
                        Tap to plan dinner...
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal for picking meal -->
        <Transition name="fade">
            <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Plan Evening Meal</h3>
                        <button style="padding: 5px;" @click="showModal = false">×</button>
                    </div>
                    <p class="modal-date">{{ formattedSelectedDate }}</p>

                    <div class="meal-list">
                        <input v-model="search" type="text" placeholder="Search meals..." class="form-input" />

                        <div v-for="meal in filteredMeals" :key="meal.id" class="meal-item" @click="selectMeal(meal)">
                            <div class="meal-info-modal">
                                <span class="meal-title-modal">{{ meal.name }}</span>
                                <span class="meal-sub-modal">{{ Math.round(meal.calories) }} kcal</span>
                            </div>
                            <span v-if="meal.isFavourite">⭐</span>
                        </div>

                        <div v-if="filteredMeals.length === 0" class="empty-state">
                            No meals found. Create some in the Meals tab!
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup>
const api = useApi();
const showModal = ref(false);
const selectedDate = ref('');
const search = ref('');
const customMeals = ref([]);
const plannedMeals = ref({});
const modal = useModal();

// Calendar state
const viewDate = ref(new Date());

const currentMonth = computed(() => viewDate.value.getMonth());
const currentYear = computed(() => viewDate.value.getFullYear());
const monthName = computed(() => new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(viewDate.value));

const calendarDays = computed(() => {
    const days = [];
    const curr = new Date(viewDate.value);

    // Find Sunday of the current week
    const diff = curr.getDate() - curr.getDay();
    const sun = new Date(curr.setDate(diff));
    sun.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const d = new Date(sun);
        d.setDate(sun.getDate() + i);

        days.push({
            dateString: formatDate(d),
            dayName: new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(d),
            dayNumber: d.getDate(),
            monthName: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d),
            isToday: formatDate(d) === formatDate(new Date())
        });
    }

    return days;
});

const weekRangeText = computed(() => {
    const start = calendarDays.value[0];
    const end = calendarDays.value[6];
    return `${start.dayNumber} ${start.monthName} — ${end.dayNumber} ${end.monthName}`;
});

const formattedSelectedDate = computed(() => {
    if (!selectedDate.value) return '';
    return new Date(selectedDate.value).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
});

const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const filteredMeals = computed(() => {
    const s = search.value.toLowerCase();
    return customMeals.value.filter(m => m.name.toLowerCase().includes(s));
});

// Navigation
const prevWeek = () => {
    const d = new Date(viewDate.value);
    d.setDate(d.getDate() - 7);
    viewDate.value = d;
    fetchPlannedMeals();
};

const nextWeek = () => {
    const d = new Date(viewDate.value);
    d.setDate(d.getDate() + 7);
    viewDate.value = d;
    fetchPlannedMeals();
};

// Actions
const fetchCustomMeals = async () => {
    try {
        const data = await api.get('/api/custom-meals');
        customMeals.value = data || [];
    } catch (err) { console.error(err); }
};

const fetchPlannedMeals = async () => {
    const days = calendarDays.value;
    const start = days[0].dateString;
    const end = days[days.length - 1].dateString;

    try {
        const data = await api.get(`/api/calendar?start=${start}&end=${end}`);
        const meals = {};
        (data || []).forEach(m => {
            meals[m.date.split('T')[0]] = m;
        });
        plannedMeals.value = meals;
    } catch (err) { console.error(err); }
};

const openSelectModal = (date) => {
    selectedDate.value = date;
    showModal.value = true;
};

const selectMeal = async (meal) => {
    try {
        const data = await api.post('/api/calendar', {
            date: selectedDate.value,
            customMealId: meal.id
        });
        plannedMeals.value[selectedDate.value] = data;
        showModal.value = false;
    } catch (err) { console.error(err); }
};

const removeMeal = async (date) => {
    const confirmed = await modal.confirm({
        title: 'Remove Meal?',
        message: 'Are you sure you want to remove this planned dinner?'
    });

    if (!confirmed) return;

    try {
        await api.del(`/api/calendar/${date}`);
        delete plannedMeals.value[date];
    } catch (err) { console.error(err); }
};

// Drag and Drop
const onDragStart = (event, date) => {
    event.dataTransfer.setData('sourceDate', date);
    event.dataTransfer.effectAllowed = 'move';
};

const onDrop = async (event, targetDate) => {
    const sourceDate = event.dataTransfer.getData('sourceDate');
    if (!sourceDate || sourceDate === targetDate) return;

    const mealEntry = plannedMeals.value[sourceDate];
    if (!mealEntry) return;

    try {
        // 1. Assign to new date
        const data = await api.post('/api/calendar', {
            date: targetDate,
            customMealId: mealEntry.customMealId
        });

        // 2. Remove old date
        await api.del(`/api/calendar/${sourceDate}`);

        // 3. Update local state
        delete plannedMeals.value[sourceDate];
        plannedMeals.value[targetDate] = data;
    } catch (err) { console.error(err); }
};

onMounted(() => {
    fetchCustomMeals();
    fetchPlannedMeals();
});
</script>

<style scoped>
.calendar-page {
    padding-bottom: 5rem;
}

.header {
    margin-bottom: 1.5rem;
    text-align: center;
}

.calendar-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
}

.nav-title {
    min-width: 200px;
}

.calendar-nav h1 {
    font-size: 1.25rem;
    color: var(--text-primary);
    margin: 0;
}

.week-range {
    display: block;
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 0.2rem;
}

/* Weekly List Layout */
.weekly-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.day-row {
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    overflow: hidden;
    min-height: 80px;
    cursor: pointer;
    transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.day-row:hover {
    border-color: var(--border-focus);
}

.day-row.is-today {
    border: 1px solid var(--accent-indigo);
    box-shadow: 0 0 15px var(--accent-indigo-glow);
}

.day-info {
    width: 90px;
    padding: 1rem;
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-right: 1px solid var(--border-glass);
    text-align: center;
}

.day-row.is-today .day-info {
    background: var(--accent-indigo);
}

.day-row.is-today .day-name,
.day-row.is-today .day-date {
    color: white;
}

.day-name {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-secondary);
}

.day-date {
    font-size: 0.7rem;
    color: var(--text-muted);
}

.meal-slot {
    flex: 1;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
}

.meal-placeholder {
    font-size: 0.875rem;
    color: var(--text-muted);
    font-style: italic;
}

.meal-card {
    width: 100%;
    background: var(--accent-indigo-glow);
    border: 1px solid var(--accent-indigo);
    border-radius: var(--radius-md);
    padding: 0.6rem 0.8rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--accent-indigo);
}

.meal-content {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.meal-title {
    font-weight: 600;
    font-size: 0.95rem;
    line-clamp: 1;
    -webkit-line-clamp: 1;
}

.meal-cals {
    font-size: 0.75rem;
    opacity: 0.8;
}

.btn-remove {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.25rem;
    line-height: 1;
    padding: 0.2rem;
    cursor: pointer;
    opacity: 0.6;
}

.btn-remove:hover {
    opacity: 1;
}

/* Modal */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 200;
}

.modal {
    background: var(--bg-secondary);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 400px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.modal-header {
    padding: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-glass);
}

.modal-date {
    padding: 0.5rem 1.25rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.meal-list {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
}

.meal-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    margin-bottom: 0.5rem;
    cursor: pointer;
}

.meal-item:hover {
    background: var(--bg-card-hover);
}

.meal-info-modal {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.meal-title-modal {
    font-weight: 500;
    font-size: 0.95rem;
}

.meal-sub-modal {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
