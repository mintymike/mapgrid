<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'
import { droneApi } from '@/services/droneApi'
import type { SearchPatternType } from '@/types'

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
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return
  supported.value = true
  recognition = new SR()
  recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US'
  recognition.onresult = (e: any) => {
    const last = e.results.length - 1
    const text = e.results[last][0].transcript.trim().toLowerCase()
    transcript.value = text; confidence.value = e.results[last][0].confidence
    if (e.results[last].isFinal && e.results[last][0].confidence > 0.6) processCommand(text)
  }
  recognition.onerror = (e: any) => {
    if (e.error === 'no-speech') showStatus('No speech', 'info')
    else if (e.error === 'not-allowed') { showStatus('Mic denied', 'error'); isListening.value = false }
    else showStatus(`Error: ${e.error}`, 'error')
  }
  recognition.onend = () => { if (isListening.value) try { recognition.start() } catch(e) { isListening.value = false } }
})

onUnmounted(() => { if (recognition) recognition.stop() })

function toggleListening() {
  if (!recognition) return
  if (isListening.value) { recognition.stop(); isListening.value = false; showStatus('Stopped', 'info') }
  else { try { recognition.start(); isListening.value = true; showStatus('Listening...', 'info') } catch(e) { showStatus('Failed', 'error') } }
}

function showStatus(msg: string, type: 'success'|'error'|'info') { statusMessage.value = msg; statusType.value = type; setTimeout(() => statusMessage.value = '', 4000) }

async function processCommand(cmd: string) {
  lastCommand.value = cmd
  try {
    if (cmd.match(/\b(arm|armed)\b/) && !cmd.includes('disarm')) { await droneApi.arm(); showStatus('Armed', 'success'); return }
    if (cmd.includes('disarm')) { await droneApi.disarm(); showStatus('Disarmed', 'success'); return }
    if (cmd.match(/\b(takeoff|take off|lift off|liftoff)\b/)) { const m=cmd.match(/(\d+)\s*(meter|metre|foot|feet|m)/i); const a=m && m[1] ? parseInt(m[1]) : 10; await droneApi.takeoff(a); showStatus(`Takeoff ${a}m`,'success'); return }
    if (cmd.match(/\b(land|landing)\b/)) { await droneApi.land(); showStatus('Landing','success'); return }
    if (cmd.match(/\b(return|rtl|come back|go home)\b/)) { await droneApi.returnToLaunch(); showStatus('RTL','success'); return }
    const sm = cmd.match(/(?:go to|fly to|navigate to|sector)\s+(?:sector\s+)?([a-z]+\d+)/i)
    if (sm && sm[1]) { const l=sm[1].toUpperCase(); const s=mapGridStore.getSectorByLabel(l); if(s){await droneApi.gotoPosition(s.center.lat,s.center.lng);mapGridStore.selectSector(l);showStatus(`Sector ${l}`,'success')}else{showStatus(`${l} not found`,'error')}; return }
    const sp = cmd.match(/(?:set speed|speed)\s+(?:to\s+)?(\d+)/i)
    if (sp && sp[1]) { const s=parseInt(sp[1]); if(s>0&&s<=20){await droneApi.setSpeed(s);mapGridStore.setDroneSpeed(s);showStatus(`Speed ${s} m/s`,'success')}else{showStatus('1-20 m/s','error')}; return }
    if (cmd.match(/\b(start|begin|commence)\s+(search|pattern)/i)) {
      let p: SearchPatternType='parallel';let pn='parallel'
      if(cmd.includes('parallel')||cmd.includes('track')){p='parallel';pn='parallel'}
      else if(cmd.includes('expanding')||cmd.includes('square')){p='expanding-square';pn='expanding square'}
      else if(cmd.includes('contour')){p='contour';pn='contour'}
      else if(cmd.includes('sector')){p='sector';pn='sector'}
      if(mapGridStore.sectors.length===0){showStatus('Create grid first','error');return}
      mapGridStore.startSearchPattern(p,{direction:'horizontal',order:'row-by-row'});showStatus(`Search:${pn}`,'success');return
    }
    if (cmd.match(/\b(stop|halt|pause)\s+(search|pattern)/i)) { mapGridStore.stopSearchPattern(); showStatus('Stopped','success'); return }
    if (cmd.match(/\b(clear|delete|remove)\s+(grid|sectors)/i)) { mapGridStore.clearGrid(); showStatus('Cleared','success'); return }
    if (cmd.match(/\b(status|report|info|information)\b/)) { const t=await droneApi.getTelemetry(); showStatus(`${t.status.armed?'Armed':'Disarmed'}, ${t.status.mode}, bat:${t.battery.level.toFixed(0)}%, alt:${t.position.altitude_agl.toFixed(1)}m`,'info'); return }
    showStatus(`Unknown: "${cmd}"`,'error')
  } catch(e) { showStatus(`Error: ${e instanceof Error?e.message:'Unknown'}`,'error') }
}
</script>

