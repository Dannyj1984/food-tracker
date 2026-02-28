<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Add Food</h1>
    </div>

    <!-- Scanner + Search -->
    <div v-if="!scannedFood" class="card mb-2">
      <div id="barcode-scanner" class="scanner-container"></div>
      <div class="form-group mt-1">
        <label class="form-label">Search by name or scan / enter barcode</label>
        <div style="display: flex; gap: 0.5rem;">
          <input v-model="searchQuery" type="text" class="form-input" placeholder="e.g. banana or 5060292302201"
            @keyup.enter="searchFood" />
          <button class="btn btn-primary" @click="searchFood" :disabled="lookupLoading">Go</button>
        </div>
      </div>

      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="search-results mt-1">
        <div class="text-sm text-muted mb-1" style="padding: 0 0.1rem;">{{ searchResults.length }} results — tap to
          select</div>
        <div v-for="(result, i) in searchResults" :key="i" class="search-result-row" @click="selectResult(result)">
          <div class="search-result-info">
            <div class="search-result-name">{{ result.food.name }}</div>
            <div class="search-result-meta">
              <span v-if="result.food.brand" class="search-result-brand">{{ result.food.brand }} · </span>
              {{ result.food.caloriesPer100g }} kcal · P{{ result.food.proteinPer100g }}g C{{ result.food.carbsPer100g
              }}g F{{ result.food.fatPer100g }}g
            </div>
          </div>
          <span class="search-result-chevron">›</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="lookupLoading" class="loading-center">
      <div class="spinner"></div>
    </div>

    <!-- Not Found -->
    <div v-if="notFound" class="card mb-2">
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">"<strong>{{ lastSearchTerm }}</strong>" not found</div>
      </div>
      <button class="btn btn-primary btn-block mt-1" @click="goToCustomAdd">
        Add food manually
      </button>
      <button class="btn btn-secondary btn-block mt-1" @click="resetScanner">
        Search again
      </button>
    </div>

    <!-- Food Found — Add to Log -->
    <div v-if="scannedFood" class="card mb-2">
      <h2 class="card-title mb-1">{{ scannedFood.name }}</h2>
      <p v-if="scannedFood.brand" class="text-sm text-muted mb-1">{{ scannedFood.brand }}</p>

      <div class="macro-grid mb-2">
        <div class="macro-item">
          <span class="macro-value" style="color: var(--accent-amber);">{{ scannedFood.caloriesPer100g }}</span>
          <span class="macro-label">kcal/100g</span>
        </div>
        <div class="macro-item">
          <span class="macro-value protein">{{ scannedFood.proteinPer100g }}g</span>
          <span class="macro-label">Protein</span>
        </div>
        <div class="macro-item">
          <span class="macro-value carbs">{{ scannedFood.carbsPer100g }}g</span>
          <span class="macro-label">Carbs</span>
        </div>
        <div class="macro-item">
          <span class="macro-value fat">{{ scannedFood.fatPer100g }}g</span>
          <span class="macro-label">Fat</span>
        </div>
      </div>

      <form @submit.prevent="addToLog">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Quantity (g)</label>
            <input v-model.number="quantity" type="number" class="form-input" min="1" max="5000" required />
          </div>
          <div class="form-group">
            <label class="form-label">Meal Type</label>
            <select v-model="mealType" class="form-select" required>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
        </div>

        <div v-if="quantity" class="card mb-1" style="padding: 0.75rem;">
          <div class="text-sm text-muted mb-1">Nutrition for {{ quantity }}g:</div>
          <div class="macro-grid">
            <div class="macro-item">
              <span class="macro-value" style="color: var(--accent-amber);">{{ calcNutrient(scannedFood.caloriesPer100g)
              }}</span>
              <span class="macro-label">kcal</span>
            </div>
            <div class="macro-item">
              <span class="macro-value protein">{{ calcNutrient(scannedFood.proteinPer100g) }}g</span>
              <span class="macro-label">Protein</span>
            </div>
            <div class="macro-item">
              <span class="macro-value carbs">{{ calcNutrient(scannedFood.carbsPer100g) }}g</span>
              <span class="macro-label">Carbs</span>
            </div>
            <div class="macro-item">
              <span class="macro-value fat">{{ calcNutrient(scannedFood.fatPer100g) }}g</span>
              <span class="macro-label">Fat</span>
            </div>
          </div>
        </div>

        <div v-if="addError" class="alert alert-error">{{ addError }}</div>
        <div v-if="addSuccess" class="alert alert-success">Added to {{ mealType }}! ✓</div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="addLoading">
          <span v-if="addLoading" class="spinner"></span>
          <span v-else>Add to Log</span>
        </button>

        <button type="button" class="btn btn-secondary btn-block mt-1" @click="resetScanner">
          Search again
        </button>
      </form>
    </div>

    <!-- Recent Items -->
    <div class="card mb-2">
      <div class="section-toggle" @click="recentExpanded = !recentExpanded">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span>🕐 Recent Items</span>
          <span v-if="recentItems.length > 0" class="count-badge">{{ recentItems.length }}</span>
        </div>
        <span class="toggle-chevron" :class="{ open: recentExpanded }">›</span>
      </div>

      <Transition name="section-expand">
        <div v-if="recentExpanded" class="recent-list">
          <div v-if="recentLoading" class="loading-center" style="padding: 0.75rem 0;">
            <div class="spinner"></div>
          </div>
          <div v-else-if="recentItems.length === 0" class="empty-state" style="padding: 0.75rem 0;">
            <div class="text-sm text-muted">No items logged in the last 7 days</div>
          </div>
          <div v-else>
            <div v-for="(item, i) in recentItems" :key="i" class="recent-row">
              <div class="recent-info" @click="selectRecentItem(item)">
                <div class="recent-name">{{ item.name }}</div>
                <div class="recent-meta">
                  {{ item.caloriesPer100g }} kcal · P{{ item.proteinPer100g }}g C{{ item.carbsPer100g }}g F{{
                    item.fatPer100g }}g
                </div>
              </div>
              <div class="quick-add-wrapper">
                <button class="quick-add-btn" @click.stop="showRecentMenu(i, $event)" title="Quick add">＋</button>
              </div>
            </div>
            <div v-if="recentAddSuccess" class="alert alert-success mt-1">{{ recentAddSuccess }}</div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Recent meal-type menu (Teleported to body so it escapes all stacking contexts) -->
    <Teleport to="body">
      <div v-if="recentMenuIdx !== null" class="recent-floating-menu"
        :style="{ top: recentMenuPos.y + 'px', left: recentMenuPos.x + 'px' }" @click.stop>
        <button v-for="mt in mealTypeOptions" :key="mt.key" class="meal-type-option"
          @click="quickAddRecent(recentItems[recentMenuIdx], mt.key)">
          <span>{{ mt.icon }}</span> {{ mt.label }}
        </button>
      </div>
    </Teleport>

    <!-- Custom Meals Section -->
    <div class="card mb-2">
      <div class="section-toggle" @click="mealsExpanded = !mealsExpanded">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span>🍽️ My Meals</span>
          <span v-if="customMeals.length > 0" class="count-badge">{{ customMeals.length }}</span>
        </div>
        <span class="toggle-chevron" :class="{ open: mealsExpanded }">›</span>
      </div>

      <Transition name="section-expand">
        <div v-if="mealsExpanded">
          <div v-if="mealsLoading" class="loading-center" style="padding: 0.75rem 0;">
            <div class="spinner"></div>
          </div>

          <div v-else-if="customMeals.length === 0" class="empty-state" style="padding: 0.75rem 0;">
            <div class="text-sm text-muted">No custom meals yet</div>
            <NuxtLink to="/custom-meals" class="btn btn-secondary mt-1" style="font-size: 0.75rem;">Create one
            </NuxtLink>
          </div>

          <div v-else class="custom-meals-list">
            <div v-for="meal in customMeals" :key="meal.id" class="custom-meal-row">
              <div class="fav-container">
                <button class="fav-btn" style="font-size: 25px" :class="{ active: meal.isFavourite }"
                  @click="toggleFav(meal, $event)" title="Toggle favourite">
                  {{ meal.isFavourite ? '❤️' : '🤍' }}
                </button>
              </div>

              <div class="custom-meal-info" @click="showMealMenu(meal, $event)">
                <div class="custom-meal-name">{{ meal.name }}</div>
                <div class="custom-meal-meta">
                  {{ Number(meal.servingSizeG) }}g · {{ Math.round(Number(meal.calories)) }} kcal ·
                  P{{ Math.round(Number(meal.protein)) }} C{{ Math.round(Number(meal.carbs)) }} F{{
                    Math.round(Number(meal.fat)) }}
                </div>
              </div>

              <div class="quick-add-wrapper">
                <button class="quick-add-btn" @click.stop="showMealMenu(meal, $event)" title="Quick add">＋</button>
              </div>
            </div>
          </div>

          <div v-if="mealAddSuccess" class="alert alert-success mt-1">{{ mealAddSuccess }}</div>
        </div>
      </Transition>
    </div>

    <!-- My Meals meal-type menu (Teleported to body — smart flip positioning) -->
    <Teleport to="body">
      <div v-if="menuMealId !== null" class="recent-floating-menu"
        :style="{ top: mealMenuPos.y + 'px', left: mealMenuPos.x + 'px' }" @click.stop>
        <button v-for="mt in mealTypeOptions" :key="mt.key" class="meal-type-option"
          @click="quickAddMeal(mealMenuActiveMeal, mt.key)">
          <span>{{ mt.icon }}</span> {{ mt.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const api = useApi();
const route = useRoute();

const searchQuery = ref('');
const lastSearchTerm = ref('');
const lastScannedCode = ref('');
const searchResults = ref([]);
const scannedFood = ref(null);
const scannedSource = ref('');
const notFound = ref(false);
const lookupLoading = ref(false);
const quantity = ref(100);
const mealType = ref(route.query.meal || 'snack');
const addLoading = ref(false);
const addError = ref('');
const addSuccess = ref(false);

// Recent items
const recentItems = ref([]);
const recentLoading = ref(false);
const recentExpanded = ref(false);
const recentMenuIdx = ref(null);
const recentMenuPos = ref({ x: 0, y: 0 });
const recentAddSuccess = ref('');

// Meal type context menu
const menuMealId = ref(null);
const mealTypeOptions = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '🌞' },
  { key: 'dinner', label: 'Dinner', icon: '🌇' },
  { key: 'snack', label: 'Snack', icon: '🍿' },
];

