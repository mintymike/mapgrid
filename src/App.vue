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
            {{ tab.label }}
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
/* Fluent UI Design System */
* {
  box-sizing: border-box;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', sans-serif;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #faf9f8;
}

/* Fluent Header */
.app-header {
  background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
  color: white;
  padding: 16px 24px;
  box-shadow: 0 0.3px 0.9px rgba(0, 0, 0, 0.108), 0 1.6px 3.6px rgba(0, 0, 0, 0.132);
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 10;
}

.hamburger-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s cubic-bezier(0.1, 0.9, 0.2, 1);
  flex-shrink: 0;
}

.hamburger-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.hamburger-btn:active {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(0.98);
}

.hamburger-icon {
  font-size: 20px;
  line-height: 1;
}

.header-content {
  flex: 1;
}

.app-header h1 {
  margin: 0 0 2px 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 0;
  font-size: 12px;
  opacity: 0.85;
  font-weight: 400;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Fluent Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 380px;
  background: #ffffff;
  flex-shrink: 0;
  transition: margin-left 0.25s cubic-bezier(0.1, 0.9, 0.2, 1);
  overflow: hidden;
  box-shadow: 0 0.3px 0.9px rgba(0, 0, 0, 0.108), 0 1.6px 3.6px rgba(0, 0, 0, 0.132);
}

.sidebar.hidden {
  margin-left: -380px;
}

/* Fluent Tab Navigation */
.tab-nav {
  display: flex;
  background: #ffffff;
  border-bottom: 1px solid #edebe9;
  flex-shrink: 0;
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.1s cubic-bezier(0.1, 0.9, 0.2, 1);
  position: relative;
  color: #605e5c;
  font-weight: 400;
  font-size: 14px;
  letter-spacing: 0.01em;
}

.tab-button:hover {
  background: #f3f2f1;
  color: #323130;
}

.tab-button:active {
  background: #edebe9;
}

.tab-button.active {
  color: #0078d4;
  font-weight: 600;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #0078d4;
}

/* Fluent Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: #faf9f8;
}

/* Custom Scrollbar - Fluent Style */
.tab-content::-webkit-scrollbar {
  width: 12px;
}

.tab-content::-webkit-scrollbar-track {
  background: transparent;
}

.tab-content::-webkit-scrollbar-thumb {
  background: #c8c6c4;
  border-radius: 6px;
  border: 3px solid #faf9f8;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: #a19f9d;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: fluent-fadeIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
}

@keyframes fluent-fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.map-section {
  flex: 1;
  background: #f3f2f1;
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
