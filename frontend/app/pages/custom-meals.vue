<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Custom Meals</h1>
      <button class="btn btn-primary btn-sm" @click="showForm = true">+ Add</button>
    </div>

    <div v-if="loading" class="loading-center">
      <div class="spinner"></div>
    </div>

    <div v-else>
      <div v-if="meals.length === 0" class="empty-state">
        <div class="empty-state-icon">🍽️</div>
        <div class="empty-state-text">No custom meals yet. Create one to quickly log your favourite recipes.</div>
      </div>

      <div v-for="meal in meals" :key="meal.id" class="card mb-1">
        <div class="flex justify-between items-center">
          <div>
            <div style="font-weight: 600;">{{ meal.name }}</div>
            <div class="text-sm text-muted">{{ meal.description || 'No description' }}</div>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-sm btn-primary" @click="quickAdd(meal)">+ Log</button>
            <button class="btn btn-sm btn-secondary" @click="editMeal(meal)">Edit</button>
            <button class="log-entry-delete" @click="deleteMeal(meal.id)">✕</button>
          </div>
        </div>
        <div class="macro-grid mt-1">
          <div class="macro-item">
            <span class="macro-value" style="color: var(--accent-amber);">{{ Math.round(Number(meal.calories)) }}</span>
            <span class="macro-label">kcal</span>
          </div>
          <div class="macro-item">
            <span class="macro-value protein">{{ Math.round(Number(meal.protein)) }}g</span>
            <span class="macro-label">Protein</span>
          </div>
          <div class="macro-item">
            <span class="macro-value carbs">{{ Math.round(Number(meal.carbs)) }}g</span>
            <span class="macro-label">Carbs</span>
          </div>
          <div class="macro-item">
            <span class="macro-value fat">{{ Math.round(Number(meal.fat)) }}g</span>
            <span class="macro-label">Fat</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Add Modal -->
    <div v-if="quickAddMeal" class="modal-overlay" @click.self="quickAddMeal = null">
      <div class="card modal-content">
        <h2 class="card-title mb-1">Add {{ quickAddMeal.name }}</h2>
        <form @submit.prevent="submitQuickAdd">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Servings</label>
              <input v-model.number="quickAddServings" type="number" class="form-input" min="0.5" step="0.5" />
            </div>
            <div class="form-group">
              <label class="form-label">Meal Type</label>
              <select v-model="quickAddMealType" class="form-select">
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
          </div>
          <div v-if="quickAddError" class="alert alert-error">{{ quickAddError }}</div>
          <div v-if="quickAddDone" class="alert alert-success">Added! ✓</div>
          <button type="submit" class="btn btn-primary btn-block" :disabled="quickAddLoading">
            {{ quickAddLoading ? 'Adding...' : 'Add to Log' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="card modal-content">
        <h2 class="card-title mb-1">{{ editing ? 'Edit Meal' : 'Create Meal' }}</h2>
        <div v-if="formError" class="alert alert-error">{{ formError }}</div>

        <form @submit.prevent="saveMeal">
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input v-model="form.name" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <input v-model="form.description" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Serving Size (g) *</label>
            <input v-model.number="form.servingSizeG" type="number" class="form-input" min="1" required />
          </div>

          <p class="text-sm text-muted mb-1">Nutrition per serving:</p>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Calories *</label>
              <input v-model.number="form.calories" type="number" class="form-input" min="0" step="0.1" required />
            </div>
            <div class="form-group">
              <label class="form-label">Protein (g) *</label>
              <input v-model.number="form.protein" type="number" class="form-input" min="0" step="0.1" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Carbs (g) *</label>
              <input v-model.number="form.carbs" type="number" class="form-input" min="0" step="0.1" required />
            </div>
            <div class="form-group">
              <label class="form-label">Sugars (g) *</label>
              <input v-model.number="form.sugars" type="number" class="form-input" min="0" step="0.1" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fat (g) *</label>
              <input v-model.number="form.fat" type="number" class="form-input" min="0" step="0.1" required />
            </div>
            <div class="form-group">
              <label class="form-label">Sat Fat (g) *</label>
              <input v-model.number="form.saturatedFat" type="number" class="form-input" min="0" step="0.1" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fiber (g) *</label>
              <input v-model.number="form.fiber" type="number" class="form-input" min="0" step="0.1" required />
            </div>
            <div class="form-group">
              <label class="form-label">Salt (g) *</label>
              <input v-model.number="form.salt" type="number" class="form-input" min="0" step="0.01" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Caffeine (mg)</label>
            <input v-model.number="form.caffeine" type="number" class="form-input" min="0" />
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button type="submit" class="btn btn-primary" style="flex:1;" :disabled="saving">
              {{ saving ? 'Saving...' : (editing ? 'Update' : 'Create') }}
            </button>
            <button type="button" class="btn btn-secondary" @click="closeForm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
const api = useApi();

const loading = ref(false);
const meals = ref([]);
const showForm = ref(false);
const editing = ref(null);
const saving = ref(false);
const formError = ref('');

const quickAddMeal = ref(null);
const quickAddServings = ref(1);
const quickAddMealType = ref('dinner');
const quickAddLoading = ref(false);
const quickAddError = ref('');
const quickAddDone = ref(false);

const defaultForm = {
  name: '', description: '', servingSizeG: 100,
  calories: 0, fat: 0, saturatedFat: 0, carbs: 0,
  sugars: 0, fiber: 0, protein: 0, salt: 0, caffeine: null,
};

const form = ref({ ...defaultForm });

async function fetchMeals() {
  loading.value = true;
  try {
    meals.value = await api.get('/api/custom-meals');
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function editMeal(meal) {
  editing.value = meal.id;
  form.value = {
    name: meal.name,
    description: meal.description || '',
    servingSizeG: Number(meal.servingSizeG),
    calories: Number(meal.calories),
    fat: Number(meal.fat),
    saturatedFat: Number(meal.saturatedFat),
    carbs: Number(meal.carbs),
    sugars: Number(meal.sugars),
    fiber: Number(meal.fiber),
    protein: Number(meal.protein),
    salt: Number(meal.salt),
    caffeine: meal.caffeine ? Number(meal.caffeine) : null,
  };
  showForm.value = true;
}

async function saveMeal() {
  saving.value = true;
  formError.value = '';
  try {
    const data = { ...form.value };
    if (!data.caffeine) data.caffeine = null;

    if (editing.value) {
      await api.put(`/api/custom-meals/${editing.value}`, data);
    } else {
      await api.post('/api/custom-meals', data);
    }
    closeForm();
    fetchMeals();
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function deleteMeal(id) {
  if (!confirm('Delete this meal?')) return;
  try {
    await api.del(`/api/custom-meals/${id}`);
    meals.value = meals.value.filter(m => m.id !== id);
  } catch (err) {
    console.error(err);
  }
}

function quickAdd(meal) {
  quickAddMeal.value = meal;
  quickAddServings.value = 1;
  quickAddError.value = '';
  quickAddDone.value = false;
}

async function submitQuickAdd() {
  quickAddLoading.value = true;
  quickAddError.value = '';
  const meal = quickAddMeal.value;
  const servings = quickAddServings.value;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  try {
    await api.post('/api/food-log', {
      date: now.toISOString().split('T')[0],
      time,
      mealType: quickAddMealType.value,
      source: 'custom_meal',
      sourceId: String(meal.id),
      name: meal.name,
      quantityG: Number(meal.servingSizeG) * servings,
      calories: Number(meal.calories) * servings,
      fat: Number(meal.fat) * servings,
      saturatedFat: Number(meal.saturatedFat) * servings,
      carbs: Number(meal.carbs) * servings,
      sugars: Number(meal.sugars) * servings,
      fiber: Number(meal.fiber) * servings,
      protein: Number(meal.protein) * servings,
      salt: Number(meal.salt) * servings,
      caffeine: meal.caffeine ? Number(meal.caffeine) * servings : null,
    });
    quickAddDone.value = true;
  } catch (err) {
    quickAddError.value = err.message;
  } finally {
    quickAddLoading.value = false;
  }
}

function closeForm() {
  showForm.value = false;
  editing.value = null;
  form.value = { ...defaultForm };
  formError.value = '';
}

onMounted(fetchMeals);
</script>
