<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'

const mapGridStore = useMapGridStore()

const sectorSizeOptions = [1, 2, 5, 10, 20, 50, 100]
const selectedSectorSize = ref(mapGridStore.sectorSizeMeters)

const gridDimensions = computed(() => mapGridStore.gridDimensions)
const totalSectors = computed(() => mapGridStore.totalSectors)

const updateSectorSize = () => { mapGridStore.setSectorSize(selectedSectorSize.value) }
const clearGrid = () => { mapGridStore.clearGrid() }
</script>

<template>
  <div class="glass-card" style="padding:16px">
    <div class="glass-section-header">Grid Configuration</div>

    <label class="field-label">Sector Size</label>
    <select v-model="selectedSectorSize" @change="updateSectorSize" class="glass-select">
      <option v-for="size in sectorSizeOptions" :key="size" :value="size">
        {{ size }}m &times; {{ size }}m
      </option>
    </select>

    <button @click="clearGrid" class="glass-btn danger" style="width:100%;margin-top:10px">Clear Grid</button>

    <div v-if="totalSectors > 0" class="info-section">
      <div class="glass-divider"></div>
      <div class="glass-section-header">Grid Info</div>
      <div class="info-rows">
        <div class="info-row"><span class="info-label">Sectors</span><span class="info-value">{{ totalSectors.toLocaleString() }}</span></div>
        <div v-if="gridDimensions" class="info-row"><span class="info-label">Layout</span><span class="info-value">{{ gridDimensions.rows }} &times; {{ gridDimensions.cols }}</span></div>
        <div class="info-row"><span class="info-label">Cell</span><span class="info-value">{{ selectedSectorSize }}m</span></div>
      </div>
    </div>

    <div v-else class="hint-msg">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="10" height="10" rx="2"/></svg>
      Draw a rectangle on the map to create a search grid
    </div>
  </div>
</template>

<style scoped>
.field-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}

.info-section { margin-top: 0; }

.info-rows {
  background: var(--layer-bg-0);
  border: 1px solid var(--layer-bg-2);
  border-radius: var(--radius-md);
  padding: 4px 0;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 12px;
  font-size: 13px;
}
.info-row + .info-row {
  border-top: 1px solid var(--layer-bg-2);
}
.info-label { color: var(--color-text-secondary); font-size: 12px; }
.info-value { font-weight: 600; color: var(--color-text-primary); font-variant-numeric: tabular-nums; font-size: 12px; }

.hint-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--color-accent-bg);
  border: 1px solid var(--color-accent-border);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--color-accent);
  line-height: 1.5;
}
</style>