// Custom meals
const customMeals = ref([]);
const mealsLoading = ref(true);
const mealsExpanded = ref(false);
const mealAddSuccess = ref('');

let scanner = null;

function calcNutrient(per100g) {
  return Math.round((Number(per100g) * quantity.value / 100) * 10) / 10;
}

async function doBarcodeLookup(code) {
  lookupLoading.value = true;
  scannedFood.value = null;
  notFound.value = false;
  searchResults.value = [];
  addSuccess.value = false;
  addError.value = '';
  lastScannedCode.value = code;
  lastSearchTerm.value = code;

  try {
    const result = await api.get(`/api/foods/barcode/${code}`);
    scannedFood.value = result.food;
    scannedSource.value = result.source;
    quantity.value = result.food.servingSizeG || 100;
    stopScanner();
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('404')) {
      notFound.value = true;
      stopScanner();
    } else {
      addError.value = err.message;
    }
  } finally {
    lookupLoading.value = false;
  }
}

async function searchFood() {
  const q = searchQuery.value.trim();
  if (!q) return;

  // Pure barcode — digits only, 4-20 chars
  if (/^\d{4,20}$/.test(q)) {
    return doBarcodeLookup(q);
  }

  // Text search
  lookupLoading.value = true;
  notFound.value = false;
  scannedFood.value = null;
  searchResults.value = [];
  addError.value = '';
  lastSearchTerm.value = q;

  try {
    const results = await api.get(`/api/foods/search?q=${encodeURIComponent(q)}`);
    if (results.length === 0) {
      notFound.value = true;
      stopScanner();
    } else {
      searchResults.value = results;
    }
  } catch (err) {
    addError.value = err.message;
  } finally {
    lookupLoading.value = false;
  }
}

