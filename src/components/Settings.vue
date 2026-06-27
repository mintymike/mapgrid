<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { droneApi } from '@/services/droneApi'

interface AppSettings {
  apiBaseUrl: string; useMockMode: boolean; telemetryInterval: number
  defaultTakeoffAltitude: number; defaultSpeed: number
  voiceCommandsEnabled: boolean; voiceConfidenceThreshold: number
}

const defaults: AppSettings = {
  apiBaseUrl: 'http://100.64.0.1:8000', useMockMode: true, telemetryInterval: 500,
  defaultTakeoffAltitude: 10, defaultSpeed: 5, voiceCommandsEnabled: true, voiceConfidenceThreshold: 0.6
}

const settings = ref<AppSettings>({ ...defaults })
const saveMsg = ref('')
const saveType = ref<'success'|'error'>('success')
const testing = ref(false)
const testResult = ref('')

onMounted(() => load())

function load() {
  const s = localStorage.getItem('mapgrid-settings')
  if (s) { try { const p = JSON.parse(s); settings.value = { ...defaults, ...p }; apply() } catch {} }
}

function save() {
  try { localStorage.setItem('mapgrid-settings', JSON.stringify(settings.value)); apply(); show('Saved', 'success') }
  catch { show('Failed to save', 'error') }
}

function apply() { droneApi.setMockMode(settings.value.useMockMode); droneApi.setBaseUrl(settings.value.apiBaseUrl) }

function reset() { if (confirm('Reset?')) { settings.value = { ...defaults }; save() } }

async function testConn() {
  testing.value = true; testResult.value = ''
  try {
    const was = droneApi.isMockMode(); droneApi.setMockMode(false)
    const h = await droneApi.healthCheck()
    testResult.value = h.status === 'healthy' ? `Connected. Vehicle ${h.vehicle_connected ? 'online' : 'offline'}` : 'Unhealthy'
    droneApi.setMockMode(was)
  } catch (e) { testResult.value = `Failed: ${e instanceof Error ? e.message : 'Unknown'}`; droneApi.setMockMode(settings.value.useMockMode) }
  finally { testing.value = false }
}

function show(m: string, t: 'success'|'error') { saveMsg.value = m; saveType.value = t; setTimeout(() => saveMsg.value = '', 3000) }

