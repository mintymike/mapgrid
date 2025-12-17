<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'
import { droneApi } from '@/services/droneApi'
import type { Telemetry } from '@/services/droneApi'

const mapGridStore = useMapGridStore()

const dronePosition = computed(() => mapGridStore.dronePosition)
const droneSpeed = computed(() => mapGridStore.droneSpeed)
const isFlying = computed(() => mapGridStore.isFlying)

const currentSector = computed(() => {
  if (!dronePosition.value) return null
  return mapGridStore.getSectorAtPosition(dronePosition.value.lat, dronePosition.value.lng)
})

// API integration
const useApiTelemetry = ref(false)
const apiTelemetry = ref<Telemetry | null>(null)
const apiConnected = ref(false)

// Manual position inputs
const manualLat = ref(0)
const manualLng = ref(0)
const manualSpeed = ref(5)
const showSetPosition = ref(!dronePosition.value)

// Start API telemetry polling when enabled
function startApiTelemetry() {
  droneApi.startTelemetryPolling((data) => {
    apiTelemetry.value = data
    apiConnected.value = true
    // Update mapGrid store with API telemetry
    mapGridStore.updateFromApiTelemetry(data)
  }, 500)
}

function stopApiTelemetry() {
  droneApi.stopTelemetryPolling()
  apiConnected.value = false
}

function toggleApiTelemetry() {
  useApiTelemetry.value = !useApiTelemetry.value
  if (useApiTelemetry.value) {
    startApiTelemetry()
  } else {
    stopApiTelemetry()
  }
}

onMounted(() => {
  // Auto-start API telemetry if in mock mode (for testing)
  if (droneApi.isMockMode()) {
    useApiTelemetry.value = true
    startApiTelemetry()
  }
})

onUnmounted(() => {
  stopApiTelemetry()
})

const formatCoordinate = (value: number | undefined, decimals: number = 6): string => {
  return value !== undefined ? value.toFixed(decimals) : 'N/A'
}

const formatTimestamp = (timestamp: Date | undefined): string => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleTimeString()
}

// Set drone position manually
const setPosition = () => {
  mapGridStore.setDronePosition(manualLat.value, manualLng.value)
  showSetPosition.value = false
}

// Update drone speed
const updateSpeed = () => {
  mapGridStore.setDroneSpeed(manualSpeed.value)
}

// Quick position presets
const useCurrentLocation = () => {
  if (mapGridStore.searchArea) {
    const { southWest, northEast } = mapGridStore.searchArea
    manualLat.value = (southWest.lat + northEast.lat) / 2
    manualLng.value = (southWest.lng + northEast.lng) / 2
  }
}
</script>

<template>
  <div class="drone-telemetry">
    <h2>Drone Telemetry</h2>

    <!-- API Telemetry Toggle -->
    <div class="api-toggle">
      <label class="toggle-label">
        <input type="checkbox" v-model="useApiTelemetry" @change="toggleApiTelemetry" />
        <span class="toggle-slider"></span>
        <span class="toggle-text">Live API Telemetry</span>
      </label>
      <div v-if="useApiTelemetry" class="api-status" :class="{ connected: apiConnected }">
        {{ apiConnected ? '🟢 Connected' : '🔴 Disconnected' }}
      </div>
    </div>

    <!-- Speed Configuration -->
    <div class="speed-config">
      <label>Flight Speed (m/s):</label>
      <div class="input-group">
        <input v-model.number="manualSpeed" type="number" min="1" max="50" step="0.5" />
        <button @click="updateSpeed" class="btn-mini">Set</button>
      </div>
      <div class="speed-info">Current: {{ droneSpeed }} m/s</div>
    </div>

    <div v-if="dronePosition" class="telemetry-data">
      <div class="status-badge" :class="{ flying: isFlying }">
        {{ isFlying ? 'FLYING' : 'IDLE' }}
      </div>

      <div class="telemetry-item">
        <span class="label">Latitude:</span>
        <span class="value">{{ formatCoordinate(dronePosition.lat) }}</span>
      </div>

      <div class="telemetry-item">
        <span class="label">Longitude:</span>
        <span class="value">{{ formatCoordinate(dronePosition.lng) }}</span>
      </div>

      <div class="telemetry-item">
        <span class="label">Altitude:</span>
        <span class="value">{{ formatCoordinate(dronePosition.altitude, 2) }} m</span>
      </div>

      <div class="telemetry-item">
        <span class="label">Heading:</span>
        <span class="value">{{ formatCoordinate(dronePosition.heading, 1) }}°</span>
      </div>

      <div class="telemetry-item">
        <span class="label">Speed:</span>
        <span class="value">{{ formatCoordinate(dronePosition.speed, 2) }} m/s</span>
      </div>

      <div class="telemetry-item">
        <span class="label">Current Sector:</span>
        <span class="value sector-label">{{ currentSector?.label || 'Outside Grid' }}</span>
      </div>

      <div class="telemetry-item">
        <span class="label">Last Update:</span>
        <span class="value">{{ formatTimestamp(dronePosition.timestamp) }}</span>
      </div>

      <button @click="showSetPosition = true" class="btn-reset">Reset Position</button>
    </div>

    <!-- Manual Position Setter -->
    <div v-if="!dronePosition || showSetPosition" class="position-setter">
      <h3>Set Drone Position</h3>
      <div class="input-row">
        <label>Latitude:</label>
        <input v-model.number="manualLat" type="number" step="0.000001" placeholder="0.000000" />
      </div>
      <div class="input-row">
        <label>Longitude:</label>
        <input v-model.number="manualLng" type="number" step="0.000001" placeholder="0.000000" />
      </div>
      <div class="button-row">
        <button @click="useCurrentLocation" class="btn-preset">Use Grid Center</button>
        <button @click="setPosition" class="btn-set">Set Position</button>
      </div>
      <button v-if="dronePosition" @click="showSetPosition = false" class="btn-cancel">
        Cancel
      </button>
    </div>
  </div>
