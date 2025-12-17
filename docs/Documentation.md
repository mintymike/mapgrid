# MapGrid (Vue + Leaflet + NeutralinoJS) — Documentation

A lightweight desktop application built with **Vue.js** (UI) and **Leaflet** (map) and packaged later with **NeutralinoJS**.  
The app lets an operator:

- View a map and the **live drone position** (from Pixhawk telemetry via Raspberry Pi).
- **Draw a rectangular search area** on the map.
- Automatically divide that area into **grid sectors** (small squares) labeled like **A1, B1, C1…**.
- Each sector is tied to **latitude/longitude bounding boxes** and provides a **center coordinate**.
- Send commands like **“Fly to sector B4”** to the drone (interpreted as flying to the sector center, or within its bounds).
- Configure **sector size** (1m, 5m, 10m, etc.) and a few additional options.

---

## 1. Goals and Non-Goals

### Goals
- Minimal UI, low dependencies.
- Accurate sector-to-coordinate mapping:
  - each sector has a bounding box `(southWest, northEast)`
  - each sector has a center point `(lat, lng)`
- Telemetry display in real time.
- Command dispatch by sector label.

### Non-Goals (initial phase)
- Full mission planning UI
- Autopilot parameter configuration
- 3D visualization
- High-frequency video streaming

---

## 2. High-Level Architecture

### Components
- **Vue.js**: app state + UI
- **Leaflet**: map rendering, overlays, drawing rectangle
- **(Optional) Leaflet.draw**: simplest way to draw rectangle; can also implement your own rectangle tool
- **NeutralinoJS** (later): packaging + native bridge (filesystem, networking, etc.)

### Data Flow
1. User draws an area rectangle on map.
2. App converts rectangle bounds to a **meter-based grid**, then converts back to lat/lng per sector.
3. App renders sector overlays and labels.
4. Raspberry Pi / ground service sends telemetry updates (lat/lng).
5. App updates drone marker position.
6. User selects or types sector (e.g. B4).
7. App resolves that sector → center coordinate (or bbox).


