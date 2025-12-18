# MapGrid - Drone Search Area Controller

A professional desktop application for autonomous drone search and rescue operations, built with Vue.js, MapLibre GL, and Microsoft Fluent UI design system.

![License](https://img.shields.io/badge/license-Private-red)
![Vue](https://img.shields.io/badge/Vue-3.5-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## Overview

MapGrid is a comprehensive drone mission planning and control application designed for search and rescue operations. It provides grid-based sector management, automated search patterns, real-time telemetry, voice command integration, and direct drone control through MAVLink-compatible APIs.

## Key Features

### Grid Management
- **Interactive Map**: MapLibre GL-powered map with satellite and street view layers
- **Rectangle Drawing**: Draw rectangular search areas directly on the map
- **Automatic Grid Generation**: Divide search areas into labeled sectors (A1, B1, C1, etc.)
- **Configurable Sector Sizes**: 1m, 2m, 5m, 10m, 20m, 50m, 100m sector dimensions
- **Sector Navigation**: Click sectors on map or select from list
- **Live Sector Highlighting**: Visual feedback for selected sectors

### Drone Control
- **Arm/Disarm**: Safety controls for drone arming
- **Takeoff/Land**: Automated takeoff with configurable altitude
- **Return to Launch (RTL)**: Emergency return functionality
- **Speed Control**: Adjustable flight speed (1-20 m/s)
- **Real-time Status**: Armed status, flight mode, battery level, altitude
- **Manual Position Control**: Set drone position for testing

### Search Patterns
- **Parallel Track Search (PS)**: Systematic horizontal/vertical sweeps
- **Expanding Square Search (SS)**: Outward spiral from center point
- **Contour Search (OS)**: Follow area perimeter
- **Sector Search (VS)**: Sequential sector-by-sector coverage
- **Progress Tracking**: Visual progress bars and sector completion status
- **Pause/Resume**: Interrupt and continue search operations

### Voice Commands
- **Speech Recognition**: Browser-based voice command support (Chrome, Edge, Safari)
- **Natural Language**: Intuitive commands like "Arm", "Takeoff to 15 meters", "Go to sector A5"
- **Command Confidence**: Adjustable confidence threshold for accuracy
- **Real-time Transcription**: Live display of recognized speech
- **Comprehensive Command Set**: Navigation, control, search patterns, status queries

### Live Telemetry
- **Real-time Updates**: 500ms polling interval for responsive data
- **Position Data**: GPS coordinates, altitude, heading, speed
- **System Status**: Battery level, flight mode, armed state, GPS fix
- **Current Sector Display**: Shows which sector the drone is currently in
- **API Integration**: Toggle between mock and live telemetry

### Settings & Configuration
- **API Configuration**: Connect to Raspberry Pi via Tailscale IP
- **Mock Mode**: Test without hardware using simulated drone
- **Telemetry Interval**: Configurable update frequency (100-2000ms)
- **Default Parameters**: Set default takeoff altitude and speed
- **Voice Settings**: Enable/disable voice commands, adjust confidence threshold
- **Import/Export**: Save and restore settings as JSON

## Design System

Built with **Microsoft Fluent UI** for a professional, enterprise-grade appearance:
- **Typography**: Segoe UI font family
- **Color Palette**: Microsoft Blue primary colors (#0078d4) with neutral grays
- **Depth System**: Layered shadows for visual hierarchy
- **Smooth Transitions**: Cubic-bezier easing for polished interactions
- **Minimalist Design**: Icon-free interface focused on functionality
- **Responsive Layout**: Adapts to different screen sizes
- **Tabbed Navigation**: Organized into Grid, Drone, Search, Commands, and Settings tabs

## Project Structure

```
mapgrid/
├── src/
│   ├── components/
│   │   ├── MapView.vue           # MapLibre GL map with sector overlays
│   │   ├── ControlPanel.vue      # Grid generation and configuration
│   │   ├── DroneControl.vue      # Arm, takeoff, land, RTL controls
│   │   ├── DroneTelemetry.vue    # Real-time telemetry display
│   │   ├── SearchPatterns.vue    # Search pattern selection and control
│   │   ├── VoiceCommand.vue      # Speech recognition integration
│   │   ├── SectorCommand.vue     # Manual sector navigation
│   │   └── Settings.vue          # Application configuration
│   ├── services/
│   │   └── droneApi.ts           # MAVLink API integration layer
│   ├── stores/
│   │   └── mapGrid.ts            # Pinia state management
│   ├── assets/
│   │   └── fluent-tokens.css     # Fluent UI design tokens
│   ├── App.vue                   # Main layout with tabbed sidebar
│   └── main.ts                   # Application entry point
├── public/                       # Static assets
├── FLUENT_UI_UPDATE_GUIDE.md     # Design system documentation
└── README.md                     # This file
```

## Getting Started

### Prerequisites
- **Node.js**: ^20.19.0 || >=22.12.0
- **npm**: Latest version
- **Modern Browser**: Chrome, Edge, or Safari (for voice commands)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mintymike/mapgrid.git
cd mapgrid
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

4. **Open in browser**
Navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Usage Guide

### 1. Initial Setup

**Configure API Connection (Settings Tab)**
- Toggle "Use Mock Mode" for testing without hardware
- Enter Raspberry Pi Tailscale IP (e.g., `http://100.64.0.1:8000`)
- Click "Test Connection" to verify connectivity
- Adjust telemetry update interval as needed

### 2. Create Search Grid

**Grid Tab**
1. Click the rectangle drawing tool on the map
2. Draw a search area by clicking and dragging
3. Select desired sector size from dropdown
4. Grid sectors will be automatically generated and labeled
5. View sector list and click to highlight individual sectors

### 3. Control Drone

**Drone Tab**
1. Verify connection status (Connected/Disconnected)
2. Click "Arm" to prepare drone for flight
3. Set takeoff altitude (default: 10m)
4. Click "Takeoff" to launch
5. Monitor telemetry: battery, altitude, GPS status
6. Use "Land" or "RTL" for safe return

### 4. Execute Search Pattern

**Search Tab**
1. Select search pattern type:
   - **Parallel Track**: Best for rectangular areas
   - **Expanding Square**: Best for point-of-last-contact searches
   - **Contour**: Best for irregular terrain
   - **Sector**: Best for systematic coverage
2. Configure pattern parameters (direction, center, order)
3. Ensure drone is armed and positioned
4. Click "Start Search" to begin autonomous flight
5. Monitor progress bar and sector completion
6. Use "Pause" or "Stop" as needed

### 5. Voice Commands

**Commands Tab**
1. Click "Start Voice Commands"
2. Grant microphone permissions when prompted
3. Speak clearly:
   - **Basic**: "Arm", "Disarm", "Takeoff", "Land", "Go home"
   - **Navigation**: "Go to sector A5", "Fly to B3"
   - **Speed**: "Set speed to 8"
   - **Search**: "Start parallel search", "Stop search"
   - **Info**: "Status report"
4. View real-time transcription and command confidence
5. Check command history and status messages

### 6. Manual Navigation

**Commands Tab - Sector Command**
- Type sector label (e.g., "B4") in input field
- Click "Fly To" or press Enter
- Map centers on sector, drone navigates to center coordinates

## API Integration

### Raspberry Pi Setup

MapGrid connects to a Raspberry Pi running MAVLink API server:

```bash
# On Raspberry Pi
python3 mavlink_api_server.py --port 8000
```

**Required Endpoints:**
- `GET /health` - Health check
- `GET /telemetry` - Real-time telemetry data
- `POST /arm` - Arm the drone
- `POST /disarm` - Disarm the drone
- `POST /takeoff` - Takeoff with altitude parameter
- `POST /land` - Land at current position
- `POST /rtl` - Return to launch
- `POST /goto` - Navigate to coordinates
- `POST /speed` - Set flight speed

### Telemetry Data Format

```typescript
interface Telemetry {
  status: {
    armed: boolean
    mode: string  // "GUIDED", "STABILIZE", "LAND", etc.
    is_armable: boolean
  }
  position: {
    lat: number
    lng: number
    altitude_msl: number
    altitude_agl: number
  }
  velocity: {
    vx: number
    vy: number
    vz: number
    groundspeed: number
  }
  battery: {
    voltage: number
    current: number
    level: number  // 0-100%
  }
  gps: {
    fix_type: number  // 0=No Fix, 2=2D, 3=3D
    satellites_visible: number
    eph: number  // Horizontal accuracy
  }
  attitude: {
    roll: number
    pitch: number
    yaw: number
  }
}
```

## Voice Command Reference

### Basic Control
- "Arm" - Arm the drone
- "Disarm" - Disarm the drone
- "Takeoff" / "Takeoff to 15 meters" - Launch to altitude
- "Land" - Land at current position
- "Return to launch" / "Go home" - RTL mode

### Navigation
- "Go to sector A5" / "Fly to B3" - Navigate to sector
- "Set speed to 8" - Change flight speed

### Search Patterns
- "Start parallel search" - Begin parallel track pattern
- "Begin expanding square search" - Start expanding square
- "Start contour search" - Begin contour pattern
- "Stop search" - Halt search pattern

### Information
- "Status report" - Get drone status summary
- "Clear grid" - Remove current grid

## State Management (Pinia)

```typescript
interface MapGridStore {
  // Grid State
  sectors: Sector[]
  searchArea: SearchArea | null
  sectorSizeMeters: number
  selectedSector: string | null

  // Drone State
  dronePosition: DronePosition | null
  droneSpeed: number
  isFlying: boolean

  // Search State
  searchPath: LatLng[]
  isSearching: boolean
  currentSearchPattern: SearchPatternType | null

  // Actions
  generateGrid(bounds: LatLngBounds, sizeMeters: number): void
  updateDronePosition(lat: number, lng: number): void
  startSearchPattern(pattern: SearchPatternType, options: PatternOptions): void
  flyToSector(sectorLabel: string): LatLng
}
```

## Technologies

- **Vue 3** (3.5.13) - Progressive JavaScript framework
- **TypeScript** (5.7.2) - Type-safe development
- **Pinia** (2.3.0) - State management
- **MapLibre GL JS** (4.8.2) - Interactive maps
- **Vite** (6.0.3) - Build tool and dev server
- **Web Speech API** - Voice command recognition

## Development

### Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/)
- [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

### Type Support
Type checking is provided through `vue-tsc`:
```bash
npm run type-check
```

### Code Formatting
```bash
npm run format
```

## Fluent UI Design Tokens

Available CSS variables for consistent styling:

```css
/* Colors */
--fluent-grey-10: #faf9f8    /* Background */
--fluent-grey-30: #edebe9    /* Borders */
--fluent-blue-50: #0078d4    /* Primary */
--fluent-blue-60: #106ebe    /* Primary Hover */

/* Shadows */
--fluent-shadow-2: /* Subtle depth */
--fluent-shadow-4: /* Card elevation */

/* Spacing */
--fluent-spacing-xs: 4px
--fluent-spacing-s: 8px
--fluent-spacing-m: 12px
--fluent-spacing-l: 16px

/* Typography */
--fluent-font-family: 'Segoe UI', ...
--fluent-font-size-base: 14px
```

See `FLUENT_UI_UPDATE_GUIDE.md` for detailed design system documentation.

## Deployment

### NeutralinoJS Integration (Future)
The application is designed for packaging as a native desktop app using NeutralinoJS:
- Cross-platform compatibility (Windows, macOS, Linux)
- Small binary size (~3MB)
- Native file system access
- System tray integration
- Auto-start capability

## Troubleshooting

### Voice Commands Not Working
- Ensure you're using Chrome, Edge, or Safari
- Grant microphone permissions
- Speak clearly in a quiet environment
- Check confidence threshold in Settings

### API Connection Failed
- Verify Raspberry Pi is powered on
- Check Tailscale connection
- Confirm correct IP address in Settings
- Test with "Test Connection" button
- Check firewall settings on Raspberry Pi

### Grid Not Generating
- Ensure search area is drawn completely
- Try a larger sector size
- Check browser console for errors
- Clear grid and redraw area

## Contributing

This is a private project. For questions or issues, contact the repository owner.

## License

Private project for search and rescue drone operations.

## Acknowledgments

- Microsoft Fluent UI Design System
- MapLibre GL JS mapping library
- Vue.js community
- OpenStreetMap contributors

---

**Built with** ❤️ **for Search and Rescue Operations**
