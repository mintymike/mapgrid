<script setup lang="ts">
import { ref } from 'vue'
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

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const tabs = [
  { id: 'grid', icon: '📐', label: 'Grid' },
  { id: 'drone', icon: '🚁', label: 'Drone' },
  { id: 'search', icon: '🔍', label: 'Search' },
  { id: 'commands', icon: '🎮', label: 'Commands' },
  { id: 'settings', icon: '⚙️', label: 'Settings' }
]
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <button class="hamburger-btn" @click="toggleSidebar" :title="sidebarVisible ? 'Hide sidebar' : 'Show sidebar'">
        <span class="hamburger-icon">☰</span>
      </button>
      <div class="header-content">
        <h1>MapGrid - Drone Search Area Controller</h1>
        <p class="subtitle">Vue + MapLibre GL Grid Sector Application</p>
      </div>
    </header>

    <div class="main-content">
      <aside class="sidebar" :class="{ hidden: !sidebarVisible }">
        <!-- Tab Navigation -->
        <div class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-button"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Grid Tab -->
          <div v-if="activeTab === 'grid'" class="tab-panel">
            <ControlPanel />
          </div>

          <!-- Drone Tab -->
          <div v-if="activeTab === 'drone'" class="tab-panel">
            <DroneControl />
            <DroneTelemetry />
          </div>

          <!-- Search Tab -->
          <div v-if="activeTab === 'search'" class="tab-panel">
            <SearchPatterns />
          </div>

          <!-- Commands Tab -->
          <div v-if="activeTab === 'commands'" class="tab-panel">
            <VoiceCommand />
            <SectorCommand />
          </div>

          <!-- Settings Tab -->
          <div v-if="activeTab === 'settings'" class="tab-panel">
            <Settings />
          </div>
        </div>
      </aside>

      <main class="map-section">
        <MapView />
      </main>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
  position: relative;
}

.hamburger-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.hamburger-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.hamburger-icon {
  font-size: 24px;
  line-height: 1;
}

.header-content {
  flex: 1;
}

.app-header h1 {
  margin: 0 0 5px 0;
  font-size: 1.8em;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  font-size: 0.9em;
  opacity: 0.9;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 380px;
  background: #f5f5f5;
  flex-shrink: 0;
  transition: margin-left 0.3s ease;
  overflow: hidden;
}

.sidebar.hidden {
  margin-left: -380px;
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  background: #fff;
  border-bottom: 2px solid #e0e0e0;
  flex-shrink: 0;
}

.tab-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  color: #666;
}

.tab-button:hover {
  background: #f5f5f5;
  color: #333;
}

.tab-button.active {
  color: #667eea;
  font-weight: 600;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.tab-icon {
  font-size: 20px;
}

.tab-label {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.map-section {
  flex: 1;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  overflow: visible;
  min-width: 0;
  position: relative;
}

@media (max-width: 1024px) {
  .sidebar {
    width: 320px;
  }

  .sidebar.hidden {
    margin-left: -320px;
  }

  .app-header h1 {
    font-size: 1.4em;
  }

  .subtitle {
    font-size: 0.8em;
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 100;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
  }

  .sidebar.hidden {
    margin-left: -100%;
  }
}
</style>
