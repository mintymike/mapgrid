// Drone API Client with Mock Mode for Testing
// In production, set MOCK_MODE = false and configure DRONE_API_BASE to your Raspberry Pi Tailscale IP

const MOCK_MODE = true // Set to false when connecting to real Raspberry Pi
const DRONE_API_BASE = 'http://100.64.0.1:8000' // Update with your Raspberry Pi Tailscale IP

export interface Telemetry {
  position: {
    lat: number
    lng: number
    altitude_msl: number
    altitude_agl: number
  }
  attitude: {
    roll: number
    pitch: number
    yaw: number
    heading: number
  }
  velocity: {
    vx: number
    vy: number
    vz: number
    groundspeed: number
    airspeed: number
  }
  battery: {
    voltage: number
    current: number
    level: number
  }
  gps: {
    fix_type: number
    satellites_visible: number
    eph: number
  }
  status: {
    armed: boolean
    mode: string
    system_status: string
    is_armable: boolean
  }
  home: {
    lat: number | null
    lng: number | null
    alt: number | null
  }
  timestamp: number
}

export interface CommandResponse {
  status: string
  message?: string
  [key: string]: any
}

// Mock telemetry state for simulation
class MockDroneSimulator {
  private currentPosition = { lat: 52.2319, lng: 21.0045, altitude: 0 }
  private targetPosition: { lat: number; lng: number; altitude: number } | null = null
  private armed = false
  private mode = 'STABILIZE'
  private flying = false
  private heading = 0
  private speed = 5 // m/s
  private batteryLevel = 95
  private homePosition: { lat: number; lng: number; alt: number } | null = null

  arm() {
    this.armed = true
    this.mode = 'GUIDED'
  }

  disarm() {
    this.armed = false
    this.flying = false
    this.targetPosition = null
  }

  takeoff(altitude: number) {
    if (!this.armed) throw new Error('Drone must be armed first')

    if (!this.homePosition) {
      this.homePosition = { ...this.currentPosition, alt: this.currentPosition.altitude }
    }

    this.flying = true
    this.targetPosition = { ...this.currentPosition, altitude }
    this.mode = 'GUIDED'
  }

  land() {
    this.mode = 'LAND'
    this.targetPosition = { ...this.currentPosition, altitude: 0 }
  }

  rtl() {
    if (this.homePosition) {
      this.mode = 'RTL'
      this.targetPosition = {
        lat: this.homePosition.lat,
        lng: this.homePosition.lng,
        altitude: 15
      }
    }
  }

  gotoPosition(lat: number, lng: number, altitude?: number) {
    if (!this.armed) throw new Error('Drone must be armed')

    this.targetPosition = {
      lat,
      lng,
      altitude: altitude ?? this.currentPosition.altitude
    }
    this.mode = 'GUIDED'
  }

  setSpeed(speed: number) {
    this.speed = speed
  }

  // Update simulation (called periodically)
  update(deltaTime: number) {
    if (this.targetPosition && this.flying) {
      // Calculate distance to target
      const latDiff = this.targetPosition.lat - this.currentPosition.lat
      const lngDiff = this.targetPosition.lng - this.currentPosition.lng
      const altDiff = this.targetPosition.altitude - this.currentPosition.altitude

      const horizontalDist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111320 // rough meters
      const totalDist = Math.sqrt(horizontalDist * horizontalDist + altDiff * altDiff)

      if (totalDist < 0.5) {
        // Reached target
        this.currentPosition = { ...this.targetPosition }

        if (this.mode === 'LAND' && this.currentPosition.altitude <= 0.1) {
          this.flying = false
          this.armed = false
          this.mode = 'STABILIZE'
        }
      } else {
        // Move towards target
        const moveDistance = this.speed * deltaTime
        const ratio = Math.min(moveDistance / totalDist, 1)

        this.currentPosition.lat += latDiff * ratio
        this.currentPosition.lng += lngDiff * ratio
        this.currentPosition.altitude += altDiff * ratio

        // Update heading
        this.heading = (Math.atan2(lngDiff, latDiff) * 180 / Math.PI + 360) % 360
      }

      // Drain battery slowly
      this.batteryLevel -= 0.001 * deltaTime
    }
  }

