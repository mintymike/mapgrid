<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'
import { droneApi } from '@/services/droneApi'
import type { SearchPatternType } from '@/stores/mapGrid'

const mapGridStore = useMapGridStore()

const isListening = ref(false)
const transcript = ref('')
const lastCommand = ref('')
const confidence = ref(0)
const supported = ref(false)
const statusMessage = ref('')
const statusType = ref<'success' | 'error' | 'info'>('info')

let recognition: any = null

onMounted(() => {
  // Check for Web Speech API support
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  if (SpeechRecognition) {
    supported.value = true
    recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1
      const text = event.results[last][0].transcript.trim().toLowerCase()
      const conf = event.results[last][0].confidence

      transcript.value = text
      confidence.value = conf

      if (event.results[last].isFinal && conf > 0.6) {
        processCommand(text)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'no-speech') {
        showStatus('No speech detected. Try again.', 'info')
      } else if (event.error === 'not-allowed') {
        showStatus('Microphone access denied. Please enable microphone permissions.', 'error')
        isListening.value = false
      } else {
        showStatus(`Speech recognition error: ${event.error}`, 'error')
      }
    }

    recognition.onend = () => {
      if (isListening.value) {
        // Restart if still supposed to be listening
        try {
          recognition.start()
        } catch (e) {
          console.error('Failed to restart recognition:', e)
          isListening.value = false
        }
      }
    }
  }
})

onUnmounted(() => {
  if (recognition) {
    recognition.stop()
  }
})

function toggleListening() {
  if (!recognition) return

  if (isListening.value) {
    recognition.stop()
    isListening.value = false
    showStatus('Voice commands stopped', 'info')
  } else {
    try {
      recognition.start()
      isListening.value = true
      showStatus('Listening for commands...', 'info')
    } catch (e) {
      console.error('Failed to start recognition:', e)
      showStatus('Failed to start voice recognition', 'error')
    }
  }
}

function showStatus(message: string, type: 'success' | 'error' | 'info') {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    statusMessage.value = ''
  }, 5000)
}

