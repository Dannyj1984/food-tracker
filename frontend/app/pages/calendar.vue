<template>
    <div class="calendar-page container">
        <header class="header">
            <div class="calendar-nav">
                <button class="btn-icon" @click="prevMonth">←</button>
                <h1>{{ monthName }} {{ currentYear }}</h1>
                <button class="btn-icon" @click="nextMonth">→</button>
            </div>
            <p class="subtitle">Shared Family Evening Meals</p>
        </header>

        <div class="calendar-grid">
            <div v-for="day in weekDays" :key="day" class="day-header">{{ day }}</div>

            <div v-for="item in calendarDays" :key="item.dateString" class="day-cell" :class="{
                'curr-month': item.isCurrentMonth,
                'is-today': item.isToday,
                'has-meal': plannedMeals[item.dateString]
            }" @click="openSelectModal(item.dateString)" @dragover.prevent @drop="onDrop($event, item.dateString)">
                <span class="day-number">{{ item.day }}</span>

                <div v-if="plannedMeals[item.dateString]" class="meal-indicator" draggable="true"
                    @dragstart="onDragStart($event, item.dateString)">
                    <span class="meal-name">{{ plannedMeals[item.dateString].customMeal.name }}</span>
                    <button class="btn-remove" @click.stop="removeMeal(item.dateString)">×</button>
                </div>
            </div>
        </div>

        <!-- Modal for picking meal -->
        <Transition name="fade">
            <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Plan Evening Meal</h3>
                        <button class="btn-close" @click="showModal = false">×</button>
                    </div>
                    <p class="modal-date">{{ selectedDate }}</p>

                    <div class="meal-list">
                        <input v-model="search" type="text" placeholder="Search meals..." class="form-input" />

                        <div v-for="meal in filteredMeals" :key="meal.id" class="meal-item" @click="selectMeal(meal)">
                            <div class="meal-info">
                                <span class="meal-title">{{ meal.name }}</span>
                                <span class="meal-sub">{{ Math.round(meal.calories) }} kcal</span>
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

// Calendar state
const viewDate = ref(new Date());
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const currentMonth = computed(() => viewDate.value.getMonth());
const currentYear = computed(() => viewDate.value.getFullYear());
const monthName = computed(() => new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(viewDate.value));

const calendarDays = computed(() => {
    const days = [];
    const start = new Date(currentYear.value, currentMonth.value, 1);
    const end = new Date(currentYear.value, currentMonth.value + 1, 0);

    // Pad start to Monday (0=Sun, 1=Mon... 6=Sat)
    let startPadding = start.getDay();
    startPadding = startPadding === 0 ? 6 : startPadding - 1; // Convert to Mon-based

    for (let i = startPadding; i > 0; i--) {
        const d = new Date(currentYear.value, currentMonth.value, 1 - i);
        days.push({ day: d.getDate(), dateString: formatDate(d), isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= end.getDate(); i++) {
        const d = new Date(currentYear.value, currentMonth.value, i);
        days.push({
            day: i,
            dateString: formatDate(d),
            isCurrentMonth: true,
            isToday: formatDate(d) === formatDate(new Date())
        });
    }

    // Pad end to fill 42 cells (6 rows)
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
        const d = new Date(currentYear.value, currentMonth.value + 1, i);
        days.push({ day: d.getDate(), dateString: formatDate(d), isCurrentMonth: false });
    }

    return days;
});

const formatDate = (date) => date.toISOString().split('T')[0];

const filteredMeals = computed(() => {
    const s = search.value.toLowerCase();
    return customMeals.value.filter(m => m.name.toLowerCase().includes(s));
});

// Navigation
const prevMonth = () => { viewDate.value = new Date(currentYear.value, currentMonth.value - 1, 1); fetchPlannedMeals(); };
const nextMonth = () => { viewDate.value = new Date(currentYear.value, currentMonth.value + 1, 1); fetchPlannedMeals(); };

// Actions
const fetchCustomMeals = async () => {
    try {
        const { data } = await api.get('/custom-meals');
        customMeals.value = data.value || [];
    } catch (err) { console.error(err); }
};

const fetchPlannedMeals = async () => {
    const days = calendarDays.value;
    const start = days[0].dateString;
    const end = days[days.length - 1].dateString;

    try {
        const { data } = await api.get(`/calendar?start=${start}&end=${end}`);
        const meals = {};
        (data.value || []).forEach(m => {
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
        const { data } = await api.post('/calendar', {
            date: selectedDate.value,
            customMealId: meal.id
        });
        plannedMeals.value[selectedDate.value] = data.value;
        showModal.value = false;
    } catch (err) { console.error(err); }
};

const removeMeal = async (date) => {
    if (!confirm('Remove this meal?')) return;
    try {
        await api.delete(`/calendar/${date}`);
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
        const { data } = await api.post('/calendar', {
            date: targetDate,
            customMealId: mealEntry.customMealId
        });

        // 2. Remove old date
        await api.delete(`/calendar/${sourceDate}`);

        // 3. Update local state
        delete plannedMeals.value[sourceDate];
        plannedMeals.value[targetDate] = data.value;
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
    gap: 2rem;
}

.calendar-nav h1 {
    font-size: 1.5rem;
    color: var(--text-primary);
    min-width: 180px;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--border-glass);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.day-header {
    background: var(--bg-card);
    padding: 0.75rem 0.25rem;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
}

.day-cell {
    background: var(--bg-secondary);
    aspect-ratio: 1 / 1.1;
    padding: 0.5rem;
    position: relative;
    transition: background var(--transition-fast);
    cursor: pointer;
    min-height: 80px;
}

.day-cell:hover {
    background: var(--bg-card-hover);
}

.day-cell.curr-month {
    background: var(--bg-card);
}

.day-cell.is-today .day-number {
    background: var(--accent-indigo);
    color: white;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

.day-number {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
}

.day-cell.curr-month .day-number {
    color: var(--text-primary);
}

.meal-indicator {
    margin-top: 0.5rem;
    background: var(--accent-indigo-glow);
    border: 1px solid var(--accent-indigo);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.4rem;
    font-size: 0.7rem;
    color: var(--accent-indigo);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.25rem;
    line-height: 1.2;
}

.meal-name {
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
}

.btn-remove {
    background: none;
    border: none;
    color: inherit;
    font-size: 1rem;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    opacity: 0.7;
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

.meal-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.meal-title {
    font-weight: 500;
    font-size: 0.95rem;
}

.meal-sub {
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
