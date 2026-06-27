<script setup lang="ts">
import { ref, computed } from 'vue'
import { droneApi } from '@/services/droneApi'
import { useMapGridStore } from '@/stores/mapGrid'
import type { Telemetry } from '@/types'

const mapGridStore = useMapGridStore()

const telemetry = ref<Telemetry | null>(null)
const connected = ref(false)
const executing = ref(false)
const executingLabel = ref('')
const lastError = ref('')
const takeoffAltitude = ref(10)
const targetSpeed = ref(5)

droneApi.startTelemetryPolling((data) => {
  telemetry.value = data
  connected.value = true
}, 500)

const isArmed = computed(() => telemetry.value?.status.armed ?? false)
const isArmable = computed(() => telemetry.value?.status.is_armable ?? false)
const currentMode = computed(() => telemetry.value?.status.mode ?? 'UNKNOWN')
const batteryLevel = computed(() => telemetry.value?.battery.level ?? 0)
const currentAltitude = computed(() => telemetry.value?.position.altitude_agl ?? 0)

function confirm(msg: string): boolean {
  return window.confirm(msg)
}

async function exec(fn: () => Promise<any>, name: string, logAction: string) {
  executing.value = true; executingLabel.value = name; lastError.value = ''
  try {
    await fn()
    mapGridStore.log(logAction as any, name)
  } catch (e) {
    lastError.value = `${name}: ${e instanceof Error ? e.message : 'Error'}`
  } finally { executing.value = false; executingLabel.value = '' }
}

function arm() { if (confirm('Arm the drone?')) exec(() => droneApi.arm(), 'Arming', 'arm') }
function disarm() { if (confirm('Disarm the drone?')) exec(() => droneApi.disarm(), 'Disarming', 'disarm') }
function takeoff() {
  if (confirm(`Take off to ${takeoffAltitude.value}m?`)) exec(() => droneApi.takeoff(takeoffAltitude.value), 'Takeoff', 'takeoff')
}
function land() { if (confirm('Land the drone? This will end the flight.')) exec(() => droneApi.land(), 'Landing', 'land') }
function rtl() { if (confirm('Return to launch? Drone will fly home.')) exec(() => droneApi.returnToLaunch(), 'RTL', 'rtl') }
function setSpeed() { exec(() => droneApi.setSpeed(targetSpeed.value), 'Set Speed', 'set-speed') }

function battColor(l: number): string {
  if (l > 60) return 'var(--color-success)'
  if (l > 30) return 'var(--color-warning)'
  return 'var(--color-danger)'
}
</script>