async function processCommand(command: string) {
  lastCommand.value = command
  console.log('Processing command:', command)

  try {
    // Arm/Disarm
    if (command.match(/\b(arm|armed)\b/) && !command.includes('disarm')) {
      await droneApi.arm()
      showStatus('Drone armed successfully', 'success')
      return
    }
    if (command.includes('disarm')) {
      await droneApi.disarm()
      showStatus('Drone disarmed', 'success')
      return
    }

    // Takeoff
    if (command.match(/\b(takeoff|take off|lift off|liftoff)\b/)) {
      const altMatch = command.match(/(\d+)\s*(meter|metre|foot|feet|m)/i)
      const altitude = altMatch && altMatch[1] ? parseInt(altMatch[1]) : 10
      await droneApi.takeoff(altitude)
      showStatus(`Taking off to ${altitude} meters`, 'success')
      return
    }

    // Land
    if (command.match(/\b(land|landing)\b/)) {
      await droneApi.land()
      showStatus('Landing drone', 'success')
      return
    }

    // Return to launch
    if (command.match(/\b(return|rtl|come back|go home)\b/)) {
      await droneApi.returnToLaunch()
      showStatus('Returning to launch', 'success')
      return
    }

    // Go to sector (e.g., "go to sector A5", "fly to B3", "navigate to C12")
    const sectorMatch = command.match(/(?:go to|fly to|navigate to|sector)\s+(?:sector\s+)?([a-z]+\d+)/i)
    if (sectorMatch && sectorMatch[1]) {
      const sectorLabel = sectorMatch[1].toUpperCase()
      const sector = mapGridStore.getSectorByLabel(sectorLabel)
      if (sector) {
        await droneApi.gotoPosition(sector.center.lat, sector.center.lng)
        mapGridStore.selectSector(sectorLabel)
        showStatus(`Flying to sector ${sectorLabel}`, 'success')
      } else {
        showStatus(`Sector ${sectorLabel} not found`, 'error')
      }
      return
    }

    // Set speed (e.g., "set speed to 5", "speed 8 meters per second")
    const speedMatch = command.match(/(?:set speed|speed)\s+(?:to\s+)?(\d+)/i)
    if (speedMatch && speedMatch[1]) {
      const speed = parseInt(speedMatch[1])
      if (speed > 0 && speed <= 20) {
        await droneApi.setSpeed(speed)
        mapGridStore.setDroneSpeed(speed)
        showStatus(`Speed set to ${speed} m/s`, 'success')
      } else {
        showStatus('Speed must be between 1 and 20 m/s', 'error')
      }
      return
    }

    // Start search pattern
    if (command.match(/\b(start|begin|commence)\s+(search|pattern)/i)) {
      let pattern: SearchPatternType = 'parallel'
      let patternName = 'parallel'

      if (command.includes('parallel') || command.includes('track')) {
        pattern = 'parallel'
        patternName = 'parallel track'
      } else if (command.includes('expanding') || command.includes('square')) {
        pattern = 'expanding-square'
        patternName = 'expanding square'
      } else if (command.includes('contour')) {
        pattern = 'contour'
        patternName = 'contour'
      } else if (command.includes('sector')) {
        pattern = 'sector'
        patternName = 'sector'
      }

      if (mapGridStore.sectors.length === 0) {
        showStatus('Please create a grid first', 'error')
        return
      }

      mapGridStore.startSearchPattern(pattern, {
        direction: 'horizontal',
        order: 'row-by-row'
      })
      showStatus(`Starting ${patternName} search`, 'success')
      return
    }

    // Stop search
    if (command.match(/\b(stop|halt|pause)\s+(search|pattern)/i)) {
      mapGridStore.stopSearchPattern()
      showStatus('Search stopped', 'success')
      return
    }

    // Clear grid
    if (command.match(/\b(clear|delete|remove)\s+(grid|sectors)/i)) {
      mapGridStore.clearGrid()
      showStatus('Grid cleared', 'success')
      return
    }

    // Status report
    if (command.match(/\b(status|report|info|information)\b/)) {
      const telemetry = await droneApi.getTelemetry()
      const batteryLevel = telemetry?.battery?.level ?? 0
      const altitude = telemetry?.position?.altitude_agl ?? 0
      const msg = `Drone is ${telemetry.status.armed ? 'armed' : 'disarmed'}, ` +
                  `mode: ${telemetry.status.mode}, ` +
                  `battery: ${batteryLevel.toFixed(0)}%, ` +
                  `altitude: ${altitude.toFixed(1)} meters`
      showStatus(msg, 'info')
      return
    }

    // If no command matched
    showStatus(`Command not recognized: "${command}"`, 'error')
    console.log('Command not recognized:', command)
  } catch (error) {
    console.error('Command execution error:', error)
    showStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
  }
}
</script>