function selectResult(result) {
  scannedFood.value = result.food;
  scannedSource.value = result.source;
  quantity.value = result.food.servingSizeG || 100;
  searchResults.value = [];
  stopScanner();
}

function lookupManual() {
  searchFood();
}

async function addToLog() {
  addLoading.value = true;
  addError.value = '';
  addSuccess.value = false;

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const food = scannedFood.value;

  try {
    await api.post('/api/food-log', {
      date: now.toISOString().split('T')[0],
      time,
      mealType: mealType.value,
      source: scannedSource.value,
      sourceId: food.barcode || String(food.id || ''),
      name: food.name,
      quantityG: quantity.value,
      calories: calcNutrient(food.caloriesPer100g),
      fat: calcNutrient(food.fatPer100g),
      saturatedFat: calcNutrient(food.saturatedFatPer100g),
      carbs: calcNutrient(food.carbsPer100g),
      sugars: calcNutrient(food.sugarsPer100g),
      fiber: calcNutrient(food.fiberPer100g),
      protein: calcNutrient(food.proteinPer100g),
      salt: calcNutrient(food.saltPer100g),
      caffeine: food.caffeinePer100g ? calcNutrient(food.caffeinePer100g) : null,
    });
    addSuccess.value = true;
  } catch (err) {
    addError.value = err.message;
  } finally {
    addLoading.value = false;
  }
}

