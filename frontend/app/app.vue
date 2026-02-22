<template>
  <div class="app-layout">
    <main class="app-main">
      <NuxtPage />
    </main>

    <nav v-if="auth.isAuthenticated.value" class="nav-bottom">
      <div class="nav-bottom-inner">
        <NuxtLink to="/" class="nav-item" :class="{ active: route.path === '/' }">
          <span class="nav-icon">📊</span>
          <span>Home</span>
        </NuxtLink>
        <NuxtLink to="/scan" class="nav-item" :class="{ active: route.path === '/scan' }">
          <span class="nav-icon">📷</span>
          <span>Scan</span>
        </NuxtLink>
        <NuxtLink to="/exercise" class="nav-item" :class="{ active: route.path === '/exercise' }">
          <span class="nav-icon">🏃</span>
          <span>Exercise</span>
        </NuxtLink>
        <NuxtLink to="/weekly" class="nav-item" :class="{ active: route.path === '/weekly' }">
          <span class="nav-icon">📅</span>
          <span>Weekly</span>
        </NuxtLink>

        <!-- More menu -->
        <button class="nav-item" style="background-color: var(--bg-card)" :class="{ active: moreActive }"
          @click="menuOpen = !menuOpen">
          <span class="nav-icon">☰</span>
          <span>More</span>
        </button>
      </div>

      <!-- Dropdown menu -->
      <Transition name="menu-slide">
        <div v-if="menuOpen" class="nav-menu-overlay" @click.self="menuOpen = false">
          <div class="nav-menu">
            <NuxtLink to="/calendar" class="nav-menu-item" @click="menuOpen = false">
              <span>📅</span><span>Calendar</span>
            </NuxtLink>
            <NuxtLink to="/custom-meals" class="nav-menu-item" @click="menuOpen = false">
              <span>🍽️</span><span>Meals</span>
            </NuxtLink>
            <NuxtLink to="/custom-foods" class="nav-menu-item" @click="menuOpen = false">
              <span>🥫</span><span>Foods</span>
            </NuxtLink>
            <NuxtLink to="/trends" class="nav-menu-item" @click="menuOpen = false">
              <span>📈</span><span>Trends</span>
            </NuxtLink>
            <NuxtLink to="/settings" class="nav-menu-item" @click="menuOpen = false">
              <span>⚙️</span><span>Settings</span>
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </nav>
  </div>
</template>

<script setup>
const auth = useAuth();
const route = useRoute();
const menuOpen = ref(false);

const morePaths = ['/calendar', '/custom-meals', '/custom-foods', '/trends', '/settings'];
const moreActive = computed(() => morePaths.includes(route.path));

// Close menu on route change
watch(() => route.path, () => { menuOpen.value = false; });
</script>

<style scoped>
/* Dropdown overlay */
.nav-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}

/* Dropdown menu */
.nav-menu {
  position: fixed;
  bottom: 70px;
  right: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  padding: 0.5rem;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
  min-width: 160px;
  z-index: 101;
}

.nav-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.nav-menu-item:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

/* Transition */
.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: opacity 200ms ease;
}

.menu-slide-enter-active .nav-menu,
.menu-slide-leave-active .nav-menu {
  transition: transform 200ms ease, opacity 200ms ease;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  opacity: 0;
}

.menu-slide-enter-from .nav-menu,
.menu-slide-leave-to .nav-menu {
  transform: translateY(10px);
  opacity: 0;
}
</style>
