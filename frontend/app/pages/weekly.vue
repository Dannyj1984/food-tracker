<template>
    <div>
        <div class="page-header">
            <h1 class="page-title">Weekly Overview</h1>
            <span class="text-sm text-muted">{{ weekLabel }}</span>
        </div>

        <div v-if="loading" class="loading-center">
            <div class="spinner"></div>
        </div>

        <template v-else>
            <!-- Calorie Overview Card -->
            <div class="card mb-2">
                <h2 class="card-title mb-1">🍽️ Calorie Overview</h2>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-value" style="color: var(--accent-amber);">{{ weeklyStats.totalCaloriesEaten
                            }}</span>
                        <span class="stat-label">Eaten</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" style="color: var(--accent-green);">{{ weeklyStats.totalCaloriesBurnt
                            }}</span>
                        <span class="stat-label">Burnt</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" style="color: var(--accent-indigo);">{{ weeklyStats.netCalories
                            }}</span>
                        <span class="stat-label">Net</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" style="color: var(--text-muted);">{{ weeklyStats.weeklyTarget }}</span>
                        <span class="stat-label">Target</span>
                    </div>
                </div>
                <div class="progress-bar mt-1">
                    <div class="progress-bar-fill" :class="weeklyCalorieBarColor"
                        :style="{ width: Math.min(weeklyCaloriePercent, 100) + '%' }"></div>
                </div>
                <div class="text-sm text-muted mt-1" style="text-align: center;">
                    {{ weeklyStats.netCalories }} / {{ weeklyStats.weeklyTarget }} kcal ({{ weeklyCaloriePercent }}%)
                </div>
            </div>

            <!-- Macro Totals -->
            <div class="card mb-2">
                <h2 class="card-title mb-1">📊 Weekly Macros</h2>
                <div class="macro-grid">
                    <div class="macro-item">
                        <span class="macro-value protein">{{ weeklyStats.protein }}g</span>
                        <span class="macro-label">Protein</span>
                    </div>
                    <div class="macro-item">
                        <span class="macro-value carbs">{{ weeklyStats.carbs }}g</span>
                        <span class="macro-label">Carbs</span>
                    </div>
                    <div class="macro-item">
                        <span class="macro-value fat">{{ weeklyStats.fat }}g</span>
                        <span class="macro-label">Fat</span>
                    </div>
                    <div class="macro-item">
                        <span class="macro-value fiber">{{ weeklyStats.fiber }}g</span>
                        <span class="macro-label">Fiber</span>
                    </div>
                </div>
            </div>

            <!-- Exercise Summary -->
            <div class="card mb-2">
                <h2 class="card-title mb-1">🏃 Exercise Summary</h2>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-value" style="color: var(--accent-green);">{{ weeklyStats.exerciseCount
                            }}</span>
                        <span class="stat-label">Sessions</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" style="color: var(--accent-amber);">{{ weeklyStats.totalCaloriesBurnt
                            }}</span>
                        <span class="stat-label">kcal Burnt</span>
                    </div>
                </div>

                <!-- HR Zone Breakdown -->
                <div v-if="hasAnyHrZone || hasAnyHrTarget" class="hr-breakdown mt-1">
                    <div class="hr-breakdown-title text-sm text-muted mb-1">Heart Rate Zones</div>

                    <!-- Individual zones -->
                    <div v-for="zone in 5" :key="zone" class="hr-zone-row">
                        <span class="hr-zone-label" :class="'zone-' + zone">Z{{ zone }}</span>
                        <span class="hr-zone-time" style="flex: 1;">{{ formatSeconds(weeklyStats.hrZones[zone - 1])
                        }}</span>
                    </div>

                    <!-- Grouped totals -->
                    <div class="hr-group-totals mt-1">
                        <div class="hr-group-row">
                            <span class="hr-group-label">Z1–3</span>
                            <div class="progress-bar" style="flex: 1;">
                                <div class="progress-bar-fill green"
                                    :style="{ width: Math.min(zone13Percent, 100) + '%' }"></div>
                            </div>
                            <span class="hr-zone-time">{{ formatSeconds(zone13TotalSecs) }} / {{
                                settings.weeklyHrZone13Mins || 0 }}m</span>
                        </div>
                        <div class="hr-group-row">
                            <span class="hr-group-label" style="color: var(--accent-red);">Z4–5</span>
                            <div class="progress-bar" style="flex: 1;">
                                <div class="progress-bar-fill red"
                                    :style="{ width: Math.min(zone45Percent, 100) + '%' }"></div>
                            </div>
                            <span class="hr-zone-time">{{ formatSeconds(zone45TotalSecs) }} / {{
                                settings.weeklyHrZone45Mins || 0 }}m</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Daily Breakdown -->
            <div class="card mb-2">
                <h2 class="card-title mb-1">📅 Daily Breakdown</h2>
                <div v-for="day in dailyBreakdown" :key="day.date" class="daily-row">
                    <div class="daily-day">
                        <span class="daily-day-name">{{ day.dayName }}</span>
                        <span class="daily-day-date text-muted">{{ day.dateLabel }}</span>
                    </div>
                    <div class="daily-stats">
                        <span class="text-sm" style="color: var(--accent-amber);">{{ day.caloriesEaten }}</span>
                        <span v-if="day.caloriesBurnt > 0" class="text-sm" style="color: var(--accent-green);">−{{
                            day.caloriesBurnt }}</span>
                    </div>
                    <span class="daily-net" :style="{ color: day.netColor }">{{ day.net }} kcal</span>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