// Recent items
async function fetchRecentItems() {
  recentLoading.value = true;
  try {
    recentItems.value = await api.get('/api/food-log/recent?days=7');
  } catch (err) {
    console.error('Failed to load recent items:', err);
  } finally {
    recentLoading.value = false;
  }
}

function showRecentMenu(idx, event) {
  if (recentMenuIdx.value === idx) {
    recentMenuIdx.value = null;
    return;
  }
  // Position the teleported menu below the button
  const rect = event.currentTarget.getBoundingClientRect();
  const menuWidth = 150;
  recentMenuPos.value = {
    x: Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    y: rect.bottom + 6,
  };
  recentMenuIdx.value = idx;
}

function selectRecentItem(item) {
  scannedFood.value = {
    barcode: item.sourceId,
    name: item.name,
    brand: null,
    servingSizeG: item.servingSizeG,
    caloriesPer100g: item.caloriesPer100g,
    fatPer100g: item.fatPer100g,
    saturatedFatPer100g: item.saturatedFatPer100g,
    carbsPer100g: item.carbsPer100g,
    sugarsPer100g: item.sugarsPer100g,
    fiberPer100g: item.fiberPer100g,
    proteinPer100g: item.proteinPer100g,
    saltPer100g: item.saltPer100g,
    caffeinePer100g: item.caffeinePer100g,
  };
  scannedSource.value = item.source;
  quantity.value = item.servingSizeG || 100;
  recentExpanded.value = false;
  stopScanner();
}

async function quickAddRecent(item, type) {
  recentMenuIdx.value = null;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const qty = item.servingSizeG || 100;
  const calc = (per100g) => Math.round((Number(per100g) * qty / 100) * 10) / 10;

  try {
    await api.post('/api/food-log', {
      date: now.toISOString().split('T')[0],
      time,
      mealType: type,
      source: item.source,
      sourceId: item.sourceId,
      name: item.name,
      quantityG: qty,
      calories: calc(item.caloriesPer100g),
      fat: calc(item.fatPer100g),
      saturatedFat: calc(item.saturatedFatPer100g),
      carbs: calc(item.carbsPer100g),
      sugars: calc(item.sugarsPer100g),
      fiber: calc(item.fiberPer100g),
      protein: calc(item.proteinPer100g),
      salt: calc(item.saltPer100g),
      caffeine: item.caffeinePer100g ? calc(item.caffeinePer100g) : null,
    });
    recentAddSuccess.value = `${item.name} added to ${type}! ✓`;
    setTimeout(() => { recentAddSuccess.value = ''; }, 3000);
  } catch (err) {
    console.error('Failed to quick-add recent item:', err);
  }
}

// Custom meals
async function fetchMeals() {
  mealsLoading.value = true;
  try {
    customMeals.value = await api.get('/api/custom-meals');
  } catch (err) {
    console.error('Failed to load meals:', err);
  } finally {
    mealsLoading.value = false;
  }
}

