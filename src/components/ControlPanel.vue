<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'

const mapGridStore = useMapGridStore()

const sectorSizeOptions = [1, 2, 5, 10, 20, 50, 100]
const selectedSectorSize = ref(mapGridStore.sectorSizeMeters)
const newAreaName = ref('')
const renamingId = ref<string | null>(null)
const renameValue = ref('')

const gridDimensions = computed(() => mapGridStore.gridDimensions)
const totalSectors = computed(() => mapGridStore.totalSectors)
const areaList = computed(() => mapGridStore.areaList)
const activeAreaId = computed(() => mapGridStore.activeAreaId)
const batteryEstimate = computed(() => mapGridStore.batteryEstimate)

const updateSectorSize = () => { mapGridStore.setSectorSize(selectedSectorSize.value) }
const clearGrid = () => { mapGridStore.clearGrid() }

function addArea() {
  const name = newAreaName.value.trim() || `Area ${areaList.value.length + 1}`
  mapGridStore._ensureActiveArea(name)
  newAreaName.value = ''
}

function startRename(id: string) {
  renamingId.value = id
  renameValue.value = mapGridStore.areas[id]?.name || ''
}

function finishRename() {
  if (renamingId.value && renameValue.value.trim()) {
    mapGridStore.renameArea(renamingId.value, renameValue.value.trim())
  }
  renamingId.value = null
}

function exportGeoJSON() {
  const geojson = {
    type: 'FeatureCollection',
    features: mapGridStore.areaList.flatMap((area) =>
      area.sectors.map((s) => ({
        type: 'Feature' as const,
        properties: { label: s.label, status: s.status, area: area.name },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [s.bounds.southWest.lng, s.bounds.southWest.lat],
            [s.bounds.northEast.lng, s.bounds.southWest.lat],
            [s.bounds.northEast.lng, s.bounds.northEast.lat],
            [s.bounds.southWest.lng, s.bounds.northEast.lat],
            [s.bounds.southWest.lng, s.bounds.southWest.lat],
          ]]
        }
      }))
    )
  }
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `mapgrid-all-${new Date().toISOString().slice(0, 10)}.geojson`
  a.click()
}

function formatBatteryPct(v: number) { return Math.min(v, 100).toFixed(0) }
</script>

<template>
  <div class="glass-card" style="padding:16px">
    <div class="glass-section-header">Search Areas</div>

    <div v-if="areaList.length > 0" class="area-list">
      <div v-for="area in areaList" :key="area.id" class="area-item" :class="{ active: area.id === activeAreaId }">
        <button class="area-select" @click="mapGridStore.switchArea(area.id)">
          <span v-if="renamingId === area.id">
            <input v-model="renameValue" @keyup.enter="finishRename" @blur="finishRename" @keyup.escape="renamingId=null" class="rename-input" autofocus />
          </span>
          <span v-else>{{ area.name }}</span>
          <span class="area-badge">{{ area.sectors.length }} sectors</span>
        </button>
        <button class="area-menu-btn" @click.stop="renamingId === area.id ? finishRename() : startRename(area.id)" :title="renamingId === area.id ? 'Save' : 'Rename'">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.5 1.5l2 2L4 10H2V8z"/></svg>
        </button>
        <button v-if="areaList.length > 1" class="area-menu-btn" @click.stop="mapGridStore.deleteArea(area.id)" title="Delete">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
        </button>
      </div>
    </div>

    <div class="add-row">
      <input v-model="newAreaName" type="text" placeholder="New area..." @keyup.enter="addArea" class="glass-input" style="flex:1" />
      <button @click="addArea" class="glass-btn accent">Add</button>
    </div>

    <div class="glass-divider"></div>
    <div class="glass-section-header">Grid Configuration</div>

    <label class="field-label">Sector Size</label>
    <select v-model="selectedSectorSize" @change="updateSectorSize" class="glass-select">
      <option v-for="size in sectorSizeOptions" :key="size" :value="size">{{ size }}m &times; {{ size }}m</option>
    </select>

    <button @click="clearGrid" class="glass-btn danger" style="width:100%;margin-top:10px">Clear Active Grid</button>

    <button v-if="totalSectors > 0" @click="exportGeoJSON" class="glass-btn" style="width:100%;margin-top:6px">Export All GeoJSON</button>

    <div v-if="totalSectors > 0" class="info-section">
      <div class="glass-divider"></div>
      <div class="glass-section-header">Grid Info</div>
      <div class="info-rows">
        <div class="info-row"><span class="info-label">Sectors</span><span class="info-value">{{ totalSectors.toLocaleString() }}</span></div>
        <div v-if="gridDimensions" class="info-row"><span class="info-label">Layout</span><span class="info-value">{{ gridDimensions.rows }} &times; {{ gridDimensions.cols }}</span></div>
        <div class="info-row"><span class="info-label">Cell</span><span class="info-value">{{ selectedSectorSize }}m</span></div>
      </div>

      <div v-if="batteryEstimate" class="glass-divider"></div>
      <div v-if="batteryEstimate" class="glass-section-header">Battery Estimate</div>
      <div v-if="batteryEstimate" class="batt-section">
        <div class="batt-bar">
          <div class="batt-fill" :style="{ width: batteryEstimate.coveragePercent + '%', background: batteryEstimate.coveragePercent >= 80 ? 'var(--color-success)' : batteryEstimate.coveragePercent >= 40 ? 'var(--color-warning)' : 'var(--color-danger)' }"></div>
        </div>
        <div class="batt-text">{{ formatBatteryPct(batteryEstimate.coveragePercent) }}% coverage</div>
        <div class="batt-detail">{{ batteryEstimate.sectorsCoverable }} of {{ batteryEstimate.totalSectors }} sectors</div>
        <div class="batt-detail">{{ batteryEstimate.flightTimeRemaining }}min flight &middot; {{ batteryEstimate.avgTimePerSector.toFixed(1) }}s/sector</div>
      </div>
    </div>

    <div v-else class="hint-msg">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="10" height="10" rx="2"/></svg>
      Draw a rectangle on the map to create a search grid
    </div>
  </div>
