<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <div class="date-nav">
        <button class="date-nav-btn" @click="prevDay" title="Previous day">◀</button>
        <span class="date-nav-label" :class="{ 'is-today': isToday }">{{ formattedDate }}</span>
        <button class="date-nav-btn" @click="nextDay" :disabled="isToday" title="Next day">▶</button>
        <button v-if="!isToday" class="date-nav-today" @click="goToToday">Today</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-center">
      <div class="spinner"></div>
    </div>

    <!-- Error state -->
    <div v-else-if="loadError" class="card mb-2" style="text-align: center; padding: 2rem;">
      <div class="text-sm text-muted mb-1">⚠️ Failed to load dashboard</div>
      <button class="btn btn-primary" @click="fetchData" style="margin-top: 0.5rem;">Retry</button>
    </div>

    <template v-else>
      <!-- Calorie Progress -->
      <div class="card mb-2">
        <div style="display: flex; align-items: center; gap: 1.5rem;">
          <div class="progress-ring-container">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border-glass)" stroke-width="8" />
              <circle cx="55" cy="55" r="46" fill="none" :stroke="calorieColor" stroke-width="8" stroke-linecap="round"
                :stroke-dasharray="circumference" :stroke-dashoffset="calorieOffset" transform="rotate(-90 55 55)"
                style="transition: stroke-dashoffset 0.6s ease" />
            </svg>
            <div class="progress-ring-text">
              <span class="progress-ring-value" :style="{ color: calorieColor }">{{ netCalories }}</span>
              <span class="progress-ring-label">/ {{ settings.dailyCalorieTarget }} kcal</span>
            </div>
          </div>

          <div style="flex: 1;">
            <div class="macro-grid" style="grid-template-columns: 1fr 1fr;">
              <div class="macro-item">
                <span class="macro-value protein">{{ totalProtein }}g</span>
                <span class="macro-label">Protein</span>
              </div>
              <div class="macro-item">
                <span class="macro-value carbs">{{ totalCarbs }}g</span>
                <span class="macro-label">Carbs</span>
              </div>
              <div class="macro-item">
                <span class="macro-value fat">{{ totalFat }}g</span>
                <span class="macro-label">Fat</span>
              </div>
              <div class="macro-item">
                <span class="macro-value fiber">{{ totalFiber }}g</span>
                <span class="macro-label">Fiber</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Calorie breakdown -->
        <div class="calorie-breakdown">
          <span>🍽️ {{ totalCalories }} eaten</span>
          <span v-if="exerciseCalories > 0" style="color: var(--accent-green);">🔥 {{ exerciseCalories }} burnt</span>
          <span class="text-muted">{{ caloriesRemaining }} remaining</span>
        </div>
      </div>

      <!-- Water & Caffeine Trackers -->
      <div class="card mb-2">
        <div class="tracker-widget">
          <span class="tracker-icon">💧</span>
          <div class="tracker-content">
            <div class="tracker-value">{{ waterTotal }}ml</div>
            <div class="progress-bar" style="margin-top: 4px;">
              <div class="progress-bar-fill blue" :style="{ width: waterPercent + '%' }"></div>
            </div>
            <div class="tracker-target">/ {{ settings.dailyWaterTargetMl }}ml</div>
          </div>
          <div class="tracker-actions">
            <button class="tracker-quick-btn" @click="addWater(250)">+250</button>
            <button class="tracker-quick-btn" @click="addWater(500)">+500</button>
          </div>
        </div>

        <div class="tracker-widget" style="margin-top: 0.5rem;">
          <span class="tracker-icon">☕</span>
          <div class="tracker-content">
            <div class="tracker-value">{{ totalCaffeine }}mg</div>
            <div class="progress-bar" style="margin-top: 4px;">
              <div class="progress-bar-fill" :class="caffeinePercent > 100 ? 'red' : 'amber'"
                :style="{ width: Math.min(caffeinePercent, 100) + '%' }"></div>
            </div>
            <div class="tracker-target">/ {{ settings.dailyCaffeineTargetMg }}mg</div>
          </div>
          <div class="tracker-actions">
            <button class="tracker-quick-btn" @click="showCaffeineModal = true" title="Quick log caffeine">＋</button>
          </div>
        </div>
      </div>

      <CaffeineModal :is-visible="showCaffeineModal" :presets="settings.caffeinePresets"
        @close="showCaffeineModal = false" @logged="fetchData" />

      <!-- Exercise Summary -->
      <div v-if="exerciseEntries.length > 0" class="card mb-2">
        <div class="tracker-widget">
          <span class="tracker-icon">🏃</span>
          <div class="tracker-content">
            <div class="tracker-value" style="color: var(--accent-green);">{{ exerciseCalories }} kcal burnt</div>
            <div class="tracker-target">{{ exerciseEntries.length }} exercise{{ exerciseEntries.length !== 1 ? 's' : ''
            }}</div>
          </div>
          <NuxtLink to="/exercise" class="tracker-quick-btn">Add</NuxtLink>
        </div>
      </div>

      <!-- Drag hint -->
      <div v-if="dragActive" class="drag-hint">
        Drop on a meal section to move
      </div>

      <!-- Meal Sections -->
      <div v-for="mealType in mealTypes" :key="mealType.key" class="meal-section"
        :class="{ 'drop-target': dragOverMeal === mealType.key, 'drop-active': dragActive }"
        @dragover.prevent="onDragOver(mealType.key)" @dragleave="onDragLeave(mealType.key)"
        @drop.prevent="onDrop(mealType.key)" @touchmove.prevent="onTouchMoveZone($event, mealType.key)">
        <div class="meal-section-header">
          <span class="meal-section-icon">{{ mealType.icon }}</span>
          <span class="meal-section-title" :class="mealType.key">{{ mealType.label }}</span>
          <span class="text-sm text-muted" style="margin-left: auto;">
            {{ mealCalories(mealType.key) }} kcal
          </span>
          <NuxtLink :to="`/scan?meal=${mealType.key}`" class="meal-add-btn" title="Add food">＋</NuxtLink>
        </div>

        <div v-if="mealEntries(mealType.key).length === 0" class="log-entry" style="justify-content: center;">
          <span class="text-muted text-sm">{{ dragActive ? 'Drop here' : 'No entries yet' }}</span>
        </div>

        <div v-for="entry in mealEntries(mealType.key)" :key="entry.id" class="log-entry"
          :class="{ 'dragging': dragEntryId === entry.id }" draggable="true" @dragstart="onDragStart(entry)"
          @dragend="onDragEnd" @touchstart="onTouchStart($event, entry)" @touchend="onTouchEnd"
          @touchmove.prevent="onTouchMove($event)">
          <div class="drag-handle">⠿</div>
          <div class="log-entry-info">
            <div class="log-entry-name">{{ entry.name }}</div>
            <div class="log-entry-meta">{{ Number(entry.quantityG) }}g</div>
          </div>
          <span class="log-entry-calories">{{ Math.round(Number(entry.calories)) }} kcal</span>
          <button class="log-entry-delete" @click="deleteEntry(entry.id)" title="Remove">✕</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const api = useApi();