  getTelemetry(): Telemetry {
    return {
      position: {
        lat: this.currentPosition.lat,
        lng: this.currentPosition.lng,
        altitude_msl: this.currentPosition.altitude + 100, // Simulated MSL
        altitude_agl: this.currentPosition.altitude
      },
      attitude: {
        roll: Math.random() * 2 - 1, // Small random oscillation
        pitch: Math.random() * 2 - 1,
        yaw: this.heading * Math.PI / 180,
        heading: this.heading
      },
      velocity: {
        vx: this.flying && this.targetPosition ? this.speed * 0.8 : 0,
        vy: this.flying && this.targetPosition ? this.speed * 0.6 : 0,
        vz: this.flying && this.targetPosition ? Math.random() * 0.5 - 0.25 : 0,
        groundspeed: this.flying && this.targetPosition ? this.speed : 0,
        airspeed: this.flying && this.targetPosition ? this.speed * 1.1 : 0
      },
      battery: {
        voltage: 12.4 - (1 - this.batteryLevel / 100) * 2,
        current: this.flying ? 15 + Math.random() * 5 : 1,
        level: this.batteryLevel
      },
      gps: {
        fix_type: 3, // 3D fix
        satellites_visible: 12 + Math.floor(Math.random() * 4),
        eph: 0.5 + Math.random() * 0.3
      },
      status: {
        armed: this.armed,
        mode: this.mode,
        system_status: this.armed ? 'ACTIVE' : 'STANDBY',
        is_armable: !this.armed && this.batteryLevel > 20
      },
      home: this.homePosition ? {
        lat: this.homePosition.lat,
        lng: this.homePosition.lng,
        alt: this.homePosition.alt
      } : {
        lat: null,
        lng: null,
        alt: null
      },
      timestamp: Date.now() / 1000
    }
  }

  setPosition(lat: number, lng: number, altitude: number = 0) {
    this.currentPosition = { lat, lng, altitude }
  }
}

class DroneApiClient {
  private baseUrl: string
  private mockMode: boolean
  private mockSimulator: MockDroneSimulator
  private telemetryInterval?: number
  private lastUpdateTime = Date.now()

  constructor(baseUrl: string = DRONE_API_BASE, mockMode: boolean = MOCK_MODE) {
    // Try to load settings from localStorage
    const savedSettings = this.loadSettings()
    this.baseUrl = savedSettings?.apiBaseUrl || baseUrl
    this.mockMode = savedSettings?.useMockMode ?? mockMode
    this.mockSimulator = new MockDroneSimulator()

    if (this.mockMode) {
      // Start mock simulation update loop
      setInterval(() => {
        const now = Date.now()
        const deltaTime = (now - this.lastUpdateTime) / 1000
        this.lastUpdateTime = now
        this.mockSimulator.update(deltaTime)
      }, 50) // 20 Hz update
    }
  }

  async getTelemetry(): Promise<Telemetry> {
    if (this.mockMode) {
      // Simulate network delay
      await this.delay(10)
      return this.mockSimulator.getTelemetry()
    }

    const response = await fetch(`${this.baseUrl}/telemetry`)
    if (!response.ok) throw new Error('Failed to fetch telemetry')
    return response.json()
  }