</template>

<style scoped>
.field-label { display: block; font-size: 12px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 6px; letter-spacing: -0.01em; }

.area-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.area-item { display: flex; border: 1px solid var(--color-glass-border); border-radius: var(--radius-md); overflow: hidden; }
.area-item.active { border-color: var(--color-accent-border); }
.area-select { flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: transparent; border: none; color: var(--color-text-secondary); font-family: var(--font-family); font-size: 12px; cursor: pointer; transition: all var(--transition-fast); text-align: left; }
.area-select:hover { background: var(--layer-bg-0); }
.area-item.active .area-select { color: var(--color-text-primary); font-weight: 600; background: var(--color-accent-bg); }
.area-badge { font-size: 9px; padding: 1px 6px; border-radius: var(--radius-xs); background: var(--layer-bg-1); color: var(--color-text-secondary); }
.area-menu-btn { display: flex; align-items: center; justify-content: center; width: 28px; border: none; border-left: 1px solid var(--color-glass-border); background: transparent; color: var(--color-text-tertiary); cursor: pointer; transition: all var(--transition-fast); flex-shrink: 0; }
.area-menu-btn:hover { background: var(--layer-bg-1); color: var(--color-text-secondary); }

.rename-input { background: var(--layer-bg-1); border: 1px solid var(--color-accent-border); border-radius: var(--radius-xs); color: var(--color-text-primary); font-family: var(--font-family); font-size: 12px; padding: 2px 6px; width: 100px; outline: none; }

.add-row { display: flex; gap: 6px; margin-bottom: 6px; }
.info-section { margin-top: 0; }
.info-rows { background: var(--layer-bg-0); border: 1px solid var(--layer-bg-2); border-radius: var(--radius-md); padding: 4px 0; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 12px; font-size: 13px; }
.info-row + .info-row { border-top: 1px solid var(--layer-bg-2); }
.info-label { color: var(--color-text-secondary); font-size: 12px; }
.info-value { font-weight: 600; color: var(--color-text-primary); font-variant-numeric: tabular-nums; font-size: 12px; }

.batt-section { padding: 0; }
.batt-bar { height: 8px; background: var(--layer-bg-1); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.batt-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.batt-text { font-size: 13px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 2px; }
.batt-detail { font-size: 11px; color: var(--color-text-secondary); margin-bottom: 1px; }

.hint-msg { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 10px 14px; background: var(--color-accent-bg); border: 1px solid var(--color-accent-border); border-radius: var(--radius-md); font-size: 12px; color: var(--color-accent); line-height: 1.5; }
</style>
