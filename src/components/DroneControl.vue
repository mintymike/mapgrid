<script setup lang="ts">
import { ref, computed } from 'vue'
import { droneApi } from '@/services/droneApi'
import type { Telemetry } from '@/services/droneApi'

const telemetry = ref<Telemetry | null>(null)
const connected = ref(false)
const executing = ref(false)
const lastError = ref('')
const takeoffAltitude = ref(10)
const targetSpeed = ref(5)

// Start telemetry updates
droneApi.startTelemetryPolling((data) => {
  telemetry.value = data
  connected.value = true
}, 500) // Update every 500ms

const isArmed = computed(() => telemetry.value?.status.armed ?? false)
const isArmable = computed(() => telemetry.value?.status.is_armable ?? false)
const currentMode = computed(() => telemetry.value?.status.mode ?? 'UNKNOWN')
const batteryLevel = computed(() => telemetry.value?.battery.level ?? 0)
const currentAltitude = computed(() => telemetry.value?.position.altitude_agl ?? 0)

async function executeCommand(commandFn: () => Promise<any>, commandName: string) {
  executing.value = true
  lastError.value = ''
  try {
    await commandFn()
    console.log(`${commandName} executed successfully`)
  } catch (error) {
    lastError.value = `${commandName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`${commandName} error:`, error)
  } finally {
    executing.value = false
  }
}

async function arm() {
  await executeCommand(() => droneApi.arm(), 'Arm')
}

async function disarm() {
  await executeCommand(() => droneApi.disarm(), 'Disarm')
}

async function takeoff() {
  await executeCommand(() => droneApi.takeoff(takeoffAltitude.value), 'Takeoff')
}

async function land() {
  await executeCommand(() => droneApi.land(), 'Land')
}

async function rtl() {
  await executeCommand(() => droneApi.returnToLaunch(), 'Return to Launch')
}

async function setSpeed() {
  await executeCommand(() => droneApi.setSpeed(targetSpeed.value), 'Set Speed')
}

function getBatteryColor(level: number): string {
  if (level > 60) return '#28a745'
  if (level > 30) return '#ffc107'
  return '#dc3545'
}

function getModeColor(mode: string): string {
  const modeColors: Record<string, string> = {
    'GUIDED': '#2196f3',
    'STABILIZE': '#6c757d',
    'LAND': '#ff9800',
    'RTL': '#9c27b0',
    'AUTO': '#00bcd4',
    'LOITER': '#4caf50'
  }
  return modeColors[mode] || '#6c757d'
}
</script>

<template>
  <div class="drone-control">
    <h2>🚁 Drone Control</h2>

    <!-- Connection Status -->
    <div class="status-bar" :class="{ connected: connected, disconnected: !connected }">
      <span class="status-dot"></span>
      {{ connected ? 'Connected' : 'Disconnected' }}
      <span v-if="droneApi.isMockMode()" class="mock-badge">MOCK</span>
    </div>

    <!-- Telemetry Overview -->
    <div v-if="telemetry" class="telemetry-overview">
      <div class="telemetry-item">
        <div class="telemetry-label">Mode</div>
        <div class="telemetry-value mode-badge" :style="{ background: getModeColor(currentMode) }">
          {{ currentMode }}
        </div>
      </div>

      <div class="telemetry-item">
        <div class="telemetry-label">Status</div>
        <div class="telemetry-value" :class="{ armed: isArmed, disarmed: !isArmed }">
          {{ isArmed ? '🔴 ARMED' : '🟢 DISARMED' }}
        </div>
      </div>

      <div class="telemetry-item">
        <div class="telemetry-label">Battery</div>
        <div class="battery-bar">
          <div
            class="battery-fill"
            :style="{ width: batteryLevel + '%', background: getBatteryColor(batteryLevel) }"
          ></div>
          <span class="battery-text">{{ batteryLevel.toFixed(0) }}%</span>
        </div>
      </div>

      <div class="telemetry-item">
        <div class="telemetry-label">Altitude</div>
        <div class="telemetry-value">{{ currentAltitude.toFixed(1) }} m</div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="lastError" class="error-box">
      ⚠️ {{ lastError }}
    </div>

    <!-- Basic Controls -->
    <div class="control-section">
      <h3>Basic Commands</h3>

      <div class="control-row">
        <button
          class="btn btn-warning"
          @click="arm"
          :disabled="executing || isArmed || !isArmable"
        >
          🔓 Arm
        </button>
        <button
          class="btn btn-secondary"
          @click="disarm"
          :disabled="executing || !isArmed"
        >
          🔒 Disarm
        </button>
      </div>

      <div class="control-group">
        <label>Takeoff Altitude (m):</label>
        <div class="input-with-button">
          <input
            type="number"
            v-model.number="takeoffAltitude"
            min="2"
            max="100"
            step="1"
            :disabled="executing"
          />
          <button
            class="btn btn-success"
            @click="takeoff"
            :disabled="executing || !isArmed || currentAltitude > 1"
          >
            🚀 Takeoff
          </button>
        </div>
      </div>

      <div class="control-row">
        <button
          class="btn btn-danger"
          @click="land"
          :disabled="executing || !isArmed"
        >
          ⬇️ Land
        </button>
        <button
          class="btn btn-info"
          @click="rtl"
          :disabled="executing || !isArmed"
        >
          🏠 RTL
        </button>
      </div>
    </div>

    <!-- Speed Control -->
    <div class="control-section">
      <h3>Speed Settings</h3>

      <div class="control-group">
        <label>Target Speed (m/s):</label>
        <div class="input-with-button">
          <input
            type="range"
            v-model.number="targetSpeed"
            min="1"
            max="20"
            step="0.5"
            :disabled="executing"
            class="speed-slider"
          />
          <span class="speed-value">{{ targetSpeed }} m/s</span>
        </div>
        <button
          class="btn btn-primary btn-small"
          @click="setSpeed"
          :disabled="executing"
        >
          Set Speed
        </button>
      </div>
    </div>

    <!-- GPS Info -->
    <div v-if="telemetry" class="info-section">
      <h3>GPS Status</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Fix Type:</span>
          <span class="info-value">{{ telemetry.gps.fix_type }}D</span>
        </div>
        <div class="info-item">
          <span class="info-label">Satellites:</span>
          <span class="info-value">{{ telemetry.gps.satellites_visible }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Accuracy:</span>
          <span class="info-value">{{ telemetry.gps.eph.toFixed(2) }}m</span>
        </div>
        <div class="info-item">
          <span class="info-label">Ground Speed:</span>
          <span class="info-value">{{ telemetry.velocity.groundspeed.toFixed(1) }} m/s</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drone-control {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2em;
  color: #333;
}

h3 {
  margin-top: 20px;
  margin-bottom: 12px;
  font-size: 1em;
  color: #555;
  font-weight: 600;
}

.status-bar {
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9em;
}

.status-bar.connected {
  background: #d4edda;
  color: #155724;
}

.status-bar.disconnected {
  background: #f8d7da;
  color: #721c24;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.mock-badge {
  margin-left: auto;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-size: 0.8em;
}

.telemetry-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.telemetry-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.telemetry-label {
  font-size: 0.75em;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.telemetry-value {
  font-weight: 600;
  font-size: 0.95em;
  color: #333;
}

.telemetry-value.armed {
  color: #dc3545;
}

.telemetry-value.disarmed {
  color: #28a745;
}

.mode-badge {
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  text-align: center;
  font-size: 0.85em;
}

.battery-bar {
  position: relative;
  height: 24px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.battery-fill {
  position: absolute;
  height: 100%;
  transition: width 0.3s ease;
}

.battery-text {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85em;
  color: #333;
  z-index: 1;
}

.error-box {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 0.85em;
}

.control-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.control-section:last-child {
  border-bottom: none;
}

.control-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  font-size: 0.85em;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}

.input-with-button {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

input[type="number"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.9em;
}

.speed-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #dee2e6;
  outline: none;
  -webkit-appearance: none;
}

.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2196f3;
  cursor: pointer;
}

.speed-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2196f3;
  cursor: pointer;
  border: none;
}

.speed-value {
  min-width: 60px;
  font-weight: 600;
  font-size: 0.9em;
  color: #333;
}

.btn {
  padding: 10px 16px;
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

.btn-small {
  padding: 6px 12px;
  font-size: 0.85em;
  width: 100%;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1976d2;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-warning {
  background: #ffc107;
  color: #333;
}

.btn-warning:hover:not(:disabled) {
  background: #e0a800;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #138496;
}

.info-section {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85em;
}

.info-label {
  color: #666;
}

.info-value {
  font-weight: 600;
  color: #333;
}
</style>
