# MapGrid - Drone Search Area Controller

A lightweight desktop application for drone search area management built with Vue.js and Leaflet.

## Features

### Core Functionality
- **Interactive Map**: View and interact with a Leaflet-powered map using OpenStreetMap tiles
- **Rectangle Drawing**: Draw rectangular search areas on the map using Leaflet.Draw
- **Grid Sector Generation**: Automatically divide search areas into labeled grid sectors (A1, B1, C1, etc.)
- **Configurable Sector Size**: Choose sector dimensions (1m, 2m, 5m, 10m, 20m, 50m, 100m)
- **Live Drone Telemetry**: Display real-time drone position, altitude, heading, and speed
- **Sector Commands**: Send "Fly to Sector" commands by sector label
- **Sector Highlighting**: Click sectors on map or select from list to highlight
- **Command History**: Track recent sector commands with timestamps

### Technical Details
- Each sector has:
  - Unique label (e.g., A1, B4, C7)
  - Bounding box coordinates (southWest, northEast)
  - Center coordinate (lat, lng)
- Accurate lat/lng to meter conversion based on latitude
- Responsive layout with mobile support

## Project Structure

```
src/
├── components/
│   ├── MapView.vue          # Main map component with Leaflet integration
│   ├── ControlPanel.vue     # Grid configuration controls
│   ├── DroneTelemetry.vue   # Telemetry display panel
│   └── SectorCommand.vue    # Sector command interface
├── stores/
│   └── mapGrid.ts           # Pinia store for state management
├── App.vue                  # Main application layout
└── main.ts                  # Application entry point
```

## Getting Started

### Prerequisites
- Node.js (^20.19.0 || >=22.12.0)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## How to Use

### 1. Draw a Search Area
- Click the rectangle tool in the top-right corner of the map
- Draw a rectangular search area by clicking and dragging
- The grid will be automatically generated based on the current sector size

### 2. Configure Sector Size
- Use the "Sector Size" dropdown in the Control Panel
- Available sizes: 1m, 2m, 5m, 10m, 20m, 50m, 100m
- The grid will regenerate automatically when changed

### 3. View Drone Telemetry
- Telemetry data displays in the Drone Telemetry panel
- Shows: Latitude, Longitude, Altitude, Heading, Speed, Current Sector
- Click "Simulate Position" to test with mock data

### 4. Send Sector Commands
- Type a sector label (e.g., "B4") in the Sector Commands panel
- Click "Fly To" or press Enter to send the command
- The map will center on the selected sector
- Command history shows recent commands with coordinates

### 5. Navigate Sectors
- Click sectors directly on the map to select them
- Or click sector buttons in the Available Sectors grid
- Selected sectors are highlighted in red

## State Management

The application uses Pinia for centralized state management:

- `sectors`: Array of all grid sectors with coordinates
- `dronePosition`: Current drone position and telemetry
- `sectorSizeMeters`: Configurable sector size
- `searchArea`: Current search area bounds
- `selectedSector`: Currently selected sector label

## Integration Notes

### Telemetry Integration
In production, telemetry would come from:
- Raspberry Pi connected to Pixhawk autopilot
- MAVLink telemetry stream
- Update using `mapGridStore.updateDronePosition()`

### Command Dispatch
The `flyToSector()` action returns the target coordinates:
```typescript
const coords = mapGridStore.flyToSector('B4')
// coords = { lat: 0.00025, lng: 0.00025 }
// Send to drone via MAVLink/mission command
```

### Future Enhancements (NeutralinoJS Integration)
- Native file system access for mission saving/loading
- Direct serial port communication with flight controller
- System tray integration
- Packaged as lightweight desktop application

## Technologies Used

- **Vue 3**: Reactive UI framework
- **TypeScript**: Type-safe development
- **Pinia**: State management
- **Leaflet**: Interactive maps
- **Leaflet.Draw**: Drawing tools
- **Vite**: Build tool and dev server

## Development Setup

### Recommended IDE Setup
[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

### Type Support
TypeScript support is provided through `vue-tsc` and [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

## License

Private project for drone search operations.
