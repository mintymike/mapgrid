import { defineStore } from 'pinia'

export interface Sector {
  label: string
  bounds: {
    southWest: { lat: number; lng: number }
    northEast: { lat: number; lng: number }
  }
  center: { lat: number; lng: number }
}

export interface DronePosition {
  lat: number
  lng: number
  altitude?: number
  heading?: number
  speed?: number
  timestamp?: Date
}

export type SearchPatternType = 'parallel' | 'expanding-square' | 'contour' | 'sector'

export interface SearchPath {
  waypoints: { lat: number; lng: number }[]
  sectors: string[]  // sector labels in visit order
}

export interface MapGridState {
  sectors: Sector[]
  dronePosition: DronePosition | null
  sectorSizeMeters: number
  searchArea: { southWest: { lat: number; lng: number }; northEast: { lat: number; lng: number } } | null
  selectedSector: string | null
  droneSpeed: number // meters per second
  isFlying: boolean
  targetPosition: { lat: number; lng: number } | null
  searchPath: SearchPath | null
  searchPatternActive: boolean
  searchedSectors: Set<string>
  currentWaypointIndex: number
}

export const useMapGridStore = defineStore('mapGrid', {
  state: (): MapGridState => ({
    sectors: [],
    dronePosition: null,
    sectorSizeMeters: 20, // default 20m sectors (prevents creating too many)
    searchArea: null,
    selectedSector: null,
    droneSpeed: 5, // default 5 m/s
    isFlying: false,
    targetPosition: null,
    searchPath: null,
    searchPatternActive: false,
    searchedSectors: new Set<string>(),
    currentWaypointIndex: 0,
  }),

  getters: {
    getSectorByLabel: (state) => {
      return (label: string): Sector | undefined => {
        return state.sectors.find((s) => s.label === label)
      }
    },

    totalSectors: (state): number => {
      return state.sectors.length
    },

    gridDimensions: (state): { rows: number; cols: number } | null => {
      if (state.sectors.length === 0) return null

      // Extract unique row and column labels
      const rows = new Set<string>()
      const cols = new Set<string>()

      state.sectors.forEach((sector) => {
        const match = sector.label.match(/^([A-Z]+)(\d+)$/)
        if (match && match[1] && match[2]) {
          rows.add(match[1])
          cols.add(match[2])
        }
      })

      return { rows: rows.size, cols: cols.size }
    },
  },

  actions: {
    // Update drone position from telemetry
    updateDronePosition(position: DronePosition) {
      this.dronePosition = {
        ...position,
        timestamp: new Date(),
      }
    },

    // Set sector size in meters
    setSectorSize(sizeMeters: number) {
      this.sectorSizeMeters = sizeMeters
      // Regenerate grid if search area exists
      if (this.searchArea) {
        this.generateGrid(this.searchArea)
      }
    },

    // Select a sector
    selectSector(label: string) {
      this.selectedSector = label
    },

    // Generate grid sectors from a rectangular search area
    generateGrid(area: { southWest: { lat: number; lng: number }; northEast: { lat: number; lng: number } }) {
      this.searchArea = area
      this.sectors = []

      const { southWest, northEast } = area
      const sectorSizeMeters = this.sectorSizeMeters

      // Calculate approximate degrees per meter at this latitude
      const metersPerDegreeLat = 111320 // approximately constant
      const metersPerDegreeLng = 111320 * Math.cos((southWest.lat * Math.PI) / 180)

      const latDelta = sectorSizeMeters / metersPerDegreeLat
      const lngDelta = sectorSizeMeters / metersPerDegreeLng

      // Calculate number of rows and columns
      const totalLatRange = northEast.lat - southWest.lat
      const totalLngRange = northEast.lng - southWest.lng

      const numRows = Math.ceil(totalLatRange / latDelta)
      const numCols = Math.ceil(totalLngRange / lngDelta)
      const totalSectors = numRows * numCols

      // Safety limit: prevent creating too many sectors
      const MAX_SECTORS = 100000 // Increased limit for MapLibre GL (can handle much more)
      if (totalSectors > MAX_SECTORS) {
        alert(`Grid too large!\n\nYour rectangle would create ${totalSectors.toLocaleString()} sectors.\n\nPlease either:\n- Draw a smaller area\n- Increase sector size (currently ${sectorSizeMeters}m)\n\nMaximum allowed: ${MAX_SECTORS.toLocaleString()} sectors`)
        return
      }

      // Generate sectors (Excel format: columns=A,B,C, rows=1,2,3)
      const sectors: Sector[] = []

      for (let row = 0; row < numRows; row++) {
        const rowLabel = (row + 1).toString() // Row numbers: 1, 2, 3...

        for (let col = 0; col < numCols; col++) {
          const colLabel = this.getRowLabel(col) // Column letters: A, B, C...

          // Start from top-left, all sectors have exact same dimensions
          const sectorNE = {
            lat: northEast.lat - row * latDelta,
            lng: southWest.lng + (col + 1) * lngDelta,
          }

          const sectorSW = {
            lat: northEast.lat - (row + 1) * latDelta,
            lng: southWest.lng + col * lngDelta,
          }

          const center = {
            lat: (sectorSW.lat + sectorNE.lat) / 2,
            lng: (sectorSW.lng + sectorNE.lng) / 2,
          }

          sectors.push({
            label: `${colLabel}${rowLabel}`, // Excel format: A1, B1, C1...
            bounds: {
              southWest: sectorSW,
              northEast: sectorNE,
            },
            center,
          })
        }
      }

      this.sectors = sectors
    },

    // Convert row index to label (0 -> A, 1 -> B, ..., 26 -> AA, etc.)
    getRowLabel(index: number): string {
      let label = ''
      let num = index

      while (num >= 0) {
        label = String.fromCharCode(65 + (num % 26)) + label
        num = Math.floor(num / 26) - 1
      }

      return label
    },

    // Clear the grid
    clearGrid() {
      this.sectors = []
      this.searchArea = null
      this.selectedSector = null
    },

    // Get sector at a specific lat/lng position
    getSectorAtPosition(lat: number, lng: number): Sector | undefined {
      return this.sectors.find((sector) => {
        const { southWest, northEast } = sector.bounds
        return (
          lat >= southWest.lat &&
          lat <= northEast.lat &&
          lng >= southWest.lng &&
          lng <= northEast.lng
        )
      })
    },

    // Command: Fly to sector
    flyToSector(label: string): { lat: number; lng: number } | null {
      const sector = this.getSectorByLabel(label)
      if (sector) {
        this.selectedSector = label
        return sector.center
      }
      return null
    },

    // Set drone speed
    setDroneSpeed(speedMps: number) {
      this.droneSpeed = speedMps
    },

    // Set drone position manually (for simulation)
    setDronePosition(lat: number, lng: number) {
      this.dronePosition = {
        lat,
        lng,
        altitude: this.dronePosition?.altitude || 0,
        heading: this.dronePosition?.heading || 0,
        speed: 0,
        timestamp: new Date(),
      }
      this.isFlying = false
      this.targetPosition = null
    },

    // Start flying to target position
    startFlyingTo(target: { lat: number; lng: number }) {
      this.targetPosition = target
      this.isFlying = true
    },

    // Stop flying
    stopFlying() {
      this.isFlying = false
      this.targetPosition = null
    },

    // Search Pattern Methods
    startSearchPattern(
      pattern: SearchPatternType,
      options: {
        direction?: 'horizontal' | 'vertical'
        center?: string
        order?: 'row-by-row' | 'column-by-column'
      }
    ) {
      this.searchedSectors.clear()
      this.currentWaypointIndex = 0

      // Generate path based on pattern
      this.searchPath = this.generateSearchPath(pattern, options)
      this.searchPatternActive = true

      // Start drone movement along path
      if (this.searchPath && this.searchPath.waypoints.length > 0) {
        const firstWaypoint = this.searchPath.waypoints[0]
        if (firstWaypoint) {
          this.startFlyingTo(firstWaypoint)
        }
      }
    },

    generateSearchPath(
      pattern: SearchPatternType,
      options: {
        direction?: 'horizontal' | 'vertical'
        center?: string
        order?: 'row-by-row' | 'column-by-column'
      }
    ): SearchPath {
      const waypoints: { lat: number; lng: number }[] = []
      const sectorLabels: string[] = []

      switch (pattern) {
        case 'parallel':
          return this.generateParallelPath(options.direction || 'horizontal')
        case 'expanding-square':
          return this.generateExpandingSquarePath(options.center)
        case 'contour':
          return this.generateContourPath()
        case 'sector':
          return this.generateSectorPath(options.order || 'row-by-row')
        default:
          return { waypoints: [], sectors: [] }
      }
    },

    generateParallelPath(direction: 'horizontal' | 'vertical'): SearchPath {
      const waypoints: { lat: number; lng: number }[] = []
      const sectorLabels: string[] = []

      if (direction === 'horizontal') {
        // Sort sectors by row, then column
        const sortedSectors = [...this.sectors].sort((a, b) => {
          const aMatch = a.label.match(/^([A-Z]+)(\d+)$/)
          const bMatch = b.label.match(/^([A-Z]+)(\d+)$/)
          if (!aMatch || !bMatch || !aMatch[1] || !aMatch[2] || !bMatch[1] || !bMatch[2]) return 0

          const aRow = parseInt(aMatch[2])
          const bRow = parseInt(bMatch[2])
          if (aRow !== bRow) return aRow - bRow

          return aMatch[1].localeCompare(bMatch[1])
        })

        sortedSectors.forEach((sector) => {
          waypoints.push(sector.center)
          sectorLabels.push(sector.label)
        })
      } else {
        // Sort sectors by column, then row
        const sortedSectors = [...this.sectors].sort((a, b) => {
          const aMatch = a.label.match(/^([A-Z]+)(\d+)$/)
          const bMatch = b.label.match(/^([A-Z]+)(\d+)$/)
          if (!aMatch || !bMatch || !aMatch[1] || !aMatch[2] || !bMatch[1] || !bMatch[2]) return 0

          const colCompare = aMatch[1].localeCompare(bMatch[1])
          if (colCompare !== 0) return colCompare

          return parseInt(aMatch[2]) - parseInt(bMatch[2])
        })

        sortedSectors.forEach((sector) => {
          waypoints.push(sector.center)
          sectorLabels.push(sector.label)
        })
      }

      return { waypoints, sectors: sectorLabels }
    },

    generateExpandingSquarePath(centerLabel?: string): SearchPath {
      const waypoints: { lat: number; lng: number }[] = []
      const sectorLabels: string[] = []
      const visited = new Set<string>()

      // Find center sector
      let center: Sector | undefined
      if (centerLabel) {
        center = this.getSectorByLabel(centerLabel.toUpperCase())
      }
      if (!center && this.sectors.length > 0) {
        // Use middle sector as center
        const middleIndex = Math.floor(this.sectors.length / 2)
        center = this.sectors[middleIndex]
      }
      if (!center) return { waypoints: [], sectors: [] }

      // Add center
      waypoints.push(center.center)
      sectorLabels.push(center.label)
      visited.add(center.label)

      // Expand in layers
      let layer = 1
      let foundNewSectors = true

      while (foundNewSectors) {
        foundNewSectors = false
        const layerSectors: Sector[] = []

        // Find all sectors at current distance from center
        this.sectors.forEach((sector) => {
          if (visited.has(sector.label)) return

          const centerMatch = center!.label.match(/^([A-Z]+)(\d+)$/)
          const sectorMatch = sector.label.match(/^([A-Z]+)(\d+)$/)
          if (!centerMatch || !sectorMatch || !centerMatch[1] || !centerMatch[2] || !sectorMatch[1] || !sectorMatch[2]) return

          const centerCol = this.columnToNumber(centerMatch[1])
          const centerRow = parseInt(centerMatch[2])
          const sectorCol = this.columnToNumber(sectorMatch[1])
          const sectorRow = parseInt(sectorMatch[2])

          const distance = Math.max(Math.abs(sectorCol - centerCol), Math.abs(sectorRow - centerRow))

          if (distance === layer) {
            layerSectors.push(sector)
            foundNewSectors = true
          }
        })

        // Sort layer sectors clockwise
        layerSectors.forEach((sector) => {
          waypoints.push(sector.center)
          sectorLabels.push(sector.label)
          visited.add(sector.label)
        })

        layer++
      }

      return { waypoints, sectors: sectorLabels }
    },

    generateContourPath(): SearchPath {
      // Simplified contour: follow the perimeter, then work inward
      const waypoints: { lat: number; lng: number }[] = []
      const sectorLabels: string[] = []
      const visited = new Set<string>()

      // Get grid dimensions
      const allCols = new Set<string>()
      const allRows = new Set<number>()
      this.sectors.forEach((sector) => {
        const match = sector.label.match(/^([A-Z]+)(\d+)$/)
        if (match && match[1] && match[2]) {
          allCols.add(match[1])
          allRows.add(parseInt(match[2]))
        }
      })

      const cols = Array.from(allCols).sort()
      const rows = Array.from(allRows).sort((a, b) => a - b)

      // Trace perimeter first
      if (rows.length > 0 && cols.length > 0) {
        // Top row (left to right)
        for (const col of cols) {
          const label = `${col}${rows[0]}`
          const sector = this.getSectorByLabel(label)
          if (sector && !visited.has(label)) {
            waypoints.push(sector.center)
            sectorLabels.push(label)
            visited.add(label)
          }
        }

        // Right column (top to bottom, excluding corners)
        for (let i = 1; i < rows.length; i++) {
          const label = `${cols[cols.length - 1]}${rows[i]}`
          const sector = this.getSectorByLabel(label)
          if (sector && !visited.has(label)) {
            waypoints.push(sector.center)
            sectorLabels.push(label)
            visited.add(label)
          }
        }

        // Bottom row (right to left, excluding corners)
        if (rows.length > 1) {
          for (let i = cols.length - 2; i >= 0; i--) {
            const label = `${cols[i]}${rows[rows.length - 1]}`
            const sector = this.getSectorByLabel(label)
            if (sector && !visited.has(label)) {
              waypoints.push(sector.center)
              sectorLabels.push(label)
              visited.add(label)
            }
          }
        }

        // Left column (bottom to top, excluding corners)
        if (cols.length > 1) {
          for (let i = rows.length - 2; i > 0; i--) {
            const label = `${cols[0]}${rows[i]}`
            const sector = this.getSectorByLabel(label)
            if (sector && !visited.has(label)) {
              waypoints.push(sector.center)
              sectorLabels.push(label)
              visited.add(label)
            }
          }
        }
      }

      // Add remaining interior sectors
      this.sectors.forEach((sector) => {
        if (!visited.has(sector.label)) {
          waypoints.push(sector.center)
          sectorLabels.push(sector.label)
          visited.add(sector.label)
        }
      })

      return { waypoints, sectors: sectorLabels }
    },

    generateSectorPath(order: 'row-by-row' | 'column-by-column'): SearchPath {
      const waypoints: { lat: number; lng: number }[] = []
      const sectorLabels: string[] = []

      if (order === 'row-by-row') {
        // Sort by row number, then column letter
        const sortedSectors = [...this.sectors].sort((a, b) => {
          const aMatch = a.label.match(/^([A-Z]+)(\d+)$/)
          const bMatch = b.label.match(/^([A-Z]+)(\d+)$/)
          if (!aMatch || !bMatch || !aMatch[1] || !aMatch[2] || !bMatch[1] || !bMatch[2]) return 0

          const aRow = parseInt(aMatch[2])
          const bRow = parseInt(bMatch[2])
          if (aRow !== bRow) return aRow - bRow

          return aMatch[1].localeCompare(bMatch[1])
        })

        sortedSectors.forEach((sector) => {
          waypoints.push(sector.center)
          sectorLabels.push(sector.label)
        })
      } else {
        // Sort by column letter, then row number
        const sortedSectors = [...this.sectors].sort((a, b) => {
          const aMatch = a.label.match(/^([A-Z]+)(\d+)$/)
          const bMatch = b.label.match(/^([A-Z]+)(\d+)$/)
          if (!aMatch || !bMatch || !aMatch[1] || !aMatch[2] || !bMatch[1] || !bMatch[2]) return 0

          const colCompare = aMatch[1].localeCompare(bMatch[1])
          if (colCompare !== 0) return colCompare

          return parseInt(aMatch[2]) - parseInt(bMatch[2])
        })

        sortedSectors.forEach((sector) => {
          waypoints.push(sector.center)
          sectorLabels.push(sector.label)
        })
      }

      return { waypoints, sectors: sectorLabels }
    },

    columnToNumber(col: string): number {
      let num = 0
      for (let i = 0; i < col.length; i++) {
        num = num * 26 + (col.charCodeAt(i) - 64)
      }
      return num
    },

    pauseSearchPattern(paused: boolean) {
      if (paused) {
        this.stopFlying()
      } else if (this.searchPath && this.currentWaypointIndex < this.searchPath.waypoints.length) {
        const waypoint = this.searchPath.waypoints[this.currentWaypointIndex]
        if (waypoint) {
          this.startFlyingTo(waypoint)
        }
      }
    },

    stopSearchPattern() {
      this.searchPatternActive = false
      this.stopFlying()
      this.currentWaypointIndex = 0
    },

    clearSearchPath() {
      this.searchPath = null
      this.searchedSectors.clear()
      this.currentWaypointIndex = 0
    },

    markSectorAsSearched(label: string) {
      this.searchedSectors.add(label)
    },

    advanceToNextWaypoint() {
      if (!this.searchPath) return

      this.currentWaypointIndex++
      if (this.currentWaypointIndex < this.searchPath.waypoints.length) {
        // Mark current sector as searched
        const currentSector = this.searchPath.sectors[this.currentWaypointIndex - 1]
        if (currentSector) {
          this.markSectorAsSearched(currentSector)
        }

        // Move to next waypoint
        const nextWaypoint = this.searchPath.waypoints[this.currentWaypointIndex]
        if (nextWaypoint) {
          this.startFlyingTo(nextWaypoint)
        }
      } else {
        // Search complete
        this.stopSearchPattern()
      }
    },

    // Sync drone position from API telemetry (for real drone integration)
    updateFromApiTelemetry(telemetry: {
      position: { lat: number; lng: number; altitude_agl: number }
      attitude: { heading: number }
      velocity: { groundspeed: number }
    }) {
      this.updateDronePosition({
        lat: telemetry.position.lat,
        lng: telemetry.position.lng,
        altitude: telemetry.position.altitude_agl,
        heading: telemetry.attitude.heading,
        speed: telemetry.velocity.groundspeed,
        timestamp: new Date()
      })
    },
  },
})