const modal = useModal();

// Reactive date
const currentDate = ref(new Date());
const dateStr = computed(() => currentDate.value.toISOString().split('T')[0]);
const isToday = computed(() => dateStr.value === new Date().toISOString().split('T')[0]);

const formattedDate = computed(() => currentDate.value.toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short'
}));

function prevDay() {
  const d = new Date(currentDate.value);
  d.setDate(d.getDate() - 1);
  currentDate.value = d;
  fetchData();
}

function nextDay() {
  if (isToday.value) return;
  const d = new Date(currentDate.value);
  d.setDate(d.getDate() + 1);
  currentDate.value = d;
  fetchData();
}

function goToToday() {
  currentDate.value = new Date();
  fetchData();
}

const loading = ref(false);
const loadError = ref(false);
const entries = ref([]);
const waterData = ref({ entries: [], totalMl: 0 });
const exerciseEntries = ref([]);
const exerciseCalories = ref(0);
const settings = ref({ dailyCalorieTarget: 2000, dailyWaterTargetMl: 2500, dailyCaffeineTargetMg: 400, caffeinePresets: [] });
const showCaffeineModal = ref(false);

// Drag state
const dragActive = ref(false);
const dragEntryId = ref(null);
const dragOverMeal = ref(null);
const dragSourceMeal = ref(null);

// Touch drag state
const touchTimer = ref(null);
const touchDragging = ref(false);
const touchGhost = ref(null);

const mealTypes = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '🌞' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snack', label: 'Snacks', icon: '🍿' },
];

const circumference = 2 * Math.PI * 46;

