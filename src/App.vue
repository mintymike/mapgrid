<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MapView from './components/MapView.vue'
import ControlPanel from './components/ControlPanel.vue'
import DroneTelemetry from './components/DroneTelemetry.vue'
import SectorCommand from './components/SectorCommand.vue'
import SearchPatterns from './components/SearchPatterns.vue'
import VoiceCommand from './components/VoiceCommand.vue'
import DroneControl from './components/DroneControl.vue'
import Settings from './components/Settings.vue'

const sidebarVisible = ref(true)
const activeTab = ref('grid')
const theme = ref('dark')

onMounted(() => {
  theme.value = document.documentElement.getAttribute('data-theme') || 'dark'
})

const toggleSidebar = () => { sidebarVisible.value = !sidebarVisible.value }

const toggleTheme = () => {
  const next = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('mapgrid-theme', next)
  theme.value = next
}

const tabs = [
  { id: 'grid', label: 'Grid' },
  { id: 'drone', label: 'Drone' },
  { id: 'search', label: 'Search' },
  { id: 'commands', label: 'Commands' },
  { id: 'settings', label: 'Settings' }
]
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <button class="hamburger-btn" @click="toggleSidebar" :title="sidebarVisible ? 'Hide' : 'Show'">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <line x1="0" y1="1" x2="16" y2="1"/>
          <line x1="0" y1="6" x2="16" y2="6"/>
          <line x1="0" y1="11" x2="16" y2="11"/>
        </svg>
      </button>
      <span class="header-logo">MapGrid</span>
      <span class="header-badge">SAR</span>
      <div class="header-spacer"></div>
      <button class="theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
        <svg v-if="theme === 'dark'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </header>

    <div class="main-content">
      <aside class="sidebar" :class="{ hidden: !sidebarVisible }">
        <div class="tab-nav">
          <button
            v-for="tab in tabs" :key="tab.id"
            class="tab-button" :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >{{ tab.label }}</button>
        </div>
        <div class="tab-content glass-scroll">
          <div v-if="activeTab === 'grid'" class="tab-panel"><ControlPanel /></div>
          <div v-if="activeTab === 'drone'" class="tab-panel"><DroneControl /><DroneTelemetry /></div>
          <div v-if="activeTab === 'search'" class="tab-panel"><SearchPatterns /></div>
          <div v-if="activeTab === 'commands'" class="tab-panel"><VoiceCommand /><SectorCommand /></div>
          <div v-if="activeTab === 'settings'" class="tab-panel"><Settings /></div>
        </div>
      </aside>

      <main class="map-section"><MapView /></main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
}

.app-header {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  margin: 8px 8px 0 8px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  background: var(--color-glass);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--layer-border-1);
  z-index: 20;
}

.hamburger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.hamburger-btn:hover {
  background: var(--layer-bg-3);
  color: var(--color-text-secondary);
}

.header-logo {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.header-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.10em;
  color: var(--color-accent);
  background: var(--color-accent-bg);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
}

.header-spacer { flex: 1; }

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.theme-toggle:hover {
  background: var(--layer-bg-3);
  color: var(--color-text-secondary);
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 8px;
  gap: 8px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 370px;
  flex-shrink: 0;
  transition: margin-left 0.28s ease, opacity 0.28s ease;
  overflow: hidden;
  background: var(--color-glass);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--layer-border-1);
  border-radius: var(--radius-lg);
}
.sidebar.hidden {
  margin-left: -378px;
  opacity: 0;
  pointer-events: none;
}

.tab-nav {
  display: flex;
  padding: 6px 6px 0 6px;
  gap: 3px;
  flex-shrink: 0;
  padding-bottom: 6px;
  border: 1px solid var(--layer-border-0);
}
.tab-button {
  flex: 1;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-tertiary);
  font-family: var(--font-family);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  letter-spacing: -0.01em;
}
.tab-button:hover {
  background: var(--layer-bg-2);
  color: var(--color-text-secondary);
}
.tab-button.active {
  background: var(--layer-bg-3);
  color: var(--color-text-primary);
  font-weight: 600;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}

.map-section {
  flex: 1;
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  min-width: 0;
  border: 1px solid var(--layer-border-1);
}

@media (max-width: 1024px) {
  .sidebar { width: 310px; }
  .sidebar.hidden { margin-left: -318px; }
}
@media (max-width: 768px) {
  .sidebar { position: absolute; top: 8px; left: 8px; bottom: 8px; z-index: 100; }
  .sidebar.hidden { margin-left: -100%; }
}
</style>