<template>
  <div class="glass-card" style="padding:16px">
    <div class="glass-section-header">Drone Control</div>

    <div class="status-line" :class="connected ? 'ok' : 'err'">
      <span class="status-dot"></span>
      {{ connected ? 'Connected' : 'Disconnected' }}
      <span v-if="droneApi.isMockMode()" class="mock-pill">MOCK</span>
      <span v-if="executing" class="exec-pill">&#9704; {{ executingLabel }}</span>
    </div>

    <div v-if="telemetry" class="telem-grid">
      <div class="tcell"><div class="tcell-label">Mode</div><div class="tcell-value accent">{{ currentMode }}</div></div>
      <div class="tcell"><div class="tcell-label">State</div><div class="tcell-value" :class="isArmed ? 'danger' : 'ok'">{{ isArmed ? 'ARMED' : 'DISARMED' }}</div></div>
      <div class="tcell wide"><div class="tcell-label">Battery</div>
        <div class="batt"><div class="batt-fill" :style="{width:batteryLevel+'%',background:battColor(batteryLevel)}"></div><span class="batt-pct">{{ batteryLevel.toFixed(0) }}%</span></div>
      </div>
      <div class="tcell"><div class="tcell-label">Altitude</div><div class="tcell-value">{{ currentAltitude.toFixed(1) }} m</div></div>
    </div>

    <div v-if="lastError" class="err-msg">{{ lastError }}</div>

    <div class="section">
      <div class="section-label">Commands</div>
      <div class="btn-pair">
        <button class="glass-btn warning" @click="arm" :disabled="executing || isArmed || !isArmable">
          <span class="btn-spin" v-if="executing && executingLabel === 'Arming'"></span>Arm
        </button>
        <button class="glass-btn" @click="disarm" :disabled="executing || !isArmed">
          <span class="btn-spin" v-if="executing && executingLabel === 'Disarming'"></span>Disarm
        </button>
      </div>
      <div class="btn-pair">
        <input type="number" v-model.number="takeoffAltitude" min="2" max="100" class="glass-input" :disabled="executing" style="flex:0 0 72px" placeholder="Alt" />
        <button class="glass-btn success" @click="takeoff" :disabled="executing || !isArmed || currentAltitude > 1" style="flex:1">
          <span class="btn-spin" v-if="executing && executingLabel === 'Takeoff'"></span>Takeoff
        </button>
      </div>
      <div class="btn-pair">
        <button class="glass-btn danger" @click="land" :disabled="executing || !isArmed">
          <span class="btn-spin" v-if="executing && executingLabel === 'Landing'"></span>Land
        </button>
        <button class="glass-btn" @click="rtl" :disabled="executing || !isArmed">
          <span class="btn-spin" v-if="executing && executingLabel === 'RTL'"></span>RTL
        </button>
      </div>
    </div>

    <div class="section">
      <div class="section-label">Speed</div>
      <div class="slider-row">
        <input type="range" v-model.number="targetSpeed" min="1" max="20" step="0.5" class="range-slider" />
        <span class="slider-val">{{ targetSpeed }} m/s</span>
      </div>
      <button class="glass-btn" @click="setSpeed" :disabled="executing" style="width:100%;margin-top:6px">Set Speed</button>
    </div>

    <div v-if="telemetry" class="section">
      <div class="section-label">GPS</div>
      <div class="gps-grid">
        <div class="gps-row"><span>Fix</span><span>{{ telemetry.gps.fix_type }}D</span></div>
        <div class="gps-row"><span>Satellites</span><span>{{ telemetry.gps.satellites_visible }}</span></div>
        <div class="gps-row"><span>Accuracy</span><span>{{ telemetry.gps.eph.toFixed(2) }}m</span></div>
        <div class="gps-row"><span>Ground</span><span>{{ telemetry.velocity.groundspeed.toFixed(1) }} m/s</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-line { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: var(--radius-md); font-size: 12px; font-weight: 600; margin-bottom: 10px; letter-spacing: -0.01em; }
.status-line.ok { background: var(--color-success-bg); color: var(--color-success); border: 1px solid var(--color-success-border); }
.status-line.err { background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid var(--color-danger-border); }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: blink 2s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
.mock-pill { margin-left: auto; font-size: 9px; padding: 1px 6px; border-radius: var(--radius-xs); background: var(--layer-bg-2); letter-spacing: 0.05em; }
.exec-pill { margin-left: auto; font-size: 10px; padding: 1px 8px; border-radius: var(--radius-xs); background: var(--color-accent-bg); color: var(--color-accent); letter-spacing: 0.03em; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

.btn-spin { display: inline-block; width: 10px; height: 10px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.telem-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
.tcell { padding: 9px 11px; background: var(--layer-bg-0); border: 1px solid var(--layer-border-0); border-radius: var(--radius-sm); }
.tcell.wide { grid-column: span 2; }
.tcell-label { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
.tcell-value { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.tcell-value.accent { color: var(--color-accent); }
.tcell-value.danger { color: var(--color-danger); }
.tcell-value.ok { color: var(--color-success); }

.batt { position: relative; height: 20px; background: var(--layer-bg-1); border-radius: 3px; overflow: hidden; margin-top: 4px; }
.batt-fill { position: absolute; height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.batt-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--color-text-primary); }

.err-msg { padding: 7px 12px; background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); color: var(--color-danger); border-radius: var(--radius-md); font-size: 11px; margin-bottom: 10px; }

.section { margin-top: 8px; }
.section-label { font-size: 10px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
.btn-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }

.slider-row { display: flex; align-items: center; gap: 10px; }
.range-slider { flex: 1; height: 4px; -webkit-appearance: none; background: var(--layer-bg-3); border-radius: 2px; outline: none; }
.range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--color-accent); cursor: pointer; border: 2px solid var(--color-bg); box-shadow: 0 0 8px rgba(107,159,255,0.3); }
.range-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--color-accent); cursor: pointer; border: 2px solid var(--color-bg); }
.slider-val { font-size: 12px; font-weight: 600; color: var(--color-text-primary); min-width: 52px; text-align: right; font-variant-numeric: tabular-nums; }

.gps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.gps-row { display: flex; justify-content: space-between; padding: 5px 9px; background: var(--layer-bg-0); border-radius: var(--radius-xs); font-size: 11px; color: var(--color-text-secondary); }
.gps-row span:last-child { font-weight: 600; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
</style>
