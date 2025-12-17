<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'

const mapGridStore = useMapGridStore()

const sectorInput = ref('')
const commandHistory = ref<{ sector: string; coords: { lat: number; lng: number }; timestamp: Date }[]>([])
const errorMessage = ref('')

const sectors = computed(() => mapGridStore.sectors)
const selectedSector = computed(() => mapGridStore.selectedSector)
const selectedSectorData = computed(() => {
  if (!selectedSector.value) return null
  return mapGridStore.getSectorByLabel(selectedSector.value)
})

const flyToSector = () => {
  errorMessage.value = ''

  if (!sectorInput.value.trim()) {
    errorMessage.value = 'Please enter a sector label'
    return
  }

  if (!mapGridStore.dronePosition) {
    errorMessage.value = 'Please set drone position first'
    return
  }

  const targetCoords = mapGridStore.flyToSector(sectorInput.value.toUpperCase())

  if (targetCoords) {
    commandHistory.value.unshift({
      sector: sectorInput.value.toUpperCase(),
      coords: targetCoords,
      timestamp: new Date(),
    })

    // Keep only last 10 commands
    if (commandHistory.value.length > 10) {
      commandHistory.value = commandHistory.value.slice(0, 10)
    }

    // Start animated flight to target
    mapGridStore.startFlyingTo(targetCoords)

    // In production, this would send the command to the drone via Raspberry Pi
    console.log(`Command: Fly to sector ${sectorInput.value.toUpperCase()}`, targetCoords)

    sectorInput.value = ''
  } else {
    errorMessage.value = `Sector "${sectorInput.value.toUpperCase()}" not found`
  }
}

const selectSectorFromList = (label: string) => {
  sectorInput.value = label
}

const formatTimestamp = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString()
}

const formatCoordinate = (value: number): string => {
  return value.toFixed(6)
}
</script>

<template>
  <div class="sector-command">
    <h2>Sector Commands</h2>

    <!-- Selected Sector Coordinates -->
    <div v-if="selectedSectorData" class="sector-coordinates">
      <h3>Selected: {{ selectedSector }}</h3>
      <div class="coord-section">
        <div class="coord-label">Center Point:</div>
        <div class="coord-value">
          {{ formatCoordinate(selectedSectorData.center.lat) }}°N,
          {{ formatCoordinate(selectedSectorData.center.lng) }}°E
        </div>
      </div>
      <div class="coord-section">
        <div class="coord-label">Bounding Box:</div>
        <div class="coord-value">
          <div>SW: {{ formatCoordinate(selectedSectorData.bounds.southWest.lat) }}°N,
               {{ formatCoordinate(selectedSectorData.bounds.southWest.lng) }}°E</div>
          <div>NE: {{ formatCoordinate(selectedSectorData.bounds.northEast.lat) }}°N,
               {{ formatCoordinate(selectedSectorData.bounds.northEast.lng) }}°E</div>
        </div>
      </div>
    </div>

    <div class="command-input">
      <label for="sector-input">Enter Sector Label:</label>
      <div class="input-group">
        <input
          id="sector-input"
          v-model="sectorInput"
          type="text"
          placeholder="e.g., B4"
          @keyup.enter="flyToSector"
          :disabled="sectors.length === 0"
        />
        <button @click="flyToSector" :disabled="sectors.length === 0" class="btn-send">
          Fly To
        </button>
      </div>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p v-if="sectors.length === 0" class="info-message">
        Draw a grid on the map first to enable commands
      </p>
    </div>

    <div v-if="sectors.length > 0" class="sector-list">
      <h3>Available Sectors</h3>
      <div class="sector-grid">
        <button
          v-for="sector in sectors"
          :key="sector.label"
          @click="selectSectorFromList(sector.label)"
          :class="['sector-btn', { selected: selectedSector === sector.label }]"
        >
          {{ sector.label }}
        </button>
      </div>
    </div>

    <div v-if="commandHistory.length > 0" class="command-history">
      <h3>Command History</h3>
      <div class="history-list">
        <div v-for="(cmd, index) in commandHistory" :key="index" class="history-item">
          <div class="history-header">
            <span class="sector-badge">{{ cmd.sector }}</span>
            <span class="timestamp">{{ formatTimestamp(cmd.timestamp) }}</span>
          </div>
          <div class="coordinates">
            Lat: {{ formatCoordinate(cmd.coords.lat) }}, Lng: {{ formatCoordinate(cmd.coords.lng) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sector-command {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.2em;
  color: #333;
}

h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1em;
  color: #555;
  font-weight: 700;
}

.sector-coordinates {
  background: #f0f8ff;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border-left: 4px solid #3388ff;
}

.coord-section {
  margin-bottom: 12px;
}

.coord-section:last-child {
  margin-bottom: 0;
}

.coord-label {
  font-weight: 600;
  font-size: 0.85em;
  color: #555;
  margin-bottom: 4px;
}

.coord-value {
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
  color: #333;
  background: white;
  padding: 6px 10px;
  border-radius: 4px;
  line-height: 1.6;
}

.command-input {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.9em;
  color: #555;
}

.input-group {
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
  text-transform: uppercase;
}

input:focus {
  outline: none;
  border-color: #3388ff;
}

input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.btn-send {
  padding: 10px 20px;
  background: #00aa00;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-send:hover:not(:disabled) {
  background: #008800;
}

.btn-send:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.error-message {
  margin-top: 8px;
  color: #ff4444;
  font-size: 0.85em;
}

.info-message {
  margin-top: 8px;
  color: #3388ff;
  font-size: 0.85em;
}

.sector-list {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.sector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.sector-btn {
  padding: 8px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
}

.sector-btn:hover {
  background: #e0e0e0;
}

.sector-btn.selected {
  background: #ff0000;
  color: white;
  border-color: #cc0000;
}

.command-history {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
  border-left: 3px solid #00aa00;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.sector-badge {
  background: #00aa00;
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: bold;
  font-size: 0.85em;
}

.timestamp {
  font-size: 0.75em;
  color: #999;
}

.coordinates {
  font-size: 0.8em;
  color: #666;
  font-family: 'Courier New', monospace;
}
</style>