function export_() {
  const b = new Blob([JSON.stringify(settings.value, null, 2)], { type: 'application/json' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'mapgrid-settings.json'; a.click()
}

function import_() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'
  inp.onchange = (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = (ev) => { try { const d = JSON.parse(ev.target?.result as string); settings.value = { ...defaults, ...d }; save(); show('Imported','success') } catch { show('Invalid file','error') } }
    r.readAsText(f)
  }
  inp.click()
}
</script>

<template>
  <div class="glass-card" style="padding:16px">
    <div class="glass-section-header">Settings</div>

    <div v-if="saveMsg" class="toast" :class="saveType">{{ saveMsg }}</div>

    <div class="sect">
      <div class="sect-label">API</div>
      <div class="row">
        <label class="toggle" @click="settings.useMockMode = !settings.useMockMode">
          <span class="toggle-knob" :class="{on:settings.useMockMode}"></span>
          <span class="toggle-label">Mock Mode</span>
        </label>
      </div>
      <div class="row" :class="{dim:settings.useMockMode}">
        <label class="field-label">Raspberry Pi URL</label>
        <input type="text" v-model="settings.apiBaseUrl" :disabled="settings.useMockMode" class="glass-input" />
        <p class="desc">Tailscale IP and port</p>
      </div>
      <button @click="testConn" :disabled="testing||settings.useMockMode" class="glass-btn" style="width:100%">{{ testing?'Testing...':'Test Connection' }}</button>
      <div v-if="testResult" class="test-out">{{ testResult }}</div>
      <div class="row" style="margin-top:10px">
        <label class="field-label">Telemetry Interval</label>
        <div class="slider-row">
          <input type="range" v-model.number="settings.telemetryInterval" min="100" max="2000" step="100" class="range-slider" />
          <span class="slider-val">{{ settings.telemetryInterval }}ms</span>
        </div>
      </div>
    </div>

    <div class="sect">
      <div class="sect-label">Defaults</div>
      <div class="col2">
        <div>
          <label class="field-label">Altitude (m)</label>
          <input type="number" v-model.number="settings.defaultTakeoffAltitude" min="2" max="100" class="glass-input" />
        </div>
        <div>
          <label class="field-label">Speed (m/s)</label>
          <input type="number" v-model.number="settings.defaultSpeed" min="1" max="20" step="0.5" class="glass-input" />
        </div>
      </div>
    </div>

    <div class="sect">
      <div class="sect-label">Voice</div>
      <div class="row">
        <label class="toggle" @click="settings.voiceCommandsEnabled = !settings.voiceCommandsEnabled">
          <span class="toggle-knob" :class="{on:settings.voiceCommandsEnabled}"></span>
          <span class="toggle-label">Enabled</span>
        </label>
      </div>
      <div class="row" :class="{dim:!settings.voiceCommandsEnabled}">
        <label class="field-label">Confidence</label>
        <div class="slider-row">
          <input type="range" v-model.number="settings.voiceConfidenceThreshold" min="0.3" max="0.95" step="0.05" :disabled="!settings.voiceCommandsEnabled" class="range-slider" />
          <span class="slider-val">{{ (settings.voiceConfidenceThreshold*100).toFixed(0) }}%</span>
        </div>
      </div>
    </div>

    <div class="btn-pair">
      <button @click="save" class="glass-btn accent">Save</button>
      <button @click="reset" class="glass-btn">Reset</button>
    </div>

    <div class="sect">
      <div class="sect-label">Backup</div>
      <div class="btn-pair">
        <button @click="export_" class="glass-btn">Export</button>
        <button @click="import_" class="glass-btn">Import</button>
      </div>
    </div>

    <p class="footnote">Settings persist in localStorage</p>
  </div>
</template>

<style scoped>
.toast { padding: 7px 12px; border-radius: var(--radius-md); font-size: 11px; font-weight: 500; margin-bottom: 8px; }
.toast.success { background: var(--color-success-bg); color: var(--color-success); }
.toast.error { background: var(--color-danger-bg); color: var(--color-danger); }

.sect { padding: 10px 12px; background: var(--layer-bg-0); border: 1px solid var(--layer-bg-1); border-radius: var(--radius-md); margin-bottom: 8px; }
.sect-label { font-size: 10px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }

.row { margin-bottom: 8px; }
.row:last-child { margin-bottom: 0; }
.row.dim { opacity: 0.35; pointer-events: none; }

.field-label { display: block; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px; }

.toggle { display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; }
.toggle-knob { width: 32px; height: 18px; background: var(--layer-bg-4); border-radius: 9px; position: relative; transition: background var(--transition-fast); flex-shrink: 0; }
.toggle-knob::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: var(--color-text-secondary); border-radius: 50%; transition: all var(--transition-fast); }
.toggle-knob.on { background: var(--color-accent-bg); }
.toggle-knob.on::after { background: var(--color-accent); left: 16px; }
.toggle-label { font-size: 12px; color: var(--color-text-secondary); }

.desc { font-size: 9px; color: var(--color-text-tertiary); margin: 3px 0 0; }

.test-out { margin-top: 6px; padding: 7px 10px; font-size: 10px; color: var(--color-text-secondary); background: var(--layer-bg-0); border-radius: var(--radius-sm); }

.slider-row { display: flex; align-items: center; gap: 10px; }
.range-slider { flex: 1; height: 4px; -webkit-appearance: none; background: var(--layer-bg-3); border-radius: 2px; outline: none; }
.range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--color-accent); cursor: pointer; }
.range-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--color-accent); cursor: pointer; border: none; }
.slider-val { font-size: 11px; font-weight: 600; color: var(--color-text-primary); min-width: 50px; text-align: right; font-variant-numeric: tabular-nums; }

.col2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.btn-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

.footnote { font-size: 9px; color: var(--color-text-tertiary); text-align: center; margin-top: 6px; }
</style>