async function toggleFav(meal, event) {
  // Inject keyframes once
  if (!document.getElementById('flutter-keyframes')) {
    const style = document.createElement('style');
    style.id = 'flutter-keyframes';
    style.textContent = `
      @keyframes flutterUp {
        0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        100% { opacity: 0; transform: translate(calc(-50% + var(--fx)), -50px) scale(0.5); }
      }
    `;
    document.head.appendChild(style);
  }

  // Spawn 3 flutter hearts
  const container = event.currentTarget.closest('.fav-container');
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement('span');
    heart.textContent = '❤️';
    const xDrift = `${(Math.random() - 0.5) * 36}px`;
    Object.assign(heart.style, {
      position: 'absolute',
      left: '50%',
      bottom: '60%',
      fontSize: '0.65rem',
      pointerEvents: 'none',
      opacity: '1',
      zIndex: '10',
      animation: `flutterUp 1.2s ease-out ${i * 150}ms forwards`,
    });
    heart.style.setProperty('--fx', xDrift);
    container.appendChild(heart);
    setTimeout(() => heart.remove(), 1600);
  }

  try {
    const updated = await api.patch(`/api/custom-meals/${meal.id}/favourite`, {});
    const idx = customMeals.value.findIndex(m => m.id === meal.id);
    if (idx !== -1) customMeals.value[idx] = updated;
    customMeals.value.sort((a, b) => {
      if (a.isFavourite !== b.isFavourite) return b.isFavourite ? 1 : -1;
      return 0;
    });
  } catch (err) {
    console.error('Failed to toggle favourite:', err);
  }
}

const mealMenuActiveMeal = ref(null);
const mealMenuPos = ref({ x: 0, y: 0 });

function showMealMenu(meal, event) {
  if (menuMealId.value === meal.id) {
    menuMealId.value = null;
    mealMenuActiveMeal.value = null;
    return;
  }
  const MENU_HEIGHT = 186; // 4 options * ~40px + padding
  const MENU_WIDTH = 150;
  const rect = event.currentTarget.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const y = spaceBelow < MENU_HEIGHT + 10
    ? rect.top - MENU_HEIGHT - 6   // flip above
    : rect.bottom + 6;             // open below
  mealMenuPos.value = {
    x: Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
    y,
  };
  mealMenuActiveMeal.value = meal;
  menuMealId.value = meal.id;
}

function closeMealMenu() {
  menuMealId.value = null;
}

async function quickAddMeal(meal, type) {
  menuMealId.value = null;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const servG = Number(meal.servingSizeG);

  try {
    await api.post('/api/food-log', {
      date: now.toISOString().split('T')[0],
      time,
      mealType: type,
      source: 'custom_meal',
      sourceId: String(meal.id),
      name: meal.name,
      quantityG: servG,
      calories: Number(meal.calories),
      fat: Number(meal.fat),
      saturatedFat: Number(meal.saturatedFat),
      carbs: Number(meal.carbs),
      sugars: Number(meal.sugars),
      fiber: Number(meal.fiber),
      protein: Number(meal.protein),
      salt: Number(meal.salt),
      caffeine: meal.caffeine ? Number(meal.caffeine) : null,
    });
    mealAddSuccess.value = `${meal.name} added to ${type}! ✓`;
    setTimeout(() => { mealAddSuccess.value = ''; }, 3000);
  } catch (err) {
    console.error('Failed to add meal:', err);
  }
}

function goToCustomAdd() {
  navigateTo(`/custom-foods`);
}

function stopScanner() {
  if (scanner) {
    try { scanner.stop().catch(() => { }); } catch { /* not running */ }
    scanner = null;
  }
}

function resetScanner() {
  scannedFood.value = null;
  notFound.value = false;
  searchQuery.value = '';
  searchResults.value = [];
  addSuccess.value = false;
  addError.value = '';
  nextTick(() => initScanner());
}

async function initScanner() {
  if (!import.meta.client) return;

  const { Html5Qrcode } = await import('html5-qrcode');
  scanner = new Html5Qrcode('barcode-scanner');

  try {
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        doBarcodeLookup(decodedText);
      },
      () => { } // ignore errors during scanning
    );
  } catch (err) {
    console.warn('Camera not available:', err);
  }
}