const api = useApi();

const loading = ref(false);
const foodSummary = ref([]);
const exerciseSummary = ref([]);
const settings = ref({ dailyCalorieTarget: 2000 });

// Compute current week (Mon–Sun)
function getWeekDates() {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

const weekDates = getWeekDates();
const weekLabel = computed(() => {
    const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(weekDates[0])} – ${fmt(weekDates[6])}`;
});

const weeklyStats = computed(() => {
    const foodMap = {};
    for (const s of foodSummary.value) foodMap[s.date] = s;
    const exMap = {};
    for (const s of exerciseSummary.value) exMap[s.date] = s;

    let totalCaloriesEaten = 0, totalCaloriesBurnt = 0;
    let protein = 0, carbs = 0, fat = 0, fiber = 0;
    let exerciseCount = 0;
    const hrZones = [0, 0, 0, 0, 0];

    for (const date of weekDates) {
        const food = foodMap[date];
        const ex = exMap[date];
        if (food) {
            totalCaloriesEaten += food.calories;
            protein += food.protein;
            carbs += food.carbs;
            fat += food.fat;
            fiber += food.fiber;
        }
        if (ex) {
            totalCaloriesBurnt += ex.caloriesBurnt;
            exerciseCount += ex.exerciseCount;
            hrZones[0] += ex.hrZone1Seconds;
            hrZones[1] += ex.hrZone2Seconds;
            hrZones[2] += ex.hrZone3Seconds;
            hrZones[3] += ex.hrZone4Seconds;
            hrZones[4] += ex.hrZone5Seconds;
        }
    }

    const weeklyTarget = settings.value.dailyCalorieTarget * 7;

    return {
        totalCaloriesEaten: Math.round(totalCaloriesEaten),
        totalCaloriesBurnt: Math.round(totalCaloriesBurnt),
        netCalories: Math.round(totalCaloriesEaten - totalCaloriesBurnt),
        weeklyTarget,
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        fiber: Math.round(fiber),
        exerciseCount,
        hrZones,
    };
});

const weeklyCaloriePercent = computed(() => {
    if (weeklyStats.value.weeklyTarget === 0) return 0;
    return Math.round((weeklyStats.value.netCalories / weeklyStats.value.weeklyTarget) * 100);
});

const weeklyCalorieBarColor = computed(() => {
    if (weeklyCaloriePercent.value > 110) return 'red';
    if (weeklyCaloriePercent.value > 90) return 'amber';
    return 'green';
});

const hasAnyHrZone = computed(() => weeklyStats.value.hrZones.some(z => z > 0));
const hasAnyHrTarget = computed(() => {
    const s = settings.value;
    return (s.weeklyHrZone13Mins || 0) > 0 || (s.weeklyHrZone45Mins || 0) > 0;
});

const zone13TotalSecs = computed(() =>
    weeklyStats.value.hrZones[0] + weeklyStats.value.hrZones[1] + weeklyStats.value.hrZones[2]
);
const zone45TotalSecs = computed(() =>
    weeklyStats.value.hrZones[3] + weeklyStats.value.hrZones[4]
);

const zone13Percent = computed(() => {
    const target = settings.value.weeklyHrZone13Mins || 0;
    if (target <= 0) return 0;
    return (zone13TotalSecs.value / 60 / target) * 100;
});
const zone45Percent = computed(() => {
    const target = settings.value.weeklyHrZone45Mins || 0;
    if (target <= 0) return 0;
    return (zone45TotalSecs.value / 60 / target) * 100;
});

function formatSeconds(totalSec) {
    if (!totalSec || totalSec <= 0) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const dailyBreakdown = computed(() => {
    const foodMap = {};
    for (const s of foodSummary.value) foodMap[s.date] = s;
    const exMap = {};
    for (const s of exerciseSummary.value) exMap[s.date] = s;

    return weekDates.map(date => {
        const d = new Date(date + 'T00:00:00');
        const food = foodMap[date];
        const ex = exMap[date];
        const caloriesEaten = food ? Math.round(food.calories) : 0;
        const caloriesBurnt = ex ? Math.round(ex.caloriesBurnt) : 0;
        const net = caloriesEaten - caloriesBurnt;
        const target = settings.value.dailyCalorieTarget;
        let netColor = 'var(--text-secondary)';
        if (caloriesEaten > 0) {
            const pct = (net / target) * 100;
            if (pct > 110) netColor = 'var(--accent-red)';
            else if (pct > 90) netColor = 'var(--accent-amber)';
            else netColor = 'var(--accent-green)';
        }

        return {
            date,
            dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
            dateLabel: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            caloriesEaten,
            caloriesBurnt,
            net,
            netColor,
        };
    });
});

async function fetchData() {
    loading.value = true;
    try {
        const [foodData, exerciseData, settingsData] = await Promise.all([
            api.get('/api/food-log/summary?days=7'),
            api.get('/api/exercise-log/summary?days=7'),
            api.get('/api/settings'),
        ]);
        foodSummary.value = foodData;
        exerciseSummary.value = exerciseData;
        settings.value = settingsData;
    } catch (err) {
        console.error('Failed to load weekly data:', err);
    } finally {
        loading.value = false;
    }
}

onMounted(fetchData);
</script>

<style scoped>
.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.stat-item {
    text-align: center;
    padding: 0.75rem 0.25rem;
    background: var(--bg-glass);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
}

.stat-value {
    font-size: 1.1rem;
    font-weight: 700;
    display: block;
}

.stat-label {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.hr-breakdown {
    border-top: 1px solid var(--border-glass);
    padding-top: 0.75rem;
}

.hr-breakdown-title {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.hr-zone-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
}

.hr-zone-label {
    font-size: 0.7rem;
    font-weight: 700;
    width: 1.8rem;
    text-align: center;
}

.hr-zone-label.zone-1 {
    color: var(--accent-blue);
}

.hr-zone-label.zone-2 {
    color: var(--accent-green);
}

.hr-zone-label.zone-3 {
    color: var(--accent-amber);
}

.hr-zone-label.zone-4 {
    color: #f97316;
}

.hr-zone-label.zone-5 {
    color: var(--accent-red);
}

.hr-zone-time {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
    min-width: 5.5rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

.hr-group-totals {
    border-top: 1px solid var(--border-glass);
    padding-top: 0.75rem;
}

.hr-group-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.hr-group-label {
    font-size: 0.75rem;
    font-weight: 700;
    width: 2.2rem;
    color: var(--accent-green);
}

.daily-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--border-glass);
}

.daily-row:last-child {
    border-bottom: none;
}

.daily-day {
    min-width: 4.5rem;
}

.daily-day-name {
    font-size: 0.85rem;
    font-weight: 600;
    display: block;
}

.daily-day-date {
    font-size: 0.7rem;
}

.daily-stats {
    flex: 1;
    display: flex;
    gap: 0.5rem;
}

.daily-net {
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
}
</style>
