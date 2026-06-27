import { defineStore } from 'pinia'
import type {
  Sector, SectorStatus, DronePosition, SearchPatternType,
  SearchPath, SearchPatternOptions, SearchArea, LatLng,
  GridDimensions, MissionLogEntry, MissionLogAction,
} from '@/types'

let _logId = 0

export const useMapGridStore = defineStore('mapGrid', {
  state: () => ({
    sectors: [] as Sector[],
    dronePosition: null as DronePosition | null,
    sectorSizeMeters: 20,
    searchArea: null as SearchArea | null,
    selectedSector: null as string | null,
    droneSpeed: 5,
    isFlying: false,
    targetPosition: null as LatLng | null,
    searchPath: null as SearchPath | null,
    searchPatternActive: false,
    searchedSectors: new Set<string>(),
    currentWaypointIndex: 0,
    sectorStatuses: {} as Record<string, SectorStatus>,
    missionLog: [] as MissionLogEntry[],
  }),

  getters: {
    getSectorByLabel: (state) => (label: string): Sector | undefined =>
      state.sectors.find((s) => s.label === label),

    totalSectors: (state): number => state.sectors.length,

    gridDimensions: (state): GridDimensions | null => {
      if (state.sectors.length === 0) return null
      const rows = new Set<string>()
      const cols = new Set<string>()
      state.sectors.forEach((s) => {
        const m = s.label.match(/^([A-Z]+)(\d+)$/)
        if (m?.[1] && m?.[2]) { cols.add(m[1]); rows.add(m[2]) }
      })
      return { rows: rows.size, cols: cols.size }
    },

    getSectorStatus: (state) => (label: string): SectorStatus =>
      state.sectorStatuses[label] || 'unsearched',

    recentMissionLog: (state) => state.missionLog.slice(-100),
  },

  actions: {
    log(action: MissionLogAction, detail: string, data?: Record<string, unknown>) {
      this.missionLog.push({ id: ++_logId, timestamp: new Date(), action, detail, data })
      if (this.missionLog.length > 500) this.missionLog.splice(0, this.missionLog.length - 500)
    },

    updateDronePosition(position: DronePosition) {
      this.dronePosition = { ...position, timestamp: new Date() }
    },

    setSectorSize(sizeMeters: number) {
      this.sectorSizeMeters = sizeMeters
      if (this.searchArea) this.generateGrid(this.searchArea)
    },

    selectSector(label: string) {
      this.selectedSector = label
    },

    setSectorStatus(label: string, status: SectorStatus) {
      this.sectorStatuses[label] = status
      const sector = this.getSectorByLabel(label)
      if (sector) { sector.status = status }
      this.log('sector-status-changed', `Sector ${label}: ${status}`, { label, status })
    },

    generateGrid(area: SearchArea) {
      this.searchArea = area
      this.sectors = []
      this.sectorStatuses = {}

      const { southWest, northEast } = area
      const s = this.sectorSizeMeters

      const metersPerDegreeLat = 111320
      const metersPerDegreeLng = 111320 * Math.cos((southWest.lat * Math.PI) / 180)

      const latDelta = s / metersPerDegreeLat
      const lngDelta = s / metersPerDegreeLng
      const numRows = Math.ceil((northEast.lat - southWest.lat) / latDelta)
      const numCols = Math.ceil((northEast.lng - southWest.lng) / lngDelta)
      const totalSectors = numRows * numCols

      const MAX_SECTORS = 100000
      if (totalSectors > MAX_SECTORS) {
        alert(`Grid too large!\n\n${totalSectors.toLocaleString()} sectors.\nIncrease sector size (currently ${s}m)\n\nMax: ${MAX_SECTORS.toLocaleString()}`)
        return
      }

      const sectors: Sector[] = []
      for (let row = 0; row < numRows; row++) {
        const rowLabel = (row + 1).toString()
        for (let col = 0; col < numCols; col++) {
          const colLabel = this.getRowLabel(col)
          const nw = { lat: northEast.lat - row * latDelta, lng: southWest.lng + col * lngDelta }
          const se = { lat: northEast.lat - (row + 1) * latDelta, lng: southWest.lng + (col + 1) * lngDelta }
          const center = { lat: (nw.lat + se.lat) / 2, lng: (nw.lng + se.lng) / 2 }
          sectors.push({
            label: `${colLabel}${rowLabel}`,
            bounds: { southWest: se, northEast: nw },
            center,
            status: 'unsearched',
          })
        }
      }

      this.sectors = sectors
      this.log('grid-generated', `${totalSectors} sectors, ${s}m cells, ${numRows}x${numCols}`, { totalSectors, sectorSize: s, rows: numRows, cols: numCols })
    },

    getRowLabel(index: number): string {
      let label = ''
      let num = index
      while (num >= 0) { label = String.fromCharCode(65 + (num % 26)) + label; num = Math.floor(num / 26) - 1 }
      return label
    },

    clearGrid() {
      this.sectors = []
      this.searchArea = null
      this.selectedSector = null
      this.sectorStatuses = {}
      this.log('grid-cleared', 'Search grid cleared')
    },

    getSectorAtPosition(lat: number, lng: number): Sector | undefined {
      return this.sectors.find((s) =>
        lat >= s.bounds.southWest.lat && lat <= s.bounds.northEast.lat &&
        lng >= s.bounds.southWest.lng && lng <= s.bounds.northEast.lng
      )
    },

    flyToSector(label: string): LatLng | null {
      const sector = this.getSectorByLabel(label)
      if (sector) { this.selectedSector = label; return sector.center }
      return null
    },

    setDroneSpeed(speedMps: number) {
      this.droneSpeed = speedMps
    },

    setDronePosition(lat: number, lng: number) {
      this.dronePosition = { lat, lng, altitude: this.dronePosition?.altitude || 0, heading: this.dronePosition?.heading || 0, speed: 0, timestamp: new Date() }
      this.isFlying = false
      this.targetPosition = null
      this.log('position-set', `Drone position set to ${lat.toFixed(6)}, ${lng.toFixed(6)}`, { lat, lng })
    },

    startFlyingTo(target: LatLng) { this.targetPosition = target; this.isFlying = true },
    stopFlying() { this.isFlying = false; this.targetPosition = null },

    startSearchPattern(pattern: SearchPatternType, options: SearchPatternOptions) {
      this.searchedSectors.clear()
      this.currentWaypointIndex = 0
      this.searchPath = this.generateSearchPath(pattern, options)
      this.searchPatternActive = true
      this.log('search-started', `Pattern: ${pattern}`, { pattern, options })
      if (this.searchPath?.waypoints[0]) this.startFlyingTo(this.searchPath.waypoints[0])
    },

    generateSearchPath(pattern: SearchPatternType, options: SearchPatternOptions): SearchPath {
      switch (pattern) {
        case 'parallel': return this.generateParallelPath(options.direction || 'horizontal')
        case 'expanding-square': return this.generateExpandingSquarePath(options.center)
        case 'contour': return this.generateContourPath()
        case 'sector': return this.generateSectorPath(options.order || 'row-by-row')
        default: return { waypoints: [], sectors: [] }
      }
    },

    generateParallelPath(direction: 'horizontal' | 'vertical'): SearchPath {
      const sorted = [...this.sectors].sort((a, b) => {
        const am = a.label.match(/^([A-Z]+)(\d+)$/), bm = b.label.match(/^([A-Z]+)(\d+)$/)
        if (!am?.[1] || !am?.[2] || !bm?.[1] || !bm?.[2]) return 0
        return direction === 'horizontal'
          ? parseInt(am[2]) - parseInt(bm[2]) || am[1].localeCompare(bm[1])
          : am[1].localeCompare(bm[1]) || parseInt(am[2]) - parseInt(bm[2])
      })
      return { waypoints: sorted.map(s => s.center), sectors: sorted.map(s => s.label) }
    },

    generateExpandingSquarePath(centerLabel?: string): SearchPath {
      const w: LatLng[] = [], l: string[] = [], visited = new Set<string>()
      let center = centerLabel ? this.getSectorByLabel(centerLabel.toUpperCase()) : undefined
      if (!center && this.sectors.length > 0) center = this.sectors[Math.floor(this.sectors.length / 2)]
      if (!center) return { waypoints: [], sectors: [] }
      w.push(center.center); l.push(center.label); visited.add(center.label)

      let layer = 1, found = true
      while (found) {
        found = false
        const layerSectors: Sector[] = []
        this.sectors.forEach((s) => {
          if (visited.has(s.label)) return
          const cm = center!.label.match(/^([A-Z]+)(\d+)$/), sm = s.label.match(/^([A-Z]+)(\d+)$/)
          if (!cm?.[1] || !cm?.[2] || !sm?.[1] || !sm?.[2]) return
          const distance = Math.max(Math.abs(this.columnToNumber(sm[1]) - this.columnToNumber(cm[1])), Math.abs(parseInt(sm[2]) - parseInt(cm[2])))
          if (distance === layer) { layerSectors.push(s); found = true }
        })
        layerSectors.forEach((s) => { w.push(s.center); l.push(s.label); visited.add(s.label) })
        layer++
      }
      return { waypoints: w, sectors: l }
    },

    generateContourPath(): SearchPath {
      const w: LatLng[] = [], l: string[] = [], visited = new Set<string>()
      const allCols = new Set<string>(), allRows = new Set<number>()
      this.sectors.forEach((s) => {
        const m = s.label.match(/^([A-Z]+)(\d+)$/)
        if (m?.[1] && m?.[2]) { allCols.add(m[1]); allRows.add(parseInt(m[2])) }
      })
      const cols = Array.from(allCols).sort(), rows = Array.from(allRows).sort((a, b) => a - b)
      if (rows.length > 0 && cols.length > 0) {
        for (const col of cols) { const label = `${col}${rows[0]}`; const s = this.getSectorByLabel(label); if (s && !visited.has(label)) { w.push(s.center); l.push(label); visited.add(label) } }
        for (let i = 1; i < rows.length; i++) { const label = `${cols[cols.length - 1]}${rows[i]}`; const s = this.getSectorByLabel(label); if (s && !visited.has(label)) { w.push(s.center); l.push(label); visited.add(label) } }
        if (rows.length > 1) for (let i = cols.length - 2; i >= 0; i--) { const label = `${cols[i]}${rows[rows.length - 1]}`; const s = this.getSectorByLabel(label); if (s && !visited.has(label)) { w.push(s.center); l.push(label); visited.add(label) } }
        if (cols.length > 1) for (let i = rows.length - 2; i > 0; i--) { const label = `${cols[0]}${rows[i]}`; const s = this.getSectorByLabel(label); if (s && !visited.has(label)) { w.push(s.center); l.push(label); visited.add(label) } }
      }
      this.sectors.forEach((s) => { if (!visited.has(s.label)) { w.push(s.center); l.push(s.label) } })
      return { waypoints: w, sectors: l }
    },

    generateSectorPath(order: 'row-by-row' | 'column-by-column'): SearchPath {
      const sorted = [...this.sectors].sort((a, b) => {
        const am = a.label.match(/^([A-Z]+)(\d+)$/), bm = b.label.match(/^([A-Z]+)(\d+)$/)
        if (!am?.[1] || !am?.[2] || !bm?.[1] || !bm?.[2]) return 0
        return order === 'row-by-row'
          ? parseInt(am[2]) - parseInt(bm[2]) || am[1].localeCompare(bm[1])
          : am[1].localeCompare(bm[1]) || parseInt(am[2]) - parseInt(bm[2])
      })
      return { waypoints: sorted.map(s => s.center), sectors: sorted.map(s => s.label) }
    },

    columnToNumber(col: string): number {
      let num = 0
      for (let i = 0; i < col.length; i++) num = num * 26 + (col.charCodeAt(i) - 64)
      return num
    },

    pauseSearchPattern(paused: boolean) {
      if (paused) { this.stopFlying(); this.log('search-paused', 'Search paused') }
      else if (this.searchPath && this.currentWaypointIndex < this.searchPath.waypoints.length) {
        this.log('search-resumed', 'Search resumed')
        const wp = this.searchPath.waypoints[this.currentWaypointIndex]
        if (wp) this.startFlyingTo(wp)
      }
    },

    stopSearchPattern() {
      this.searchPatternActive = false; this.stopFlying(); this.currentWaypointIndex = 0
      this.log('search-stopped', 'Search stopped')
    },

    clearSearchPath() { this.searchPath = null; this.searchedSectors.clear(); this.currentWaypointIndex = 0 },

    markSectorAsSearched(label: string) {
      this.searchedSectors.add(label)
      this.setSectorStatus(label, 'clear')
    },

    advanceToNextWaypoint() {
      if (!this.searchPath) return
      this.currentWaypointIndex++
      if (this.currentWaypointIndex < this.searchPath.waypoints.length) {
        const cs = this.searchPath.sectors[this.currentWaypointIndex - 1]
        if (cs) this.markSectorAsSearched(cs)
        const nw = this.searchPath.waypoints[this.currentWaypointIndex]
        if (nw) this.startFlyingTo(nw)
      } else {
        this.stopSearchPattern()
      }
    },

    updateFromApiTelemetry(telemetry: {
      position: { lat: number; lng: number; altitude_agl: number }
      attitude: { heading: number }
      velocity: { groundspeed: number }
    }) {
      this.updateDronePosition({
        lat: telemetry.position.lat, lng: telemetry.position.lng,
        altitude: telemetry.position.altitude_agl, heading: telemetry.attitude.heading,
        speed: telemetry.velocity.groundspeed, timestamp: new Date()
      })
    },

    clearMissionLog() { this.missionLog = []; _logId = 0 },
  },
})
