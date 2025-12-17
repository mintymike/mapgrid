<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { droneApi } from '@/services/droneApi'

// Settings interface
interface AppSettings {
  apiBaseUrl: string
  useMockMode: boolean
  telemetryInterval: number
  defaultTakeoffAltitude: number
  defaultSpeed: number
  voiceCommandsEnabled: boolean
  voiceConfidenceThreshold: number
}

// Default settings
const defaultSettings: AppSettings = {
  apiBaseUrl: 'http://100.64.0.1:8000',
  useMockMode: true,
  telemetryInterval: 500,
  defaultTakeoffAltitude: 10,
  defaultSpeed: 5,
  voiceCommandsEnabled: true,
  voiceConfidenceThreshold: 0.6
}

// Current settings
const settings = ref<AppSettings>({ ...defaultSettings })
const saveMessage = ref('')
const saveMessageType = ref<'success' | 'error'>('success')

// Connection test
const testingConnection = ref(false)
const connectionTestResult = ref('')

// Load settings from localStorage
onMounted(() => {
  loadSettings()
})

function loadSettings() {
  const stored = localStorage.getItem('mapgrid-settings')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      settings.value = { ...defaultSettings, ...parsed }
      applySettings()
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }
}

function saveSettings() {
  try {
    localStorage.setItem('mapgrid-settings', JSON.stringify(settings.value))
    applySettings()
    showMessage('Settings saved successfully!', 'success')
  } catch (e) {
    console.error('Failed to save settings:', e)
    showMessage('Failed to save settings', 'error')
  }
}

function applySettings() {
  // Apply mock mode setting to droneApi
  droneApi.setMockMode(settings.value.useMockMode)

  // Apply API base URL
  droneApi.setBaseUrl(settings.value.apiBaseUrl)

  console.log('Settings applied:', settings.value)
  console.log('Current API Base URL:', droneApi.getBaseUrl())
  console.log('Mock Mode:', droneApi.isMockMode())
}

function resetToDefaults() {
  if (confirm('Reset all settings to defaults?')) {
    settings.value = { ...defaultSettings }
    saveSettings()
  }
}

