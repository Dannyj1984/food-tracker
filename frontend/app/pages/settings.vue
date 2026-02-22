<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
    </div>

    <div v-if="loading" class="loading-center">
      <div class="spinner"></div>
    </div>

    <template v-else>
      <div v-if="saveSuccess" class="alert alert-success">Settings saved! ✓</div>
      <div v-if="saveError" class="alert alert-error">{{ saveError }}</div>

      <form @submit.prevent="saveSettings">
        <!-- Daily Targets -->
        <div class="card mb-2">
          <h2 class="card-title mb-1">🎯 Daily Targets</h2>

          <div class="form-group">
            <label class="form-label">Calorie Target (kcal)</label>
            <input v-model.number="form.dailyCalorieTarget" type="number" class="form-input" min="500" max="10000"
              required inputmode="numeric" />
          </div>
          <div class="form-group">
            <label class="form-label">Water Target (ml)</label>
            <input v-model.number="form.dailyWaterTargetMl" type="number" class="form-input" min="500" max="10000"
              required inputmode="numeric" />
          </div>
          <div class="form-group">
            <label class="form-label">Caffeine Limit (mg)</label>
            <input v-model.number="form.dailyCaffeineTargetMg" type="number" class="form-input" min="0" max="2000"
              required inputmode="numeric" />
          </div>
        </div>

        <!-- Weekly HR Zone Targets -->
        <div class="card mb-2">
          <h2 class="card-title mb-1">❤️ Weekly HR Zone Targets</h2>
          <p class="text-sm text-muted mb-1">Set your weekly target minutes for each zone group</p>

          <div class="form-group">
            <label class="form-label">
              <span class="zone-dot zone-low"></span>
              Zones 1–3 — Warm Up / Fat Burn / Cardio (mins)
            </label>
            <input v-model.number="form.weeklyHrZone13Mins" type="number" class="form-input" min="0" max="1440"
              inputmode="numeric" />
          </div>

          <div class="form-group">
            <label class="form-label">
              <span class="zone-dot zone-high"></span>
              Zones 4–5 — Threshold / Max Effort (mins)
            </label>
            <input v-model.number="form.weeklyHrZone45Mins" type="number" class="form-input" min="0" max="1440"
              inputmode="numeric" />
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block mb-2" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </form>

      <!-- Account -->
      <div class="card mb-2">
        <h2 class="card-title mb-1">Account</h2>
        <div class="text-sm text-muted mb-1">Logged in as {{ auth.user.value?.email }}</div>
        <button class="btn btn-danger btn-block" @click="handleLogout">Sign Out</button>
      </div>
    </template>
  </div>
</template>

<script setup>
const api = useApi();
const auth = useAuth();

const loading = ref(false);
const saving = ref(false);
const saveSuccess = ref(false);
const saveError = ref('');

const form = ref({
  dailyCalorieTarget: 2000,
  dailyWaterTargetMl: 2500,
  dailyCaffeineTargetMg: 400,
  weeklyHrZone13Mins: 150,
  weeklyHrZone45Mins: 40,
});

async function fetchSettings() {
  loading.value = true;
  try {
    const data = await api.get('/api/settings');
    form.value = { ...form.value, ...data };
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  saving.value = true;
  saveSuccess.value = false;
  saveError.value = '';
  try {
    await api.put('/api/settings', form.value);
    saveSuccess.value = true;
    setTimeout(() => { saveSuccess.value = false; }, 3000);
  } catch (err) {
    saveError.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function handleLogout() {
  await auth.logout();
  navigateTo('/login');
}

onMounted(fetchSettings);
</script>

<style scoped>
.zone-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.3rem;
  vertical-align: middle;
}

.zone-dot.zone-low {
  background: var(--accent-green);
}

.zone-dot.zone-high {
  background: var(--accent-red);
}
</style>
