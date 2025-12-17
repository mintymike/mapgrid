# Drone API Integration Guide

## Overview

The MapGrid application has been fully integrated with a drone API architecture. Currently running in **MOCK MODE** for testing, but ready to connect to a real Raspberry Pi + Pixhawk system via Tailscale.

## What's Been Implemented

### 1. **Drone API Client** (`src/services/droneApi.ts`)

A complete API client with mock simulation:

**Features:**
- ✅ Full mock drone simulator for testing without hardware
- ✅ RESTful API client ready for Raspberry Pi connection
- ✅ Telemetry polling with configurable intervals
- ✅ All MAVLink command support (arm, disarm, takeoff, land, goto, etc.)

**Mock Mode:**
```typescript
const MOCK_MODE = true // Set to false when connecting to real Raspberry Pi
const DRONE_API_BASE = 'http://100.64.0.1:8000' // Your Raspberry Pi Tailscale IP
```

The mock simulator:
- Simulates realistic drone movement with physics
- Updates position at 20 Hz
- Drains battery during flight
- Simulates GPS fix, satellites, and telemetry
- Responds to commands with realistic delays

### 2. **Voice Command System** (`src/components/VoiceCommand.vue`)

Full voice control using Web Speech API:

**Supported Commands:**
- **Basic Control:** "Arm", "Disarm", "Takeoff to 15 meters", "Land"
- **Navigation:** "Go to sector A5", "Fly to B3", "Return to launch"
- **Speed:** "Set speed to 8"
- **Search:** "Start parallel search", "Begin expanding square search"
- **Info:** "Status report", "Clear grid"

**Features:**
- Real-time speech recognition
- Confidence scoring
- Visual feedback of commands
- Error handling with user-friendly messages
- Expandable command list

**Browser Support:**
- ✅ Chrome/Edge (full support)
- ✅ Safari (full support)
- ❌ Firefox (limited Web Speech API support)

### 3. **Drone Control Panel** (`src/components/DroneControl.vue`)

Manual drone control interface:

**Features:**
- Live telemetry overview (mode, armed status, battery, altitude)
- Arm/Disarm buttons
- Takeoff with configurable altitude
- Land and RTL buttons
- Speed control slider
- GPS status display
- Connection status indicator

### 4. **Enhanced Telemetry** (`src/components/DroneTelemetry.vue`)

Updated with API integration:

**Features:**
- Toggle between manual and API telemetry
- Live telemetry updates (500ms polling)
- Auto-connects in mock mode for testing
- Shows connection status
- Maintains manual position setter for simulation

### 5. **Store Integration** (`src/stores/mapGrid.ts`)

Added method to sync telemetry from API:

```typescript
updateFromApiTelemetry(telemetry)
```

Automatically updates drone position on map from real telemetry data.

## How to Use

### Testing with Mock Drone (Current Setup)

1. **Run the application:**
   ```bash
   npm run dev
   ```

2. **The mock drone automatically:**
   - Starts at coordinates (52.2319, 21.0045)
   - Shows telemetry in the Drone Control panel
   - Responds to all commands realistically

3. **Try these workflows:**

   **A. Manual Control:**
   - Create a grid using the rectangle tool
   - Click "Arm" in Drone Control
   - Set takeoff altitude (e.g., 10m)
   - Click "Takeoff"
   - Watch the drone climb on the map
   - Click "Land" to bring it down

   **B. Voice Commands:**
   - Click "Start Voice Commands" in the Voice Command panel
   - Say "Arm"
   - Say "Takeoff to 15 meters"
   - Say "Go to sector B5" (if sector exists)
   - Say "Land"

   **C. Search Patterns:**
   - Create a grid
   - Arm and takeoff the drone
   - Start a search pattern
   - Watch the drone fly through all sectors automatically

### Connecting to Real Raspberry Pi

When you have the Raspberry Pi set up:

1. **Update API Configuration:**

   Edit `src/services/droneApi.ts`:
   ```typescript
   const MOCK_MODE = false // Disable mock
   const DRONE_API_BASE = 'http://100.x.x.x:8000' // Your Pi's Tailscale IP
   ```

2. **The application will:**
   - Connect to your Raspberry Pi FastAPI server
   - Receive real telemetry from Pixhawk
   - Send commands to the real drone
   - Update map with actual GPS position

## API Endpoints Expected on Raspberry Pi

Your FastAPI server should implement these endpoints:

### Telemetry
- `GET /telemetry` - Get current telemetry snapshot
- `GET /health` - Health check

### Commands
- `POST /arm` - Arm the drone
- `POST /disarm` - Disarm the drone
- `POST /takeoff?altitude={meters}` - Takeoff to altitude
- `POST /land` - Land the drone
- `POST /rtl` - Return to launch
- `POST /goto?lat={lat}&lng={lng}&altitude={alt}` - Go to position
- `POST /set-speed?speed={mps}` - Set ground speed