function onClickOutside(e) {
  if (menuMealId.value && !e.target.closest('.recent-floating-menu')) {
    menuMealId.value = null;
    mealMenuActiveMeal.value = null;
  }
  if (recentMenuIdx.value !== null && !e.target.closest('.recent-floating-menu')) {
    recentMenuIdx.value = null;
  }
}

onMounted(() => {
  initScanner();
  fetchMeals();
  fetchRecentItems();
  document.addEventListener('click', onClickOutside);
});

onUnmounted(() => {
  stopScanner();
  document.removeEventListener('click', onClickOutside);
});
</script>

<style scoped>
/* ---- Recent Items ---- */
.section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  padding: 0.1rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.section-toggle:hover {
  color: var(--accent-indigo);
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-indigo-glow);
  color: var(--accent-indigo);
  border: 1px solid var(--accent-indigo);
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
}

.toggle-chevron {
  font-size: 1.3rem;
  color: var(--text-muted);
  transition: transform 0.25s ease;
  display: inline-block;
}

.toggle-chevron.open {
  transform: rotate(90deg);
}

.recent-list {
  overflow: visible;
}


.recent-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border-glass);
}

.recent-row:last-child {
  border-bottom: none;
}

.recent-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.recent-info:hover .recent-name {
  color: var(--accent-indigo);
}

.recent-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-fast);
}

.recent-meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}

/* Expand / collapse transition */
.section-expand-enter-active,
.section-expand-leave-active {
  transition: opacity 0.2s ease, max-height 0.3s ease;
  max-height: 600px;
  overflow: hidden;
  /* only clip during the animation itself */
}

.section-expand-enter-from,
.section-expand-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

/* ---- Existing styles below ---- */
.search-results {
  border-top: 1px solid var(--border-glass);
  padding-top: 0.5rem;
}

.search-result-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.25rem;
  border-bottom: 1px solid var(--border-glass);
  cursor: pointer;
  transition: background var(--transition-fast);
  border-radius: var(--radius-md);
}

.search-result-row:last-child {
  border-bottom: none;
}

.search-result-row:hover,
.search-result-row:active {
  background: var(--bg-glass);
}

.search-result-info {
  flex: 1;
  min-width: 0;
}

.search-result-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-brand {
  color: var(--accent-indigo);
}

.search-result-chevron {
  color: var(--text-muted);
  font-size: 1.2rem;
  flex-shrink: 0;
}

.custom-meals-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.custom-meal-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--border-glass);
}

.custom-meal-row:last-child {
  border-bottom: none;
}

.custom-meal-info {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.custom-meal-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.custom-meal-meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}

.fav-container {
  position: relative;
  overflow: visible;
}

.fav-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: transform 0.2s ease;
}

.fav-btn:active {
  transform: scale(1.3);
}

.quick-add-wrapper {
  position: relative;
}

.quick-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: var(--accent-green-glow, rgba(52, 211, 153, 0.1));
  color: var(--accent-green);
  border: 1px solid var(--accent-green);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  padding-bottom: 2px;
}

.quick-add-btn:hover {
  background: var(--accent-green);
  color: white;
}

.meal-type-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  background: var(--bg-card, #1e1e2e);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg, 12px);
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  z-index: 50;
  min-width: 140px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  animation: menuFadeIn 0.15s ease-out;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.meal-type-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 0.8rem;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: background var(--transition-fast);
  white-space: nowrap;
}

.meal-type-option:hover {
  background: var(--bg-glass, rgba(255, 255, 255, 0.05));
}
</style>

<!-- Global: teleported menu lives outside the scoped DOM tree -->
<style>
.recent-floating-menu {
  position: fixed;
  z-index: 9999;
  background: var(--bg-card, #1e1e2e);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg, 12px);
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 150px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  animation: menuFadeIn 0.15s ease-out;
}

.recent-floating-menu .meal-type-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 0.8rem;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
  width: 100%;
  text-align: left;
}

.recent-floating-menu .meal-type-option:hover {
  background: var(--bg-glass, rgba(255, 255, 255, 0.05));
}
</style>