<template>
  <div class="glass-card" style="padding:16px">
    <div class="glass-section-header">Voice Commands</div>

    <div v-if="!supported" class="warn-msg">Voice not supported. Use Chrome, Edge, or Safari.</div>

    <template v-else>
      <button @click="toggleListening" class="voice-btn" :class="{on:isListening}">
        <span class="mic-icon">{{ isListening ? 'Ă˘ĹˇÂ«' : 'Ä‘ĹşĹ˝Â¤' }}</span>
        {{ isListening ? 'Listening...' : 'Start Voice' }}
      </button>

      <div v-if="transcript && isListening" class="transcript-box">
        <div class="tx-label">Hearing</div>
        <div class="tx-text">{{ transcript }}</div>
        <span v-if="confidence>0" class="tx-conf">{{ (confidence*100).toFixed(0) }}%</span>
      </div>

      <div v-if="lastCommand" class="last-cmd">"{{ lastCommand }}"</div>

      <div v-if="statusMessage" class="status-toast" :class="statusType">{{ statusMessage }}</div>

      <details class="help-toggle">
        <summary>Available commands</summary>
        <div class="help-grid">
          <div><div class="help-head">Basic</div><ul><li>Arm / Disarm</li><li>Takeoff</li><li>Land</li><li>Go home</li></ul></div>
          <div><div class="help-head">Navigate</div><ul><li>Go to sector A5</li><li>Fly to B3</li><li>Set speed to 8</li></ul></div>
          <div><div class="help-head">Search</div><ul><li>Start parallel search</li><li>Begin expanding square</li><li>Stop search</li></ul></div>
          <div><div class="help-head">Info</div><ul><li>Status report</li><li>Clear grid</li></ul></div>
        </div>
      </details>
    </template>
  </div>
</template>

<style scoped>
.voice-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 11px;
  border: 1px solid var(--layer-bg-3);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-family); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all var(--transition-fast); letter-spacing: -0.01em;
}
.voice-btn:hover { background: var(--layer-bg-2); color: var(--color-text-primary); }
.voice-btn.on { background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger); animation: pulse-border 1.5s infinite; }
@keyframes pulse-border { 0%,100%{opacity:1} 50%{opacity:0.65} }
.mic-icon { font-size: 14px; }

.transcript-box { padding: 9px 12px; margin-top: 8px; background: var(--layer-bg-0); border: 1px solid var(--layer-bg-2); border-radius: var(--radius-md); }
.tx-label { font-size: 9px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
.tx-text { font-size: 13px; color: var(--color-text-primary); font-weight: 500; }
.tx-conf { font-size: 9px; color: var(--color-text-tertiary); }

.last-cmd { padding: 7px 12px; margin-top: 6px; background: var(--layer-bg-0); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-secondary); }

.status-toast { padding: 7px 12px; margin-top: 6px; border-radius: var(--radius-md); font-size: 11px; font-weight: 500; }
.status-toast.success { background: var(--color-success-bg); color: var(--color-success); border: 1px solid var(--color-success-border); }
.status-toast.error { background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid var(--color-danger-border); }
.status-toast.info { background: var(--color-info-bg); color: var(--color-info); border: 1px solid rgba(94,163,240,0.2); }

.help-toggle { margin-top: 10px; font-size: 11px; }
.help-toggle summary { color: var(--color-text-tertiary); cursor: pointer; padding: 3px 0; }
.help-toggle summary:hover { color: var(--color-accent); }
.help-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; padding: 8px; background: var(--layer-bg-0); border-radius: var(--radius-sm); }
.help-head { font-size: 10px; font-weight: 600; color: var(--color-accent); margin-bottom: 2px; }
.help-grid ul { margin: 0; padding-left: 14px; }
.help-grid li { color: var(--color-text-tertiary); font-size: 10px; margin: 1px 0; }

.warn-msg { padding: 10px 13px; background: var(--color-warning-bg); border: 1px solid var(--color-warning-border); border-radius: var(--radius-md); color: var(--color-warning); font-size: 11px; }
</style>