const totalCalories = computed(() => Math.round(entries.value.reduce((s, e) => s + Number(e.calories), 0)));
const netCalories = computed(() => Math.max(0, totalCalories.value - exerciseCalories.value));
const caloriesRemaining = computed(() => settings.value.dailyCalorieTarget - netCalories.value);
const totalProtein = computed(() => Math.round(entries.value.reduce((s, e) => s + Number(e.protein), 0)));
const totalCarbs = computed(() => Math.round(entries.value.reduce((s, e) => s + Number(e.carbs), 0)));
const totalFat = computed(() => Math.round(entries.value.reduce((s, e) => s + Number(e.fat), 0)));
const totalFiber = computed(() => Math.round(entries.value.reduce((s, e) => s + Number(e.fiber), 0)));
const totalCaffeine = computed(() => Math.round(entries.value.reduce((s, e) => s + Number(e.caffeine || 0), 0)));
const waterTotal = computed(() => waterData.value.totalMl);

const caloriePercent = computed(() => (netCalories.value / settings.value.dailyCalorieTarget) * 100);
const calorieOffset = computed(() => circumference - (Math.min(caloriePercent.value, 100) / 100) * circumference);
const calorieColor = computed(() => {
  if (caloriePercent.value > 110) return 'var(--accent-red)';
  if (caloriePercent.value > 90) return 'var(--accent-amber)';
  return 'var(--accent-green)';
});

const waterPercent = computed(() => (waterTotal.value / settings.value.dailyWaterTargetMl) * 100);
const caffeinePercent = computed(() => (totalCaffeine.value / settings.value.dailyCaffeineTargetMg) * 100);

function mealEntries(type) {
  return entries.value.filter(e => e.mealType === type);
}

function mealCalories(type) {
  return Math.round(mealEntries(type).reduce((s, e) => s + Number(e.calories), 0));
}

// --- Desktop Drag & Drop ---
function onDragStart(entry) {
  dragActive.value = true;
  dragEntryId.value = entry.id;
  dragSourceMeal.value = entry.mealType;
}

function onDragEnd() {
  dragActive.value = false;
  dragEntryId.value = null;
  dragOverMeal.value = null;
  dragSourceMeal.value = null;
}

function onDragOver(mealKey) {
  if (mealKey !== dragSourceMeal.value) {
    dragOverMeal.value = mealKey;
  }
}

function onDragLeave(mealKey) {
  if (dragOverMeal.value === mealKey) {
    dragOverMeal.value = null;
  }
}

function onDrop(mealKey) {
  if (dragEntryId.value && mealKey !== dragSourceMeal.value) {
    moveFoodEntry(dragEntryId.value, mealKey);
  }
  onDragEnd();
}

// --- Touch Drag (long-press) ---
function onTouchStart(e, entry) {
  const touch = e.touches[0];
  touchTimer.value = setTimeout(() => {
    touchDragging.value = true;
    dragActive.value = true;
    dragEntryId.value = entry.id;
    dragSourceMeal.value = entry.mealType;

    // Create a floating ghost element
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = entry.name;
    ghost.style.left = touch.clientX + 'px';
    ghost.style.top = touch.clientY + 'px';
    document.body.appendChild(ghost);
    touchGhost.value = ghost;

    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(30);
  }, 400); // 400ms long-press
}

function onTouchMove(e) {
  if (!touchDragging.value) {
    // Cancel long-press if finger moves before timer fires
    clearTimeout(touchTimer.value);
    return;
  }

  const touch = e.touches[0];
  if (touchGhost.value) {
    touchGhost.value.style.left = touch.clientX + 'px';
    touchGhost.value.style.top = (touch.clientY - 20) + 'px';
  }

  // Detect which meal section we're over
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (el) {
    const section = el.closest('.meal-section');
    if (section) {
      const mealKey = getMealKeyFromElement(section);
      if (mealKey && mealKey !== dragSourceMeal.value) {
        dragOverMeal.value = mealKey;
      } else {
        dragOverMeal.value = null;
      }
    } else {
      dragOverMeal.value = null;
    }
  }
}

function onTouchMoveZone(e, mealKey) {
  // passive; touch move already handles detection
}

function onTouchEnd() {
  clearTimeout(touchTimer.value);

  if (touchDragging.value && dragEntryId.value && dragOverMeal.value) {
    moveFoodEntry(dragEntryId.value, dragOverMeal.value);
  }

  // Clean up ghost
  if (touchGhost.value) {
    touchGhost.value.remove();
    touchGhost.value = null;
  }

  touchDragging.value = false;
  dragActive.value = false;
  dragEntryId.value = null;
  dragOverMeal.value = null;
  dragSourceMeal.value = null;
}

