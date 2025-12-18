<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'

const mapGridStore = useMapGridStore()

export type SearchPattern = 'parallel' | 'expanding-square' | 'contour' | 'sector'

const selectedPattern = ref<SearchPattern>('parallel')
const isRunning = ref(false)
const isPaused = ref(false)
const progress = ref(0)
const searchedSectors = ref<Set<string>>(new Set())

// Pattern parameters
const parallelDirection = ref<'horizontal' | 'vertical'>('horizontal')
const expandingSquareCenter = ref<string>('')
const sectorOrder = ref<'row-by-row' | 'column-by-column'>('row-by-row')

const patterns = [
  { id: 'parallel', name: 'Parallel Track Search (PS)', icon: '═' },
  { id: 'expanding-square', name: 'Expanding Square (SS)', icon: '▢' },
  { id: 'contour', name: 'Contour Search (OS)', icon: '⟲' },
  { id: 'sector', name: 'Sector Search (VS)', icon: '▦' }
]

const totalSectors = computed(() => mapGridStore.sectors.length)
const searchedCount = computed(() => searchedSectors.value.size)
const progressPercent = computed(() =>
  totalSectors.value > 0 ? (searchedCount.value / totalSectors.value) * 100 : 0
)

const canStart = computed(() =>
  mapGridStore.sectors.length > 0 &&
  mapGridStore.dronePosition &&
  !isRunning.value
)

function startSearch() {
  if (!canStart.value) return

  searchedSectors.value.clear()
  progress.value = 0
  isRunning.value = true
  isPaused.value = false

  // Generate path based on selected pattern
  mapGridStore.startSearchPattern(selectedPattern.value, {
    direction: parallelDirection.value,
    center: expandingSquareCenter.value,
    order: sectorOrder.value
  })
}

function pauseSearch() {
  isPaused.value = !isPaused.value
  mapGridStore.pauseSearchPattern(isPaused.value)
}

function stopSearch() {
  isRunning.value = false
  isPaused.value = false
  mapGridStore.stopSearchPattern()
  searchedSectors.value.clear()
  progress.value = 0
}

function resetSearch() {
  stopSearch()
  mapGridStore.clearSearchPath()
}
</script>

<template>
  <div class="search-patterns">
    <h2>Search Patterns</h2>

    <!-- Pattern Selection -->
    <div class="pattern-selector">
      <h3>Select Pattern:</h3>
      <div class="pattern-grid">
        <button
          v-for="pattern in patterns"
          :key="pattern.id"
          class="pattern-btn"
          :class="{ active: selectedPattern === pattern.id }"
          @click="selectedPattern = pattern.id as SearchPattern"
          :disabled="isRunning"
        >
          <span class="pattern-icon">{{ pattern.icon }}</span>
          <span class="pattern-name">{{ pattern.name }}</span>
        </button>
      </div>
    </div>

    <!-- Pattern Parameters -->
    <div v-if="selectedPattern === 'parallel'" class="pattern-params">
      <h3>Direction:</h3>
      <div class="radio-group">
        <label>
          <input type="radio" v-model="parallelDirection" value="horizontal" :disabled="isRunning" />
          Horizontal (Left to Right)
        </label>
        <label>
          <input type="radio" v-model="parallelDirection" value="vertical" :disabled="isRunning" />
          Vertical (Top to Bottom)
        </label>
      </div>
    </div>

    <div v-if="selectedPattern === 'expanding-square'" class="pattern-params">
      <h3>Center Sector:</h3>
      <input
        v-model="expandingSquareCenter"
        placeholder="e.g., C3"
        :disabled="isRunning"
        class="text-input"
      />
      <p class="hint">Leave empty to use grid center</p>
    </div>

    <div v-if="selectedPattern === 'sector'" class="pattern-params">
      <h3>Search Order:</h3>
      <div class="radio-group">
        <label>
          <input type="radio" v-model="sectorOrder" value="row-by-row" :disabled="isRunning" />
          Row by Row (A1, B1, C1...)
        </label>
        <label>
          <input type="radio" v-model="sectorOrder" value="column-by-column" :disabled="isRunning" />
          Column by Column (A1, A2, A3...)
        </label>
      </div>
    </div>

    <!-- Progress Display -->
    <div v-if="totalSectors > 0" class="progress-section">
      <h3>Search Progress:</h3>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        <span class="progress-text">{{ searchedCount }} / {{ totalSectors }} sectors ({{ progressPercent.toFixed(1) }}%)</span>
      </div>
    </div>

    <!-- Control Buttons -->
    <div class="control-buttons">
      <button
        class="btn btn-primary"
        @click="startSearch"
        :disabled="!canStart"
        v-if="!isRunning"
      >
        Start Search
      </button>

      <template v-else>
        <button class="btn btn-warning" @click="pauseSearch">
          {{ isPaused ? 'Resume' : 'Pause' }}
        </button>
        <button class="btn btn-danger" @click="stopSearch">
          Stop
        </button>
      </template>

      <button
        class="btn btn-secondary"
        @click="resetSearch"
        :disabled="isRunning"
      >
        Reset
      </button>
    </div>

    <!-- Status Info -->
    <div v-if="!mapGridStore.dronePosition" class="warning-box">
      Set drone position first before starting search
    </div>
    <div v-else-if="mapGridStore.sectors.length === 0" class="warning-box">
      Create a grid first before selecting search pattern
    </div>
  </div>
</template>

<style scoped>
.search-patterns {
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
  margin-top: 15px;
  margin-bottom: 10px;
  font-size: 0.95em;
  color: #555;
  font-weight: 600;
}

.pattern-selector {
  margin-bottom: 20px;
}

.pattern-grid {
  display: grid;
  gap: 10px;
}

.pattern-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.pattern-btn:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #adb5bd;
}

.pattern-btn.active {
  background: #e3f2fd;
  border-color: #2196f3;
}

.pattern-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pattern-icon {
  font-size: 24px;
  width: 30px;
  text-align: center;
}

.pattern-name {
  font-size: 0.9em;
  font-weight: 500;
}

.pattern-params {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9em;
}

.text-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.9em;
}

.hint {
  font-size: 0.8em;
  color: #6c757d;
  margin-top: 5px;
  margin-bottom: 0;
}

.progress-section {
  margin: 20px 0;
}

.progress-bar {
  position: relative;
  height: 40px;
  background: #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #66bb6a);
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9em;
  color: #333;
  z-index: 1;
}

.control-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9em;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1976d2;
}

.btn-warning {
  background: #ff9800;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #f57c00;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #d32f2f;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 12px;
  margin-top: 15px;
  font-size: 0.9em;
  color: #856404;
}
</style>
