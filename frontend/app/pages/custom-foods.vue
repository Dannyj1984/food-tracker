<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Custom Foods</h1>
      <button class="btn btn-primary btn-sm" @click="showForm = true">+ Add</button>
    </div>

    <div v-if="loading" class="loading-center">
      <div class="spinner"></div>
    </div>

    <!-- Food List -->
    <div v-else>
      <div v-if="foods.length === 0" class="empty-state">
        <div class="empty-state-icon">🥫</div>
        <div class="empty-state-text">No custom foods yet. Add one when a barcode isn't found.</div>
      </div>

      <div v-for="food in foods" :key="food.id" class="log-entry">
        <div class="log-entry-info">
          <div class="log-entry-name">{{ food.name }}</div>
          <div class="log-entry-meta">
            {{ food.brand || 'No brand' }} · {{ Number(food.caloriesPer100g) }} kcal/100g
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" @click="editFood(food)">Edit</button>
        <button class="log-entry-delete" @click="deleteFood(food.id)">✕</button>
      </div>
    </div>

    <!-- Inline Form (Modal) -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="card modal-content">
        <h2 class="card-title mb-1">{{ editing ? 'Edit Food' : 'Add Custom Food' }}</h2>

        <div v-if="formError" class="alert alert-error">{{ formError }}</div>

        <form @submit.prevent="saveFood">
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input v-model="form.name" class="form-input" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Brand</label>
              <input v-model="form.brand" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Barcode</label>
              <input v-model="form.barcode" class="form-input" inputmode="numeric" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Serving Size (g) *</label>
            <input v-model.number="form.servingSizeG" type="number" class="form-input" min="0.1" step="0.1" required />
          </div>

          <p class="text-sm text-muted mb-1">Nutrition per 100g:</p>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Calories *</label>
              <input v-model.number="form.caloriesPer100g" type="number" class="form-input" min="0" step="0.1"
                required />
            </div>
            <div class="form-group">
              <label class="form-label">Protein (g) *</label>
              <input v-model.number="form.proteinPer100g" type="number" class="form-input" min="0" step="0.1"
                required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Carbs (g) *</label>
              <input v-model.number="form.carbsPer100g" type="number" class="form-input" min="0" step="0.1" required />
            </div>
            <div class="form-group">
              <label class="form-label">Sugars (g) *</label>
              <input v-model.number="form.sugarsPer100g" type="number" class="form-input" min="0" step="0.1" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fat (g) *</label>
              <input v-model.number="form.fatPer100g" type="number" class="form-input" min="0" step="0.1" required />
            </div>
            <div class="form-group">
              <label class="form-label">Saturated Fat (g) *</label>
              <input v-model.number="form.saturatedFatPer100g" type="number" class="form-input" min="0" step="0.1"
                required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fiber (g) *</label>
              <input v-model.number="form.fiberPer100g" type="number" class="form-input" min="0" step="0.1" required />
            </div>
            <div class="form-group">
              <label class="form-label">Salt (g) *</label>
              <input v-model.number="form.saltPer100g" type="number" class="form-input" min="0" step="0.01" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Caffeine (mg/100g)</label>
            <input v-model.number="form.caffeinePer100g" type="number" class="form-input" min="0" step="0.1" />
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button type="submit" class="btn btn-primary" style="flex:1;" :disabled="saving">
              {{ saving ? 'Saving...' : (editing ? 'Update' : 'Save') }}
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
const route = useRoute();

const loading = ref(false);
const foods = ref([]);
const showForm = ref(false);
const editing = ref(null);
const saving = ref(false);
const formError = ref('');

const defaultForm = {
  name: '', brand: '', barcode: '', servingSizeG: 100,
  caloriesPer100g: 0, fatPer100g: 0, saturatedFatPer100g: 0,
  carbsPer100g: 0, sugarsPer100g: 0, fiberPer100g: 0,
  proteinPer100g: 0, saltPer100g: 0, caffeinePer100g: null,
};

const form = ref({ ...defaultForm });

async function fetchFoods() {
  loading.value = true;
  try {
    foods.value = await api.get('/api/custom-foods');
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function editFood(food) {
  editing.value = food.id;
  form.value = {
    name: food.name,
    brand: food.brand || '',
    barcode: food.barcode || '',
    servingSizeG: Number(food.servingSizeG),
    caloriesPer100g: Number(food.caloriesPer100g),
    fatPer100g: Number(food.fatPer100g),
    saturatedFatPer100g: Number(food.saturatedFatPer100g),
    carbsPer100g: Number(food.carbsPer100g),
    sugarsPer100g: Number(food.sugarsPer100g),
    fiberPer100g: Number(food.fiberPer100g),
    proteinPer100g: Number(food.proteinPer100g),
    saltPer100g: Number(food.saltPer100g),
    caffeinePer100g: food.caffeinePer100g ? Number(food.caffeinePer100g) : null,
  };
  showForm.value = true;
}

async function saveFood() {
  saving.value = true;
  formError.value = '';
  try {
    const data = { ...form.value };
    if (!data.barcode) data.barcode = null;
    if (!data.caffeinePer100g) data.caffeinePer100g = null;

    if (editing.value) {
      await api.put(`/api/custom-foods/${editing.value}`, data);
    } else {
      await api.post('/api/custom-foods', data);
    }
    closeForm();
    fetchFoods();
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function deleteFood(id) {
  if (!confirm('Delete this food?')) return;
  try {
    await api.del(`/api/custom-foods/${id}`);
    foods.value = foods.value.filter(f => f.id !== id);
  } catch (err) {
    console.error(err);
  }
}

function closeForm() {
  showForm.value = false;
  editing.value = null;
  form.value = { ...defaultForm };
  formError.value = '';
}

onMounted(() => {
  // Pre-fill barcode from query param (coming from scanner not-found flow)
  if (route.query.barcode) {
    form.value.barcode = route.query.barcode;
    showForm.value = true;
  }
  fetchFoods();
});
</script>
