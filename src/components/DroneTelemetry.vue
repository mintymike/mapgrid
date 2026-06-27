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

const useApiTelemetry = ref(false)
const apiConnected = ref(false)
const manualLat = ref(0)
const manualLng = ref(0)
const manualSpeed = ref(5)
const showSetPosition = ref(!dronePosition.value)

function startApi() {
  droneApi.startTelemetryPolling((data) => {
    apiConnected.value = true
    mapGridStore.updateFromApiTelemetry(data)
  }, 500)
}
function stopApi() { droneApi.stopTelemetryPolling(); apiConnected.value = false }
function toggleApi() { useApiTelemetry.value = !useApiTelemetry.value; useApiTelemetry.value ? startApi() : stopApi() }

onMounted(() => { if (droneApi.isMockMode()) { useApiTelemetry.value = true; startApi() } })
onUnmounted(() => { stopApi() })

const fmt = (v: number | undefined, d = 6) => v !== undefined ? v.toFixed(d) : 'N/A'
const fmtTime = (t: Date | undefined) => t ? new Date(t).toLocaleTimeString() : 'N/A'

const setPosition = () => { mapGridStore.setDronePosition(manualLat.value, manualLng.value); showSetPosition.value = false }
const updateSpeed = () => { mapGridStore.setDroneSpeed(manualSpeed.value) }
const useGridCenter = () => {
  if (mapGridStore.searchArea) {
    const { southWest, northEast } = mapGridStore.searchArea
    manualLat.value = (southWest.lat + northEast.lat) / 2
    manualLng.value = (southWest.lng + northEast.lng) / 2
  }
}
</script>

<template>
  <div class="glass-card" style="padding:16px">
    <div class="glass-section-header">Telemetry</div>

    <div class="toggle-row">
      <label class="toggle" @click="toggleApi">
        <span class="toggle-knob" :class="{ on: useApiTelemetry }"></span>
        <span class="toggle-label">Live API</span>
      </label>
      <span v-if="useApiTelemetry" class="glass-badge" :class="apiConnected ? 'success' : 'danger'" style="font-size:10px">{{ apiConnected ? 'Online' : 'Offline' }}</span>
    </div>

    <div class="btn-pair" style="margin-bottom:4px">
      <input v-model.number="manualSpeed" type="number" min="1" max="50" step="0.5" class="glass-input" placeholder="Speed" />
      <button @click="updateSpeed" class="glass-btn">Set</button>
    </div>
    <div class="micro-hint">Current: {{ droneSpeed }} m/s</div>

    <div v-if="dronePosition" class="data-block">
      <div class="status-pill" :class="{ active: isFlying }">{{ isFlying ? 'FLYING' : 'IDLE' }}</div>

      <div class="data-grid">
        <div class="d-row"><span class="d-label">Lat</span><span class="d-value" :style="{fontFamily:'var(--font-mono)'}">{{ fmt(dronePosition.lat) }}</span></div>
        <div class="d-row"><span class="d-label">Lng</span><span class="d-value" :style="{fontFamily:'var(--font-mono)'}">{{ fmt(dronePosition.lng) }}</span></div>
        <div class="d-row"><span class="d-label">Alt</span><span class="d-value">{{ fmt(dronePosition.altitude, 2) }} m</span></div>
        <div class="d-row"><span class="d-label">Hdg</span><span class="d-value">{{ fmt(dronePosition.heading, 1) }}&deg;</span></div>
        <div class="d-row"><span class="d-label">Spd</span><span class="d-value">{{ fmt(dronePosition.speed, 2) }} m/s</span></div>
        <div class="d-row"><span class="d-label">Sctr</span><span class="d-value accent">{{ currentSector?.label || '--' }}</span></div>
        <div class="d-row wide"><span class="d-label">Updated</span><span class="d-value">{{ fmtTime(dronePosition.timestamp) }}</span></div>
      </div>

      <button @click="showSetPosition = true" class="glass-btn" style="width:100%">Reset Position</button>
    </div>

    <div v-if="!dronePosition || showSetPosition" class="setter-box">
      <div class="section-label">Set Position</div>
      <div class="setter-field">
        <label class="field-label">Latitude</label>
        <input v-model.number="manualLat" type="number" step="0.000001" class="glass-input" placeholder="0.000000" />
      </div>
      <div class="setter-field">
        <label class="field-label">Longitude</label>
        <input v-model.number="manualLng" type="number" step="0.000001" class="glass-input" placeholder="0.000000" />
      </div>
      <div class="btn-pair">
        <button @click="useGridCenter" class="glass-btn">Grid Center</button>
        <button @click="setPosition" class="glass-btn success">Set</button>
      </div>
      <button v-if="dronePosition" @click="showSetPosition = false" class="glass-btn danger" style="width:100%;margin-top:6px">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.toggle-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.toggle { display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; }
.toggle-knob { width: 32px; height: 18px; background: var(--layer-bg-4); border-radius: 9px; position: relative; transition: background var(--transition-fast); flex-shrink: 0; }
.toggle-knob::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: var(--color-text-secondary); border-radius: 50%; transition: all var(--transition-fast); }
.toggle-knob.on { background: var(--color-accent-bg); }
.toggle-knob.on::after { background: var(--color-accent); left: 16px; }
.toggle-label { font-size: 12px; color: var(--color-text-secondary); }

.btn-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.micro-hint { font-size: 10px; color: var(--color-text-tertiary); margin-bottom: 10px; }

.data-block { margin-top: 6px; }
.status-pill { display: inline-block; padding: 4px 10px; border-radius: var(--radius-full); font-size: 10px; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 8px; background: var(--layer-bg-1); color: var(--color-text-tertiary); }
.status-pill.active { background: var(--color-accent-bg); color: var(--color-accent); animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }

.data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
.d-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--layer-bg-0); border-radius: var(--radius-xs); }
.d-row.wide { grid-column: span 2; }
.d-label { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; }
.d-value { font-size: 11px; font-weight: 600; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
.d-value.accent { color: var(--color-accent); }

.setter-box { margin-top: 8px; padding: 12px; background: var(--layer-bg-0); border: 1px solid var(--layer-bg-2); border-radius: var(--radius-md); }
.setter-field { margin-bottom: 8px; }
.field-label { display: block; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px; }
.section-label { font-size: 10px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
</style>
