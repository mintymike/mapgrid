<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'

const mapGridStore = useMapGridStore()

export type SearchPattern = 'parallel' | 'expanding-square' | 'contour' | 'sector'

const selectedPattern = ref<SearchPattern>('parallel')
const isRunning = ref(false)
const isPaused = ref(false)
const searchedSectors = ref<Set<string>>(new Set())
const parallelDirection = ref<'horizontal' | 'vertical'>('horizontal')
const expandingSquareCenter = ref<string>('')
const sectorOrder = ref<'row-by-row' | 'column-by-column'>('row-by-row')

const patterns = [
  { id: 'parallel', name: 'Parallel Track' },
  { id: 'expanding-square', name: 'Expanding Square' },
  { id: 'contour', name: 'Contour' },
  { id: 'sector', name: 'Sector-by-Sector' },
] as const

const totalSectors = computed(() => mapGridStore.sectors.length)
const searchedCount = computed(() => searchedSectors.value.size)
const progressPercent = computed(() => totalSectors.value > 0 ? (searchedCount.value / totalSectors.value) * 100 : 0)
const canStart = computed(() => mapGridStore.sectors.length > 0 && mapGridStore.dronePosition && !isRunning.value)

function startSearch() {
  if (!canStart.value) return
  searchedSectors.value.clear(); isRunning.value = true; isPaused.value = false
  mapGridStore.startSearchPattern(selectedPattern.value, { direction: parallelDirection.value, center: expandingSquareCenter.value, order: sectorOrder.value })
}
function pauseSearch() { isPaused.value = !isPaused.value; mapGridStore.pauseSearchPattern(isPaused.value) }
function stopSearch() { isRunning.value = false; isPaused.value = false; mapGridStore.stopSearchPattern(); searchedSectors.value.clear() }
function resetSearch() { stopSearch(); mapGridStore.clearSearchPath() }
</script>

<template>
  <div class="glass-card" style="padding:16px">
    <div class="glass-section-header">Search Patterns</div>

    <div class="pattern-list">
      <button v-for="p in patterns" :key="p.id" class="pattern-btn" :class="{ active: selectedPattern === p.id }" @click="selectedPattern = p.id as SearchPattern" :disabled="isRunning">
        <span class="pat-name">{{ p.name }}</span>
      </button>
    </div>

    <div v-if="selectedPattern === 'parallel'" class="params-box">
      <div class="micro-label">Direction</div>
      <div class="chip-row">
        <button class="chip" :class="{on:parallelDirection==='horizontal'}" @click="parallelDirection='horizontal'">Horizontal</button>
        <button class="chip" :class="{on:parallelDirection==='vertical'}" @click="parallelDirection='vertical'">Vertical</button>
      </div>
    </div>

    <div v-if="selectedPattern === 'expanding-square'" class="params-box">
      <div class="micro-label">Center Sector</div>
      <input v-model="expandingSquareCenter" placeholder="e.g. C3" :disabled="isRunning" class="glass-input" />
      <p class="micro-hint">Leave empty for grid center</p>
    </div>

    <div v-if="selectedPattern === 'sector'" class="params-box">
      <div class="micro-label">Order</div>
      <div class="chip-row">
        <button class="chip" :class="{on:sectorOrder==='row-by-row'}" @click="sectorOrder='row-by-row'">Row by Row</button>
        <button class="chip" :class="{on:sectorOrder==='column-by-column'}" @click="sectorOrder='column-by-column'">Col by Col</button>
      </div>
    </div>

    <div v-if="totalSectors > 0" class="prog-section">
      <div class="micro-label">Progress</div>
      <div class="prog-track">
        <div class="prog-fill" :style="{width:progressPercent+'%'}"></div>
        <span class="prog-text">{{ searchedCount }}/{{ totalSectors }} ({{ progressPercent.toFixed(1) }}%)</span>
      </div>
    </div>

    <div class="btn-row">
      <button v-if="!isRunning" class="glass-btn accent" @click="startSearch" :disabled="!canStart">Start</button>
      <template v-else>
        <button class="glass-btn" @click="pauseSearch">{{ isPaused ? 'Resume' : 'Pause' }}</button>
        <button class="glass-btn danger" @click="stopSearch">Stop</button>
      </template>
      <button class="glass-btn" @click="resetSearch" :disabled="isRunning">Reset</button>
    </div>

    <div v-if="!mapGridStore.dronePosition" class="warn-msg">Set drone position first</div>
    <div v-else-if="totalSectors === 0" class="warn-msg">Create a grid first</div>
  </div>
</template>

<style scoped>
.pattern-list { display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px; }
.pattern-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 13px;
  background: transparent;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-family); font-size: 12px; font-weight: 500;
}
.pattern-btn:hover:not(:disabled) { background: var(--layer-bg-1); border-color: var(--layer-border-2); }
.pattern-btn.active { background: var(--color-accent-bg); border-color: var(--color-accent-border); color: var(--color-accent); }
.pattern-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.pat-name { font-weight: 500; }

.params-box { padding: 10px 12px; background: var(--layer-bg-0); border: 1px solid var(--layer-border-0); border-radius: var(--radius-md); margin-bottom: 8px; }

.micro-label { font-size: 10px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.micro-hint { font-size: 10px; color: var(--color-text-tertiary); margin: 4px 0 0 0; }

.chip-row { display: flex; gap: 6px; }
.chip {
  flex: 1; padding: 7px 12px;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-family); font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.chip:hover { background: var(--layer-bg-1); }
.chip.on { border-color: var(--color-accent-border); background: var(--color-accent-bg); color: var(--color-accent); font-weight: 500; }

.prog-section { margin: 8px 0; }
.prog-track { position: relative; height: 28px; background: var(--layer-bg-1); border-radius: var(--radius-sm); overflow: hidden; }
.prog-fill { position: absolute; height: 100%; background: linear-gradient(90deg, rgba(107,159,255,0.25), rgba(107,159,255,0.45)); transition: width 0.5s ease; }
.prog-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: var(--color-text-primary); }

.btn-row { display: flex; gap: 6px; }
.btn-row .glass-btn { flex: 1; min-width: 0; }

.warn-msg { margin-top: 8px; padding: 9px 13px; border-radius: var(--radius-md); background: var(--color-warning-bg); border: 1px solid var(--color-warning-border); color: var(--color-warning); font-size: 11px; }
</style>
