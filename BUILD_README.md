# MapGrid Desktop Application - Build & Distribution Guide

## Built Successfully! 🎉

Your MapGrid application has been packaged as a desktop application using NeutralinoJS.

## Quick Start

### Running the Windows Application

1. Navigate to `dist/mapgrid/`
2. Double-click `mapgrid-win_x64.exe`
3. The application will launch in a native window!

### Distribution Package

The complete distribution package is available at:
- **File**: `dist/mapgrid-release.zip` (4.9 MB)
- **Contains**: All platform executables + resources

## Available Platforms

The build includes executables for all major platforms:

- **Windows**: `mapgrid-win_x64.exe` (2.6 MB)
- **macOS (Apple Silicon)**: `mapgrid-mac_arm64`
- **macOS (Intel)**: `mapgrid-mac_x64`
- **macOS (Universal)**: `mapgrid-mac_universal` (4.0 MB)
- **Linux (x64)**: `mapgrid-linux_x64`
- **Linux (ARM64)**: `mapgrid-linux_arm64`
- **Linux (ARMhf)**: `mapgrid-linux_armhf`

## Development Commands

### Build for Production
```bash
npm run package
```
This command:
1. Runs TypeScript type checking
2. Builds the Vue.js application
3. Packages everything with NeutralinoJS
4. Creates executables for all platforms
5. Generates the release ZIP file

### Development Mode
```bash
# Run Vue dev server
npm run dev

# Run as NeutralinoJS desktop app (development)
npm run neu:dev
```

### Other Useful Commands
```bash
# Build Vue app only
npm run build

# Build NeutralinoJS package
npm run neu:build

# Build Windows release specifically
npm run neu:build:win
```

## Distribution Options

### Option 1: Share the Release ZIP
- **File**: `dist/mapgrid-release.zip`
- **Size**: 4.9 MB
- **Contains**: All platform executables
- Users extract and run the appropriate executable for their platform

### Option 2: Share Platform-Specific Executables
Extract the ZIP and distribute individual platform executables:
- Send `mapgrid-win_x64.exe` to Windows users
- Send `mapgrid-mac_universal` to macOS users
- Send `mapgrid-linux_x64` to Linux users

Both the executable and `resources.neu` file are required!

## Application Features

✅ 2-column layout with collapsible sidebar (hamburger menu)
✅ All controls in left sidebar:
   - Control Panel (sector size settings)
   - Drone Telemetry (position, speed)
   - Sector Commands (coordinates display)
✅ MapLibre GL map with Warsaw, Poland as default view
✅ Rectangle drawing with visual preview
✅ Excel-style grid labeling (A1, B1, C1...)
✅ Sector highlighting (bright yellow with red border)
✅ Sector coordinate display (center point + bounding box)
✅ Drone flight simulation
✅ All sectors have exact same dimensions

## Technical Details

- **Framework**: Vue.js 3 + TypeScript
- **Map Engine**: MapLibre GL (WebGL-accelerated)
- **State Management**: Pinia
- **Desktop Wrapper**: NeutralinoJS 5.4.0
- **Bundle Size**: ~1.3 MB JavaScript (351 KB gzipped)
- **Executable Size**: 2.6 MB (Windows)

## Requirements

### For End Users
- **Windows**: Windows 10 or later (64-bit)
- **macOS**: macOS 10.13 or later
- **Linux**: Modern Linux distribution with GTK3

### For Development
- Node.js 20.19.0 or 22.12.0+
- npm 9.0.0+

## Configuration

The application configuration is in `neutralino.config.json`:
- Default window size: 1400×900
- Minimum window size: 1024×768
- Application ID: com.mapgrid.app
- Document root: `/dist/`

## File Structure

```
dist/
├── mapgrid/
│   ├── mapgrid-win_x64.exe      # Windows executable
│   ├── mapgrid-mac_universal     # macOS executable
│   ├── mapgrid-linux_x64         # Linux executable
│   └── resources.neu             # Application resources
├── assets/                       # Web assets (CSS, JS)
├── index.html                    # Main HTML file
└── mapgrid-release.zip          # Complete distribution package
```

## Troubleshooting

### Windows Antivirus Warning
If Windows Defender shows a warning, click "More info" → "Run anyway"
This is normal for unsigned applications.

### Application Won't Start
- Ensure both the `.exe` and `resources.neu` are in the same folder
- Check that you have the required runtime libraries installed

### Map Not Loading
- Ensure you have an active internet connection (map tiles load from OpenStreetMap)
- Check that your firewall isn't blocking the application

## Future Improvements

To add a custom icon:
1. Create `resources/icons/appIcon.png` (PNG format)
2. Create `resources/icons/appIcon.ico` (ICO format for Windows)
3. Uncomment the icon line in `neutralino.config.json`
4. Rebuild with `npm run package`

## License & Credits

- Built with NeutralinoJS (MIT License)
- Map data © OpenStreetMap contributors
- MapLibre GL (BSD License)

---

**Build Date**: December 17, 2025
**Version**: 1.0.0
