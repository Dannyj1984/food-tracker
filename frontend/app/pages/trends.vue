<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Trends</h1>
      <select v-model="days" class="form-select" style="width: auto;">
        <option :value="7">7 days</option>
        <option :value="14">14 days</option>
        <option :value="30">30 days</option>
      </select>
    </div>

    <div v-if="loading" class="loading-center">
      <div class="spinner"></div>
    </div>

    <template v-else>
      <!-- Calories Chart -->
      <div class="card mb-2">
        <div class="card-title mb-1">Calories</div>
        <div v-if="hasData" style="height: 200px;">
          <Line :data="caloriesChartData" :options="chartOptions" />
        </div>
        <div v-else class="empty-state">
          <div class="empty-state-text">No data yet</div>
        </div>
      </div>

      <!-- Macros Chart -->
      <div class="card mb-2">
        <div class="card-title mb-1">Macros</div>
        <div v-if="hasData" style="height: 200px;">
          <Line :data="macrosChartData" :options="chartOptions" />
        </div>
        <div v-else class="empty-state">
          <div class="empty-state-text">No data yet</div>
        </div>
      </div>

      <!-- Water Chart -->
      <div class="card mb-2">
        <div class="card-title mb-1">Water (ml)</div>
        <div v-if="hasWaterData" style="height: 200px;">
          <Line :data="waterChartData" :options="chartOptions" />
        </div>
        <div v-else class="empty-state">
          <div class="empty-state-text">No data yet</div>
        </div>
      </div>

      <!-- Caffeine Chart -->
      <div class="card mb-2">
        <div class="card-title mb-1">Caffeine (mg)</div>
        <div v-if="hasData" style="height: 200px;">
          <Line :data="caffeineChartData" :options="chartOptions" />
        </div>
        <div v-else class="empty-state">
          <div class="empty-state-text">No data yet</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const api = useApi();

const days = ref(30);
const loading = ref(false);
const foodSummary = ref([]);
const waterSummary = ref([]);
const settings = ref({ dailyCalorieTarget: 2000, dailyWaterTargetMl: 2500, dailyCaffeineTargetMg: 400 });

const hasData = computed(() => foodSummary.value.length > 0);
const hasWaterData = computed(() => waterSummary.value.length > 0);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
  },
  elements: { point: { radius: 2, hoverRadius: 5 }, line: { tension: 0.3 } },
};

const labels = computed(() => foodSummary.value.map(d => {
  const date = new Date(d.date);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}));

const caloriesChartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Calories',
      data: foodSummary.value.map(d => d.calories),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      fill: true,
    },
    {
      label: 'Target',
      data: foodSummary.value.map(() => settings.value.dailyCalorieTarget),
      borderColor: 'rgba(239, 68, 68, 0.5)',
      borderDash: [5, 5],
      pointRadius: 0,
    },
  ],
}));

const macrosChartData = computed(() => ({
  labels: labels.value,
  datasets: [
    { label: 'Protein', data: foodSummary.value.map(d => d.protein), borderColor: '#3b82f6', backgroundColor: 'transparent' },
    { label: 'Carbs', data: foodSummary.value.map(d => d.carbs), borderColor: '#f59e0b', backgroundColor: 'transparent' },
    { label: 'Fat', data: foodSummary.value.map(d => d.fat), borderColor: '#ef4444', backgroundColor: 'transparent' },
  ],
}));

const waterLabels = computed(() => waterSummary.value.map(d => {
  const date = new Date(d.date);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}));

const waterChartData = computed(() => ({
  labels: waterLabels.value,
  datasets: [
    {
      label: 'Water',
      data: waterSummary.value.map(d => d.totalMl),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
    },
    {
      label: 'Target',
      data: waterSummary.value.map(() => settings.value.dailyWaterTargetMl),
      borderColor: 'rgba(239, 68, 68, 0.5)',
      borderDash: [5, 5],
      pointRadius: 0,
    },
  ],
}));

const caffeineChartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Caffeine',
      data: foodSummary.value.map(d => d.caffeine),
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      fill: true,
    },
    {
      label: 'Limit',
      data: foodSummary.value.map(() => settings.value.dailyCaffeineTargetMg),
      borderColor: 'rgba(239, 68, 68, 0.5)',
      borderDash: [5, 5],
      pointRadius: 0,
    },
  ],
}));

async function fetchData() {
  loading.value = true;
  try {
    const [food, water, s] = await Promise.all([
      api.get(`/api/food-log/summary?days=${days.value}`),
      api.get(`/api/water-log/summary?days=${days.value}`),
      api.get('/api/settings'),
    ]);
    foodSummary.value = food;
    waterSummary.value = water;
    settings.value = s;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

watch(days, fetchData);
onMounted(fetchData);
</script>