### Telemetry Format
```json
{
  "position": {
    "lat": 52.2319,
    "lng": 21.0045,
    "altitude_msl": 150.5,
    "altitude_agl": 10.2
  },
  "attitude": {
    "roll": 0.01,
    "pitch": 0.02,
    "yaw": 1.57,
    "heading": 90.5
  },
  "velocity": {
    "vx": 2.5,
    "vy": 1.2,
    "vz": 0.1,
    "groundspeed": 5.5,
    "airspeed": 6.0
  },
  "battery": {
    "voltage": 12.4,
    "current": 15.5,
    "level": 85.0
  },
  "gps": {
    "fix_type": 3,
    "satellites_visible": 12,
    "eph": 0.8
  },
  "status": {
    "armed": true,
    "mode": "GUIDED",
    "system_status": "ACTIVE",
    "is_armable": true
  },
  "home": {
    "lat": 52.2319,
    "lng": 21.0045,
    "alt": 140.0
  },
  "timestamp": 1234567890.123
}
```

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           MapGrid Application               │
│  ┌───────────────────────────────────────┐  │
│  │  Components:                          │  │
│  │  - VoiceCommand (Web Speech API)     │  │
│  │  - DroneControl (Manual controls)     │  │
│  │  - DroneTelemetry (Live data)         │  │
│  │  - MapView (Drone visualization)      │  │
│  └──────────────┬────────────────────────┘  │
│                 │                            │
│  ┌──────────────▼────────────────────────┐  │
│  │  droneApi.ts                          │  │
│  │  - MOCK_MODE: true (simulated)        │  │
│  │  - MOCK_MODE: false (real Pi)         │  │
│  └──────────────┬────────────────────────┘  │
└─────────────────┼───────────────────────────┘
                  │ HTTP REST API
                  │ (Tailscale encrypted tunnel)
┌─────────────────▼───────────────────────────┐
│  Raspberry Pi (Future)                      │
│  ┌───────────────────────────────────────┐  │
│  │  FastAPI Server                       │  │
│  │  - REST endpoints                     │  │
│  │  - DroneKit/PyMAVLink                 │  │
│  └──────────────┬────────────────────────┘  │
│                 │ Serial/MAVLink            │
│  ┌──────────────▼────────────────────────┐  │
│  │  Pixhawk Flight Controller            │  │
│  │  - GPS, IMU, sensors                  │  │
│  │  - Motor control                      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Testing Checklist

- [x] Mock drone responds to arm/disarm
- [x] Mock drone takeoff and land
- [x] Mock drone flies to sectors via voice
- [x] Mock drone follows search patterns
- [x] Voice commands work in supported browsers
- [x] Telemetry updates in real-time
- [x] Battery drains during flight
- [x] Map shows drone position updates
- [ ] Connect to real Raspberry Pi (when ready)
- [ ] Test with real Pixhawk telemetry (when ready)

## Next Steps

### For Testing (Now)
1. Run `npm run dev`
2. Test all voice commands
3. Test search patterns with mock drone
4. Verify UI responsiveness

### For Production (Later)
1. Set up Raspberry Pi with FastAPI server
2. Connect Pixhawk to Raspberry Pi via UART
3. Install Tailscale on both laptop and Pi
4. Update `DRONE_API_BASE` with Pi's Tailscale IP
5. Set `MOCK_MODE = false`
6. Test connection with real hardware

## Safety Notes

⚠️ **Important Safety Considerations:**

1. **Mock Mode First:** Always test with mock mode before connecting to real hardware
2. **Geofencing:** Consider adding geofence checks in the Raspberry Pi server
3. **Battery Monitoring:** Implement automatic RTL at low battery (recommended: 20%)
4. **Communication Loss:** Pi should have failsafe if laptop disconnects
5. **Manual Override:** Always have RC transmitter ready for manual takeover
6. **Voice Command Confirmation:** Consider adding confirmation for critical commands
7. **Altitude Limits:** Set reasonable altitude limits (e.g., max 100m)

## Troubleshooting

### Voice Commands Not Working
- Check browser console for errors
- Verify microphone permissions
- Use Chrome/Edge (best support)
- Speak clearly in quiet environment

### Mock Drone Not Moving
- Check browser console for errors
- Verify drone is armed before takeoff
- Check that grid exists before sector commands

### Real Pi Connection Issues (Future)
- Verify Tailscale connection: `ping 100.x.x.x`
- Check Pi server is running: `curl http://100.x.x.x:8000/health`
- Check firewall settings on Pi
- Verify correct IP in `DRONE_API_BASE`

## API Client Usage Examples

```typescript
import { droneApi } from '@/services/droneApi'

// Get telemetry
const telemetry = await droneApi.getTelemetry()

// Arm drone
await droneApi.arm()

// Takeoff to 15 meters
await droneApi.takeoff(15)

// Go to coordinates
await droneApi.gotoPosition(52.2320, 21.0046, 20)

// Set speed to 8 m/s
await droneApi.setSpeed(8)

// Land
await droneApi.land()

// Return to launch
await droneApi.returnToLaunch()

// Start telemetry polling
droneApi.startTelemetryPolling((telemetry) => {
  console.log('Position:', telemetry.position)
}, 500) // 500ms interval
```

## Configuration Summary

**Current State:**
- ✅ Mock mode enabled
- ✅ Full UI implemented
- ✅ Voice commands working
- ✅ Search patterns integrated
- ✅ Real-time telemetry visualization
- ⏳ Waiting for Raspberry Pi hardware setup

**To Go Live:**
1. Change 2 lines in `droneApi.ts`
2. Deploy FastAPI server on Raspberry Pi
3. Test connection
4. Start flying!
