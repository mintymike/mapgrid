<script setup lang="ts">
import { computed } from 'vue'
import { useMapGridStore } from '@/stores/mapGrid'

const mapGridStore = useMapGridStore()
const log = computed(() => mapGridStore.recentMissionLog.slice().reverse())

function formatTime(t: Date): string {
  return new Date(t).toLocaleTimeString()
}
</script>

<template>
  <div v-if="log.length > 0" class="glass-card" style="padding:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div class="glass-section-header" style="margin-bottom:0">Mission Log</div>
      <button @click="mapGridStore.clearMissionLog()" class="glass-btn" style="height:26px;font-size:10px;padding:0 8px">Clear</button>
    </div>
    <div class="log-list glass-scroll">
      <div v-for="entry in log" :key="entry.id" class="log-entry">
        <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
        <span class="log-action">{{ entry.action }}</span>
        <span class="log-detail">{{ entry.detail }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-list {
  max-height: 180px;
  overflow-y: auto;
}
.log-entry {
  display: grid;
  grid-template-columns: 52px 88px 1fr;
  gap: 6px;
  padding: 4px 6px;
  font-size: 10px;
  border-radius: var(--radius-xs);
  align-items: baseline;
}
.log-entry:nth-child(even) { background: var(--layer-bg-0); }
.log-time { color: var(--color-text-tertiary); font-family: var(--font-mono); font-size: 9px; }
.log-action { color: var(--color-accent); font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.03em; }
.log-detail { color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