  async arm(): Promise<CommandResponse> {
    if (this.mockMode) {
      await this.delay(500)
      this.mockSimulator.arm()
      return { status: 'armed', mode: 'GUIDED' }
    }

    const response = await fetch(`${this.baseUrl}/arm`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to arm drone')
    return response.json()
  }

  async disarm(): Promise<CommandResponse> {
    if (this.mockMode) {
      await this.delay(300)
      this.mockSimulator.disarm()
      return { status: 'disarmed' }
    }

    const response = await fetch(`${this.baseUrl}/disarm`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to disarm drone')
    return response.json()
  }

  async takeoff(altitude: number = 10): Promise<CommandResponse> {
    if (this.mockMode) {
      await this.delay(500)
      this.mockSimulator.takeoff(altitude)
      return { status: 'taking_off', target_altitude: altitude, message: `Taking off to ${altitude}m` }
    }

    const response = await fetch(`${this.baseUrl}/takeoff?altitude=${altitude}`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to takeoff')
    return response.json()
  }

  async land(): Promise<CommandResponse> {
    if (this.mockMode) {
      await this.delay(300)
      this.mockSimulator.land()
      return { status: 'landing' }
    }

    const response = await fetch(`${this.baseUrl}/land`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to land')
    return response.json()
  }

  async returnToLaunch(): Promise<CommandResponse> {
    if (this.mockMode) {
      await this.delay(300)
      this.mockSimulator.rtl()
      return { status: 'returning_to_launch' }
    }

    const response = await fetch(`${this.baseUrl}/rtl`, { method: 'POST' })
    if (!response.ok) throw new Error('Failed to RTL')
    return response.json()
  }

  async gotoPosition(lat: number, lng: number, altitude?: number): Promise<CommandResponse> {
    if (this.mockMode) {
      await this.delay(200)
      this.mockSimulator.gotoPosition(lat, lng, altitude)
      return {
        status: 'navigating',
        target: { lat, lng, altitude: altitude ?? this.mockSimulator.getTelemetry().position.altitude_agl }
      }
    }

    const url = new URL(`${this.baseUrl}/goto`)
    url.searchParams.append('lat', lat.toString())
    url.searchParams.append('lng', lng.toString())
    if (altitude !== undefined) url.searchParams.append('altitude', altitude.toString())

    const response = await fetch(url.toString(), { method: 'POST' })
    if (!response.ok) throw new Error('Failed to goto position')
    return response.json()
  }

  async setSpeed(speed: number): Promise<CommandResponse> {
    if (this.mockMode) {
      await this.delay(100)
      this.mockSimulator.setSpeed(speed)
      return { status: 'speed_set', speed_mps: speed }
    }

    const response = await fetch(`${this.baseUrl}/set-speed?speed=${speed}`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to set speed')
    return response.json()
  }

  async healthCheck(): Promise<{ status: string; vehicle_connected: boolean; timestamp: number }> {
    if (this.mockMode) {
      await this.delay(50)
      return {
        status: 'healthy',
        vehicle_connected: true,
        timestamp: Date.now() / 1000
      }
    }

    const response = await fetch(`${this.baseUrl}/health`)
    if (!response.ok) throw new Error('Health check failed')
    return response.json()
  }

  // Poll telemetry at regular intervals
  startTelemetryPolling(callback: (telemetry: Telemetry) => void, intervalMs: number = 200) {
    this.stopTelemetryPolling()
    this.telemetryInterval = window.setInterval(async () => {
      try {
        const telemetry = await this.getTelemetry()
        callback(telemetry)
      } catch (error) {
        console.error('Telemetry polling error:', error)
      }
    }, intervalMs)
  }

  stopTelemetryPolling() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval)
      this.telemetryInterval = undefined
    }
  }

  // Mock-specific: Set drone position manually for testing
  setMockPosition(lat: number, lng: number, altitude: number = 0) {
    if (this.mockMode) {
      this.mockSimulator.setPosition(lat, lng, altitude)
    }
  }

  // Check if in mock mode
  isMockMode(): boolean {
    return this.mockMode
  }

  // Toggle mock mode
  setMockMode(enabled: boolean) {
    this.mockMode = enabled
  }

  // Update API base URL
  setBaseUrl(url: string) {
    this.baseUrl = url
  }

  // Get current base URL
  getBaseUrl(): string {
    return this.baseUrl
  }

  // Load settings from localStorage
  private loadSettings(): { apiBaseUrl?: string; useMockMode?: boolean } | null {
    try {
      const stored = localStorage.getItem('mapgrid-settings')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
    return null
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const droneApi = new DroneApiClient()