async function testConnection() {
  testingConnection.value = true
  connectionTestResult.value = ''

  try {
    // Temporarily switch to non-mock mode for testing
    const wasMock = droneApi.isMockMode()
    droneApi.setMockMode(false)

    const health = await droneApi.healthCheck()

    if (health.status === 'healthy') {
      connectionTestResult.value = `✅ Connected successfully! Vehicle ${health.vehicle_connected ? 'connected' : 'not connected'}`
    } else {
      connectionTestResult.value = '⚠️ Connection established but status unhealthy'
    }

    // Restore mock mode
    droneApi.setMockMode(wasMock)
  } catch (error) {
    connectionTestResult.value = `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    droneApi.setMockMode(settings.value.useMockMode)
  } finally {
    testingConnection.value = false
  }
}

function showMessage(message: string, type: 'success' | 'error') {
  saveMessage.value = message
  saveMessageType.value = type
  setTimeout(() => {
    saveMessage.value = ''
  }, 3000)
}

function exportSettings() {
  const dataStr = JSON.stringify(settings.value, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
  const exportFileDefaultName = 'mapgrid-settings.json'

  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}

function importSettings() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'

  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string)
        settings.value = { ...defaultSettings, ...imported }
        saveSettings()
        showMessage('Settings imported successfully!', 'success')
      } catch (error) {
        showMessage('Failed to import settings', 'error')
      }
    }
    reader.readAsText(file)
  }

  input.click()
}
</script>

<template>
  <div class="settings">
    <h2>⚙️ Settings</h2>

    <!-- Save Message -->
    <div v-if="saveMessage" class="message" :class="`message-${saveMessageType}`">
      {{ saveMessage }}
    </div>

    <!-- API Configuration -->
    <div class="settings-section">
      <h3>🌐 API Configuration</h3>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="settings.useMockMode" />
          <span class="checkbox-label">Use Mock Mode</span>
        </label>
        <p class="setting-description">
          Enable for testing without real hardware. Disable to connect to Raspberry Pi.
        </p>
      </div>

      <div class="setting-item" :class="{ disabled: settings.useMockMode }">
        <label class="setting-label">Raspberry Pi API URL:</label>
        <input
          type="text"
          v-model="settings.apiBaseUrl"
          placeholder="http://100.64.0.1:8000"
          :disabled="settings.useMockMode"
          class="text-input"
        />
        <p class="setting-description">
          Your Raspberry Pi's Tailscale IP address and port.
        </p>
      </div>

      <div class="setting-item">
        <button
          @click="testConnection"
          :disabled="testingConnection || settings.useMockMode"
          class="btn btn-test"
        >
          {{ testingConnection ? 'Testing...' : '🔌 Test Connection' }}
        </button>
        <div v-if="connectionTestResult" class="test-result">
          {{ connectionTestResult }}
        </div>
      </div>

      <div class="setting-item">
        <label class="setting-label">Telemetry Update Interval (ms):</label>
        <div class="slider-container">
          <input
            type="range"
            v-model.number="settings.telemetryInterval"
            min="100"
            max="2000"
            step="100"
            class="slider"
          />
          <span class="slider-value">{{ settings.telemetryInterval }}ms</span>
        </div>
        <p class="setting-description">
          How often to poll telemetry data. Lower = more responsive but more network traffic.
        </p>
      </div>
    </div>

    <!-- Drone Defaults -->
    <div class="settings-section">
      <h3>🚁 Drone Defaults</h3>

      <div class="setting-item">
        <label class="setting-label">Default Takeoff Altitude (m):</label>
        <input
          type="number"
          v-model.number="settings.defaultTakeoffAltitude"
          min="2"
          max="100"
          class="number-input"
        />
      </div>

      <div class="setting-item">
        <label class="setting-label">Default Speed (m/s):</label>
        <input
          type="number"
          v-model.number="settings.defaultSpeed"
          min="1"
          max="20"
          step="0.5"
          class="number-input"
        />
      </div>
    </div>

    <!-- Voice Commands -->
    <div class="settings-section">
      <h3>🎤 Voice Commands</h3>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="settings.voiceCommandsEnabled" />
          <span class="checkbox-label">Enable Voice Commands</span>
        </label>
      </div>

      <div class="setting-item" :class="{ disabled: !settings.voiceCommandsEnabled }">
        <label class="setting-label">Confidence Threshold:</label>
        <div class="slider-container">
          <input
            type="range"
            v-model.number="settings.voiceConfidenceThreshold"
            min="0.3"
            max="0.95"
            step="0.05"
            :disabled="!settings.voiceCommandsEnabled"
            class="slider"
          />
          <span class="slider-value">{{ (settings.voiceConfidenceThreshold * 100).toFixed(0) }}%</span>
        </div>
        <p class="setting-description">
          Minimum confidence level required to execute voice commands. Lower = more permissive.
        </p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="settings-actions">
      <button @click="saveSettings" class="btn btn-primary">
        💾 Save Settings
      </button>
      <button @click="resetToDefaults" class="btn btn-secondary">
        ↺ Reset to Defaults
      </button>
    </div>

    <!-- Import/Export -->
    <div class="settings-section">
      <h3>📁 Backup & Restore</h3>
      <div class="backup-actions">
        <button @click="exportSettings" class="btn btn-small">
          📤 Export Settings
        </button>
        <button @click="importSettings" class="btn btn-small">
          📥 Import Settings
        </button>
      </div>
    </div>

    <!-- Info -->
    <div class="settings-info">
      <p><strong>Note:</strong> Settings are saved in your browser's localStorage. Some changes (like API URL) require a page reload to take full effect.</p>
    </div>
  </div>
</template>

<style scoped>
.settings {
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
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1em;
  color: #555;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9ecef;
}

.message {
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 0.9em;
  animation: slideIn 0.3s ease;
}

.message-success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message-error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.settings-section {
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.setting-item {
  margin-bottom: 15px;
}

.setting-item.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.setting-label {
  display: block;
  font-weight: 600;
  font-size: 0.9em;
  color: #555;
  margin-bottom: 8px;
}

.checkbox-label {
  margin-left: 8px;
  cursor: pointer;
}

.setting-description {
  font-size: 0.8em;
  color: #666;
  margin: 5px 0 0 0;
  line-height: 1.4;
}

.text-input,
.number-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.9em;
}

.text-input:disabled,
.number-input:disabled {
  background: #e9ecef;
  cursor: not-allowed;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 15px;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #dee2e6;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
}

.slider-value {
  min-width: 70px;
  font-weight: 600;
  font-size: 0.9em;
  color: #333;
  text-align: right;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-test {
  background: #17a2b8;
  color: white;
  width: 100%;
}

.btn-test:hover:not(:disabled) {
  background: #138496;
}

.btn-small {
  padding: 8px 16px;
  font-size: 0.85em;
}

.test-result {
  margin-top: 10px;
  padding: 10px;
  background: white;
  border-radius: 4px;
  font-size: 0.85em;
  border: 1px solid #dee2e6;
}

.settings-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.settings-actions .btn {
  flex: 1;
}

.backup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.settings-info {
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  font-size: 0.85em;
  color: #856404;
  line-height: 1.5;
}
</style>