<template>
  <div class="voice-command">
    <h2>🎤 Voice Commands</h2>

    <div v-if="!supported" class="warning-box">
      ⚠️ Voice commands not supported in this browser. Try Chrome, Edge, or Safari.
    </div>

    <div v-else>
      <button
        @click="toggleListening"
        class="btn voice-btn"
        :class="{ 'listening': isListening }"
      >
        <span class="mic-icon">{{ isListening ? '🎤' : '🎙️' }}</span>
        {{ isListening ? 'Listening...' : 'Start Voice Commands' }}
      </button>

      <div v-if="transcript && isListening" class="transcript-box">
        <div class="transcript-label">Hearing:</div>
        <div class="transcript-text">{{ transcript }}</div>
        <span class="confidence" v-if="confidence > 0">
          Confidence: {{ (confidence * 100).toFixed(0) }}%
        </span>
      </div>

      <div v-if="lastCommand" class="last-command">
        <strong>Last Command:</strong> "{{ lastCommand }}"
      </div>

      <div v-if="statusMessage" class="status-message" :class="`status-${statusType}`">
        {{ statusMessage }}
      </div>

      <div class="help-box">
        <details>
          <summary><strong>📋 Voice Command Examples</strong></summary>
          <div class="command-categories">
            <div class="command-category">
              <h4>Basic Control</h4>
              <ul>
                <li>"Arm"</li>
                <li>"Disarm"</li>
                <li>"Takeoff" / "Takeoff to 15 meters"</li>
                <li>"Land"</li>
                <li>"Return to launch" / "Go home"</li>
              </ul>
            </div>

            <div class="command-category">
              <h4>Navigation</h4>
              <ul>
                <li>"Go to sector A5"</li>
                <li>"Fly to B3"</li>
                <li>"Navigate to C12"</li>
                <li>"Set speed to 8"</li>
              </ul>
            </div>

            <div class="command-category">
              <h4>Search Patterns</h4>
              <ul>
                <li>"Start parallel search"</li>
                <li>"Begin expanding square search"</li>
                <li>"Start contour search"</li>
                <li>"Stop search"</li>
              </ul>
            </div>

            <div class="command-category">
              <h4>Information</h4>
              <ul>
                <li>"Status report"</li>
                <li>"Clear grid"</li>
              </ul>
            </div>
          </div>

          <div class="tips">
            <strong>💡 Tips:</strong>
            <ul>
              <li>Speak clearly and at a normal pace</li>
              <li>Wait for the beep before speaking (browser dependent)</li>
              <li>Commands work best in a quiet environment</li>
              <li>You can say "uh" or pause - the final command is what matters</li>
            </ul>
          </div>
        </details>
      </div>

      <div v-if="droneApi.isMockMode()" class="mock-mode-badge">
        🧪 MOCK MODE - Using simulated drone
      </div>
    </div>
  </div>
</template>

<style scoped>
.voice-command {
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

.voice-btn {
  padding: 14px 24px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 1em;
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.voice-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.voice-btn.listening {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  animation: pulse 1.5s infinite;
}

.mic-icon {
  font-size: 1.3em;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

.transcript-box {
  margin-top: 15px;
  padding: 12px;
  background: #f0f7ff;
  border-left: 4px solid #2196f3;
  border-radius: 6px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.transcript-label {
  font-size: 0.8em;
  color: #666;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.transcript-text {
  font-size: 1em;
  color: #333;
  font-weight: 500;
  margin-bottom: 4px;
}

.confidence {
  color: #6c757d;
  font-size: 0.75em;
}

.last-command {
  margin-top: 12px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 0.9em;
  color: #555;
}

.status-message {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 0.9em;
  animation: slideIn 0.3s ease;
}

.status-success {
  background: #d4edda;
  color: #155724;
  border-left: 4px solid #28a745;
}

.status-error {
  background: #f8d7da;
  color: #721c24;
  border-left: 4px solid #dc3545;
}

.status-info {
  background: #d1ecf1;
  color: #0c5460;
  border-left: 4px solid #17a2b8;
}

.help-box {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 0.85em;
}

details {
  cursor: pointer;
}

summary {
  padding: 5px;
  user-select: none;
}

summary:hover {
  color: #2196f3;
}

.command-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.command-category h4 {
  margin: 0 0 8px 0;
  color: #667eea;
  font-size: 0.95em;
}

.command-category ul {
  margin: 0;
  padding-left: 20px;
}

.command-category li {
  margin: 4px 0;
  color: #555;
}

.tips {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #dee2e6;
}

.tips ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.tips li {
  margin: 4px 0;
  color: #666;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 12px;
  color: #856404;
}

.mock-mode-badge {
  margin-top: 15px;
  padding: 8px 12px;
  background: #fff3e0;
  border: 1px solid #ff9800;
  border-radius: 6px;
  font-size: 0.85em;
  color: #e65100;
  text-align: center;
  font-weight: 600;
}
</style>
