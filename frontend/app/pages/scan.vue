<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Add Food</h1>
    </div>

    <!-- Scanner -->
    <div v-if="!scannedFood" class="card mb-2">
      <div id="barcode-scanner" class="scanner-container"></div>
      <div class="form-group mt-1">
        <label class="form-label">Or enter barcode manually</label>
        <div style="display: flex; gap: 0.5rem;">
          <input v-model="manualBarcode" type="text" class="form-input" placeholder="e.g. 5060292302201"
            inputmode="numeric" @keyup.enter="lookupManual" />
          <button class="btn btn-primary" @click="lookupManual" :disabled="lookupLoading">Go</button>
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
        <div class="empty-state-text">Barcode <strong>{{ lastScannedCode }}</strong> not found</div>
      </div>
      <button class="btn btn-primary btn-block mt-1" @click="goToCustomAdd">
        Add food manually
      </button>
      <button class="btn btn-secondary btn-block mt-1" @click="resetScanner">
        Scan again
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
          Scan another
        </button>
      </form>
    </div>

    <!-- Custom Meals Section -->
    <div class="card mb-2">
      <h2 class="card-title mb-1">🍽️ My Meals</h2>

      <div v-if="mealsLoading" class="loading-center">
        <div class="spinner"></div>
      </div>

      <div v-else-if="customMeals.length === 0" class="empty-state" style="padding: 1rem 0;">
        <div class="text-sm text-muted">No custom meals yet</div>
        <NuxtLink to="/custom-meals" class="btn btn-secondary mt-1" style="font-size: 0.75rem;">Create one</NuxtLink>
      </div>

      <div v-else class="custom-meals-list">
        <div v-for="meal in customMeals" :key="meal.id" class="custom-meal-row">
          <div class="fav-container">
            <button class="fav-btn" style="font-size: 25px" :class="{ active: meal.isFavourite }"
              @click="toggleFav(meal, $event)" title="Toggle favourite">
              {{ meal.isFavourite ? '❤️' : '🤍' }}
            </button>
          </div>

          <div class="custom-meal-info" @click="showMealMenu(meal)">
            <div class="custom-meal-name">{{ meal.name }}</div>
            <div class="custom-meal-meta">
              {{ Number(meal.servingSizeG) }}g · {{ Math.round(Number(meal.calories)) }} kcal ·
              P{{ Math.round(Number(meal.protein)) }} C{{ Math.round(Number(meal.carbs)) }} F{{
                Math.round(Number(meal.fat)) }}
            </div>
          </div>

          <div class="quick-add-wrapper">
            <button class="quick-add-btn" @click="showMealMenu(meal)" title="Quick add">＋</button>
            <div v-if="menuMealId === meal.id" class="meal-type-menu">
              <button v-for="mt in mealTypeOptions" :key="mt.key" class="meal-type-option"
                @click="quickAddMeal(meal, mt.key)">
                <span>{{ mt.icon }}</span> {{ mt.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="mealAddSuccess" class="alert alert-success mt-1">{{ mealAddSuccess }}</div>
    </div>
  </div>
</template>

<script setup>
const api = useApi();
const route = useRoute();

const manualBarcode = ref('');
const lastScannedCode = ref('');
const scannedFood = ref(null);
const scannedSource = ref('');
const notFound = ref(false);
const lookupLoading = ref(false);
const quantity = ref(100);
const mealType = ref(route.query.meal || 'snack');
const addLoading = ref(false);
const addError = ref('');
const addSuccess = ref(false);

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
const mealAddSuccess = ref('');

let scanner = null;

function calcNutrient(per100g) {
  return Math.round((Number(per100g) * quantity.value / 100) * 10) / 10;
}

async function lookupBarcode(code) {
  lookupLoading.value = true;
  scannedFood.value = null;
  notFound.value = false;
  addSuccess.value = false;
  addError.value = '';
  lastScannedCode.value = code;

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

function lookupManual() {
  const code = manualBarcode.value.trim();
  if (code && /^\d{4,20}$/.test(code)) {
    lookupBarcode(code);
  }
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

function showMealMenu(meal) {
  menuMealId.value = menuMealId.value === meal.id ? null : meal.id;
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
  navigateTo(`/custom-foods?barcode=${lastScannedCode.value}`);
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
  manualBarcode.value = '';
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
        lookupBarcode(decodedText);
      },
      () => { } // ignore errors during scanning
    );
  } catch (err) {
    console.warn('Camera not available:', err);
  }
}

function onClickOutside(e) {
  if (menuMealId.value && !e.target.closest('.quick-add-wrapper')) {
    menuMealId.value = null;
  }
}

onMounted(() => {
  initScanner();
  fetchMeals();
  document.addEventListener('click', onClickOutside);
});

onUnmounted(() => {
  stopScanner();
  document.removeEventListener('click', onClickOutside);
});
</script>

<style scoped>
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
