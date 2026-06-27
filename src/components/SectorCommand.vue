<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'

const mapGridStore = useMapGridStore()

const sectorInput = ref('')
const commandHistory = ref<{ sector: string; coords: { lat: number; lng: number }; timestamp: Date }[]>([])
const errorMessage = ref('')

const sectors = computed(() => mapGridStore.sectors)
const selectedSector = computed(() => mapGridStore.selectedSector)
const selectedSectorData = computed(() => selectedSector.value ? mapGridStore.getSectorByLabel(selectedSector.value) : null)

const flyToSector = () => {
  errorMessage.value = ''
  if (!sectorInput.value.trim()) { errorMessage.value = 'Enter a sector label'; return }
  if (!mapGridStore.dronePosition) { errorMessage.value = 'Set drone position first'; return }
  const target = mapGridStore.flyToSector(sectorInput.value.toUpperCase())
  if (target) {
    commandHistory.value.unshift({ sector: sectorInput.value.toUpperCase(), coords: target, timestamp: new Date() })
    if (commandHistory.value.length > 10) commandHistory.value.pop()
    mapGridStore.startFlyingTo(target)
    sectorInput.value = ''
  } else { errorMessage.value = `"${sectorInput.value.toUpperCase()}" not found` }
}

const selectFromList = (l: string) => { sectorInput.value = l }
const fmt = (n: number) => n.toFixed(6)
const fmtTime = (t: Date) => t.toLocaleTimeString()
</script>

<template>
  <div class="glass-card" style="padding:16px">
    <div class="glass-section-header">Sector Commands</div>

    <div v-if="selectedSectorData" class="coord-box">
      <div class="coord-head">Selected: <span class="accent">{{ selectedSector }}</span></div>
      <div class="coord-lines">
        <div class="cl"><span>Center</span><span class="mono">{{ fmt(selectedSectorData.center.lat) }}&deg;, {{ fmt(selectedSectorData.center.lng) }}&deg;</span></div>
        <div class="cl"><span>SW</span><span class="mono">{{ fmt(selectedSectorData.bounds.southWest.lat) }}&deg;, {{ fmt(selectedSectorData.bounds.southWest.lng) }}&deg;</span></div>
        <div class="cl"><span>NE</span><span class="mono">{{ fmt(selectedSectorData.bounds.northEast.lat) }}&deg;, {{ fmt(selectedSectorData.bounds.northEast.lng) }}&deg;</span></div>
      </div>
    </div>

    <div class="input-pair">
      <input v-model="sectorInput" type="text" placeholder="e.g. B4" @keyup.enter="flyToSector" :disabled="sectors.length===0" class="glass-input input-upper" />
      <button @click="flyToSector" :disabled="sectors.length===0" class="glass-btn accent">Fly</button>
    </div>
    <p v-if="errorMessage" class="err">{{ errorMessage }}</p>
    <p v-if="sectors.length===0" class="hint">Draw a grid first to enable commands</p>

    <div v-if="sectors.length>0" class="grid-section">
      <div class="micro-label">Available Sectors</div>
      <div class="sector-grid glass-scroll">
        <button v-for="s in sectors" :key="s.label" @click="selectFromList(s.label)" :class="['sg-btn',{sel:selectedSector===s.label}]">{{ s.label }}</button>
      </div>
    </div>

    <div v-if="commandHistory.length>0" class="hist-section">
      <div class="micro-label">History</div>
      <div class="hist-list">
        <div v-for="(c,i) in commandHistory" :key="i" class="hist-item">
          <span class="hi-badge accent">{{ c.sector }}</span>
          <span class="hi-coords mono">{{ fmt(c.coords.lat) }}, {{ fmt(c.coords.lng) }}</span>
          <span class="hi-time">{{ fmtTime(c.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coord-box { padding: 10px 12px; margin-bottom: 8px; background: var(--layer-bg-0); border: 1px solid var(--layer-bg-2); border-radius: var(--radius-md); }
.coord-head { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 6px; }
.coord-head .accent { color: var(--color-accent); font-weight: 600; }
.coord-lines { display: flex; flex-direction: column; gap: 3px; }
.cl { display: flex; gap: 10px; font-size: 10px; }
.cl span:first-child { color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; min-width: 32px; }
.mono { font-family: var(--font-mono); color: var(--color-text-primary); font-size: 10px; }

.input-pair { display: flex; gap: 6px; margin-bottom: 4px; }
.input-upper { text-transform: uppercase; flex: 1; }
.err { color: var(--color-danger); font-size: 10px; margin: 0 0 4px; }
.hint { color: var(--color-accent); font-size: 10px; margin: 0 0 4px; }

.grid-section { margin-top: 8px; }
.micro-label { font-size: 10px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.sector-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 4px; max-height: 140px; overflow-y: auto; }
.sg-btn {
  padding: 5px 3px; border: 1px solid var(--layer-border-1); border-radius: var(--radius-sm);
  background: transparent; color: var(--color-text-secondary);
  font-size: 10px; font-weight: 600; cursor: pointer; transition: all var(--transition-fast);
  text-align: center; font-family: var(--font-family);
}
.sg-btn:hover { background: var(--layer-bg-2); color: var(--color-text-primary); }
.sg-btn.sel { background: var(--color-accent-bg); border-color: var(--color-accent-border); color: var(--color-accent); }

.hist-section { margin-top: 8px; }
.hist-list { display: flex; flex-direction: column; gap: 3px; max-height: 100px; overflow-y: auto; }
.hist-item { display: flex; align-items: center; gap: 8px; padding: 5px 9px; background: var(--layer-bg-0); border-radius: var(--radius-xs); border-left: 2px solid var(--color-accent); }
.hi-badge { font-size: 10px; font-weight: 700; min-width: 24px; }
.hi-coords { font-size: 9px; color: var(--color-text-secondary); flex: 1; }
.hi-time { font-size: 9px; color: var(--color-text-tertiary); }
</style>
