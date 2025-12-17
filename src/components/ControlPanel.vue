<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'

const mapGridStore = useMapGridStore()

const sectorSizeOptions = [1, 2, 5, 10, 20, 50, 100]
const selectedSectorSize = ref(mapGridStore.sectorSizeMeters)

const gridDimensions = computed(() => mapGridStore.gridDimensions)
const totalSectors = computed(() => mapGridStore.totalSectors)

const updateSectorSize = () => {
  mapGridStore.setSectorSize(selectedSectorSize.value)
}

const clearGrid = () => {
  mapGridStore.clearGrid()
}
</script>

<template>
  <div class="control-panel">
    <h2>Grid Configuration</h2>

    <div class="control-group">
      <label for="sector-size">Sector Size (meters):</label>
      <select id="sector-size" v-model="selectedSectorSize" @change="updateSectorSize">
        <option v-for="size in sectorSizeOptions" :key="size" :value="size">
          {{ size }}m x {{ size }}m
        </option>
      </select>
    </div>

    <div class="control-group">
      <button @click="clearGrid" class="btn-clear">Clear Grid</button>
    </div>

    <div v-if="totalSectors > 0" class="grid-info">
      <h3>Grid Information</h3>
      <div class="info-item">
        <span class="label">Total Sectors:</span>
        <span class="value">{{ totalSectors }}</span>
      </div>
      <div v-if="gridDimensions" class="info-item">
        <span class="label">Grid Size:</span>
        <span class="value">{{ gridDimensions.rows }} rows × {{ gridDimensions.cols }} columns</span>
      </div>
      <div class="info-item">
        <span class="label">Sector Size:</span>
        <span class="value">{{ selectedSectorSize }}m × {{ selectedSectorSize }}m</span>
      </div>
    </div>

    <div v-else class="instruction">
      <p>Draw a rectangle on the map to create a search grid.</p>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 300px;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.2em;
  color: #333;
}

h3 {
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 1em;
  color: #555;
}

.control-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  font-size: 0.9em;
  color: #555;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
  background: white;
  cursor: pointer;
}

select:focus {
  outline: none;
  border-color: #3388ff;
}

.btn-clear {
  width: 100%;
  padding: 10px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-clear:hover {
  background: #cc0000;
}

.grid-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9em;
}

.info-item .label {
  color: #666;
}

.info-item .value {
  font-weight: 600;
  color: #333;
}

.instruction {
  margin-top: 20px;
  padding: 15px;
  background: #f0f8ff;
  border-radius: 4px;
  border-left: 4px solid #3388ff;
}

.instruction p {
  margin: 0;
  font-size: 0.9em;
  color: #555;
}
</style>
