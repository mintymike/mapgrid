export interface LatLng {
  lat: number
  lng: number
}

export interface SearchArea {
  southWest: LatLng
  northEast: LatLng
}

export type SectorStatus = 'unsearched' | 'clear' | 'target-found' | 'obstructed' | 're-search'

export interface Sector {
  label: string
  bounds: SearchArea
  center: LatLng
  status: SectorStatus
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
  waypoints: LatLng[]
  sectors: string[]
}

export interface SearchPatternOptions {
  direction?: 'horizontal' | 'vertical'
  center?: string
  order?: 'row-by-row' | 'column-by-column'
}

export interface GridDimensions {
  rows: number
  cols: number
}

export type MissionLogAction =
  | 'arm' | 'disarm' | 'takeoff' | 'land' | 'rtl'
  | 'goto' | 'set-speed' | 'grid-generated' | 'grid-cleared'
  | 'search-started' | 'search-paused' | 'search-resumed' | 'search-stopped'
  | 'sector-status-changed' | 'sector-searched' | 'position-set'
  | 'voice-command'

export interface MissionLogEntry {
  id: number
  timestamp: Date
  action: MissionLogAction
  detail: string
  data?: Record<string, unknown>
}

export interface Telemetry {
  position: { lat: number; lng: number; altitude_msl: number; altitude_agl: number }
  attitude: { roll: number; pitch: number; yaw: number; heading: number }
  velocity: { vx: number; vy: number; vz: number; groundspeed: number; airspeed: number }
  battery: { voltage: number; current: number; level: number }
  gps: { fix_type: number; satellites_visible: number; eph: number }
  status: { armed: boolean; mode: string; system_status: string; is_armable: boolean }
  home: { lat: number | null; lng: number | null; alt: number | null }
  timestamp: number
}

export interface CommandResponse {
  status: string
  message?: string
  [key: string]: any
}

export interface MapGridState {
  sectors: Sector[]
  dronePosition: DronePosition | null
  sectorSizeMeters: number
  searchArea: SearchArea | null
  selectedSector: string | null
  droneSpeed: number
  isFlying: boolean
  targetPosition: LatLng | null
  searchPath: SearchPath | null
  searchPatternActive: boolean
  searchedSectors: Set<string>
  currentWaypointIndex: number
  missionLog: MissionLogEntry[]
}