function getMealKeyFromElement(sectionEl) {
  // Find which mealType this section belongs to by checking the title class
  for (const mt of mealTypes) {
    if (sectionEl.querySelector(`.meal-section-title.${mt.key}`)) {
      return mt.key;
    }
  }
  return null;
}

// --- Move API call ---
async function moveFoodEntry(entryId, newMealType) {
  try {
    // Optimistic update
    const entry = entries.value.find(e => e.id === entryId);
    if (entry) entry.mealType = newMealType;

    await api.patch(`/api/food-log/${entryId}/meal-type`, { mealType: newMealType });
  } catch (err) {
    console.error('Failed to move entry:', err);
    // Revert on failure
    await fetchData();
  }
}

async function fetchData() {
  loading.value = true;
  loadError.value = false;
  try {
    // Timeout after 10s to prevent infinite loading
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 10000));
    const data = Promise.all([
      api.get(`/api/food-log?date=${dateStr.value}`),
      api.get(`/api/water-log?date=${dateStr.value}`),
      api.get('/api/settings'),
      api.get(`/api/exercise-log?date=${dateStr.value}`),
    ]);
    const [logData, water, settingsData, exerciseData] = await Promise.race([data, timeout]);
    entries.value = logData;
    waterData.value = water;
    settings.value = settingsData;
    exerciseEntries.value = exerciseData.entries;
    exerciseCalories.value = exerciseData.totalCaloriesBurnt;
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function addWater(amount) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  try {
    await api.post('/api/water-log', { date: dateStr.value, time, amountMl: amount });
    const water = await api.get(`/api/water-log?date=${dateStr.value}`);
    waterData.value = water;
  } catch (err) {
    console.error('Failed to add water:', err);
  }
}

async function deleteEntry(id) {
  const confirmed = await modal.confirm({
    title: 'Remove log entry?',
    message: 'Are you sure you want to delete this food entry from your log?'
  });

  if (!confirmed) return;

  try {
    await api.del(`/api/food-log/${id}`);
    entries.value = entries.value.filter(e => e.id !== id);
  } catch (err) {
    console.error('Failed to delete entry:', err);
  }
}

onMounted(fetchData);
</script>

<style scoped>
.calorie-breakdown {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-glass);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Meal add button */
.meal-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-md);
  background: var(--accent-indigo-glow);
  color: var(--accent-indigo);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 700;
  margin-left: 0.5rem;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.meal-add-btn:hover {
  background: var(--accent-indigo);
  color: white;
}

/* Date navigation */
.date-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-nav-btn {
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.65rem;
  transition: all var(--transition-fast);
}

.date-nav-btn:hover:not(:disabled) {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.date-nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.date-nav-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 7rem;
  text-align: center;
}

.date-nav-label.is-today {
  color: var(--accent-indigo);
  font-weight: 600;
}

.date-nav-today {
  background: var(--accent-indigo-glow);
  color: var(--accent-indigo);
  border: 1px solid var(--accent-indigo);
  border-radius: var(--radius-md);
  padding: 0.15rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.date-nav-today:hover {
  background: var(--accent-indigo);
  color: white;
}

/* Drag handle */
.drag-handle {
  color: var(--text-muted);
  font-size: 1rem;
  cursor: grab;
  user-select: none;
  opacity: 0.4;
  transition: opacity var(--transition-fast);
  line-height: 1;
  touch-action: none;
}

.log-entry:hover .drag-handle {
  opacity: 0.8;
}

/* Dragging state */
.log-entry.dragging {
  opacity: 0.3;
  transform: scale(0.95);
}

/* Drop target highlight */
.meal-section.drop-active {
  transition: all 200ms ease;
}

.meal-section.drop-target {
  background: var(--accent-indigo-glow);
  border-radius: var(--radius-lg);
  outline: 2px dashed var(--accent-indigo);
  outline-offset: 2px;
}

/* Drag hint banner */
.drag-hint {
  text-align: center;
  padding: 0.4rem;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: var(--accent-indigo);
  background: var(--accent-indigo-glow);
  border-radius: var(--radius-md);
  animation: pulse-hint 1.5s ease-in-out infinite;
}

@keyframes pulse-hint {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}
</style>

<style>
/* Touch drag ghost - must be global (not scoped) because it's appended to body */
.drag-ghost {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary, #111827);
  color: var(--text-primary, #f1f5f9);
  border: 1px solid var(--accent-indigo, #6366f1);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  transform: translate(-50%, -100%);
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