</template>

<style scoped>
.drone-telemetry {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 300px;
}

h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2em;
  color: #333;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1em;
  color: #555;
}

.speed-config {
  margin-bottom: 20px;
  padding: 15px;
  background: #f0f8ff;
  border-radius: 4px;
}

.speed-config label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.9em;
  color: #555;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-group input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}

.btn-mini {
  padding: 8px 16px;
  background: #3388ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9em;
}

.btn-mini:hover {
  background: #2266cc;
}

.speed-info {
  margin-top: 8px;
  font-size: 0.85em;
  color: #666;
}

.status-badge {
  padding: 8px;
  text-align: center;
  font-weight: bold;
  border-radius: 4px;
  margin-bottom: 15px;
  background: #e0e0e0;
  color: #666;
}

.status-badge.flying {
  background: #00aa00;
  color: white;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.telemetry-data {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.telemetry-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 0.9em;
}

.telemetry-item .label {
  color: #666;
  font-weight: 500;
}

.telemetry-item .value {
  font-weight: 600;
  color: #333;
  font-family: 'Courier New', monospace;
}

.telemetry-item .value.sector-label {
  background: #00ff00;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: bold;
}

.position-setter {
  padding: 15px;
  background: #fff3cd;
  border-radius: 4px;
  margin-top: 15px;
}

.input-row {
  margin-bottom: 12px;
}

.input-row label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  font-size: 0.9em;
  color: #555;
}

.input-row input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}

.button-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.btn-preset {
  flex: 1;
  padding: 10px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85em;
}

.btn-preset:hover {
  background: #5a6268;
}

.btn-set {
  flex: 1;
  padding: 10px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85em;
}

.btn-set:hover {
  background: #218838;
}

.btn-reset,
.btn-cancel {
  width: 100%;
  padding: 8px;
  margin-top: 10px;
  background: #ffc107;
  color: #333;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85em;
}

.btn-reset:hover,
.btn-cancel:hover {
  background: #e0a800;
}

.btn-cancel {
  background: #dc3545;
  color: white;
}

.btn-cancel:hover {
  background: #c82333;
}

/* API Toggle */
.api-toggle {
  margin-bottom: 20px;
  padding: 15px;
  background: #e8f5e9;
  border-radius: 4px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.toggle-label input[type="checkbox"] {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 50px;
  height: 24px;
  background: #ccc;
  border-radius: 12px;
  transition: background 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

.toggle-label input[type="checkbox"]:checked + .toggle-slider {
  background: #4caf50;
}

.toggle-label input[type="checkbox"]:checked + .toggle-slider::before {
  transform: translateX(26px);
}

.toggle-text {
  font-weight: 600;
  color: #555;
  font-size: 0.9em;
}

.api-status {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  background: #ffebee;
  color: #c62828;
  text-align: center;
}

.api-status.connected {
  background: #e8f5e9;
  color: #2e7d32;
}
</style>
