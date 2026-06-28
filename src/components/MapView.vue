<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import MaplibreDraw from 'maplibre-gl-draw'
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css'
import { useMapGridStore } from '@/stores/mapGrid'
import type { Feature, FeatureCollection, Polygon } from 'geojson'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null
let draw: MaplibreDraw | null = null
let droneMarker: maplibregl.Marker | null = null
let animationFrameId: number | null = null
let rectangleMode = false
let rectangleFirstCorner: { lng: number; lat: number } | null = null
let rectangleButton: HTMLButtonElement | null = null
let firstCornerMarker: maplibregl.Marker | null = null

const mapGridStore = useMapGridStore()

function handleKeyDown(e: KeyboardEvent) {
  if (!map) return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    if (rectangleButton) rectangleButton.click()
  }
  if (e.key === 'Escape') {
    if (rectangleMode) {
      if (rectangleButton) rectangleButton.click()
    }
    mapGridStore.selectedSector = null
  }
}

onMounted(() => {
  if (!mapContainer.value) return

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown)

  // Initialize MapLibre GL map
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center: [21.0122, 52.2297], // Warsaw, Poland
    zoom: 12
  })

  // Initialize drawing controls
  draw = new MaplibreDraw({
    displayControlsDefault: false,
    controls: {
      polygon: true,
      line_string: false,
      point: false,
      trash: true
    }
  })

  map.addControl(draw as any, 'top-right')

  // Add zoom and navigation controls
  map.addControl(new maplibregl.NavigationControl(), 'top-right')

  map.on('load', () => {
    // Add custom rectangle draw button
    rectangleButton = document.createElement('button')
    rectangleButton.className = 'maplibregl-ctrl-icon rectangle-draw-btn'
    rectangleButton.innerHTML = '▢'
    rectangleButton.title = 'Draw Rectangle (2 clicks)'
    rectangleButton.style.cssText = 'font-size: 17px; font-weight: 500; color: var(--color-text-secondary);'

    const rectangleControl = document.createElement('div')
    rectangleControl.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    rectangleControl.style.cssText = 'border-radius:8px;overflow:hidden;border:1px solid var(--layer-border-1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);background:var(--color-glass);'
    rectangleControl.appendChild(rectangleButton)

    const topRightControls = map!.getContainer().querySelector('.maplibregl-ctrl-top-right')
    if (topRightControls && topRightControls.firstChild) {
      topRightControls.insertBefore(rectangleControl, topRightControls.firstChild)
    }

    rectangleButton.addEventListener('click', () => {
      rectangleMode = !rectangleMode
      rectangleFirstCorner = null

      // Clear preview if canceling
      if (!rectangleMode) {
        if (firstCornerMarker) {
          firstCornerMarker.remove()
          firstCornerMarker = null
        }
        const previewSource = map!.getSource('rectangle-preview') as maplibregl.GeoJSONSource
        if (previewSource) {
          previewSource.setData({
            type: 'FeatureCollection',
            features: []
          })
        }
        if ((map as any)._rectangleMouseMoveHandler) {
          map!.off('mousemove', (map as any)._rectangleMouseMoveHandler)
          ;(map as any)._rectangleMouseMoveHandler = null
        }
      }

      if (rectangleButton) {
        rectangleButton.style.backgroundColor = rectangleMode ? 'var(--color-accent-bg)' : 'transparent'
        rectangleButton.style.color = rectangleMode ? 'var(--color-accent)' : 'var(--color-text-secondary)'
      }
      if (map) {
        map.getCanvas().style.cursor = rectangleMode ? 'crosshair' : ''
      }
    })

    // Add sectors source and layers
    map!.addSource('sectors', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    })

    // Sector fill layer — color by status
    map!.addLayer({
      id: 'sectors-fill',
      type: 'fill',
      source: 'sectors',
      paint: {
        'fill-color': [
          'case',
          ['get', 'selected'],
          '#ffcc00',
          ['==', ['get', 'status'], 'clear'],
          '#4a90e2',
          ['==', ['get', 'status'], 'target-found'],
          '#f25c5c',
          ['==', ['get', 'status'], 'obstructed'],
          '#f2a93b',
          ['==', ['get', 'status'], 're-search'],
          '#a78bfa',
          '#3ecf8e'
        ],
        'fill-opacity': [
          'case',
          ['get', 'selected'],
          0.65,
          ['!=', ['get', 'status'], 'unsearched'],
          0.45,
          0.18
        ]
      }
    })

    // Sector outline layer
    map!.addLayer({
      id: 'sectors-outline',
      type: 'line',
      source: 'sectors',
      paint: {
        'line-color': [
          'case',
          ['get', 'selected'],
          '#ff0000',
          ['==', ['get', 'status'], 'clear'],
          '#1e4a6e',
          ['==', ['get', 'status'], 'target-found'],
          '#c0392b',
          ['==', ['get', 'status'], 'obstructed'],
          '#d68910',
          ['==', ['get', 'status'], 're-search'],
          '#7c3aed',
          '#22a05a'
        ],
        'line-width': [
          'case',
          ['get', 'selected'],
          4,
          ['!=', ['get', 'status'], 'unsearched'],
          2,
          1
        ]
      }
    })

    // Search path source and layers
    map!.addSource('search-path', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    })

    // Search path line
    map!.addLayer({
      id: 'search-path-line',
      type: 'line',
      source: 'search-path',
      paint: {
        'line-color': '#ff6b00',
        'line-width': 3,
        'line-dasharray': [4, 2]
      }
    })

    // Search path waypoints
    map!.addLayer({
      id: 'search-path-waypoints',
      type: 'circle',
      source: 'search-path',
      paint: {
        'circle-radius': 5,
        'circle-color': '#ff6b00',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    })

    // Sector labels layer
    map!.addLayer({
      id: 'sectors-labels',
      type: 'symbol',
      source: 'sectors',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 11,
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#333',
        'text-halo-color': '#fff',
        'text-halo-width': 2
      },
      minzoom: 14
    })

    // Inactive area outlines (all other areas)
    map!.addSource('inactive-areas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map!.addLayer({
      id: 'inactive-areas-outline',
      type: 'line',
      source: 'inactive-areas',
      paint: {
        'line-color': 'rgba(200,200,200,0.25)',
        'line-width': 1,
        'line-dasharray': [3, 3],
      }
    })
  })

  // Handle rectangle creation
  map.on('draw.create', handleDrawCreate)
  map.on('draw.delete', handleDrawDelete)

  // Handle custom rectangle drawing clicks
  map.on('click', (e) => {
    if (!rectangleMode) return

    console.log('Rectangle mode click:', e.lngLat)

    if (!rectangleFirstCorner) {
      // First corner - add visual marker
      rectangleFirstCorner = { lng: e.lngLat.lng, lat: e.lngLat.lat }
      console.log('First corner set:', rectangleFirstCorner)

      // Create a red marker for the first corner
      const el = document.createElement('div')
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background-color: #ff0000;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      `
      firstCornerMarker = new maplibregl.Marker({ element: el })
        .setLngLat([rectangleFirstCorner.lng, rectangleFirstCorner.lat])
        .addTo(map!)

      // Add preview rectangle source and layer
      if (!map!.getSource('rectangle-preview')) {
        map!.addSource('rectangle-preview', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        map!.addLayer({
          id: 'rectangle-preview-fill',
          type: 'fill',
          source: 'rectangle-preview',
          paint: {
            'fill-color': '#3388ff',
            'fill-opacity': 0.2
          }
        })

        map!.addLayer({
          id: 'rectangle-preview-outline',
          type: 'line',
          source: 'rectangle-preview',
          paint: {
            'line-color': '#3388ff',
            'line-width': 2,
            'line-dasharray': [2, 2]
          }
        })
      }

      // Add mousemove handler to show preview
      const mouseMoveHandler = (moveEvent: any) => {
        if (!rectangleFirstCorner || !map) return

        const coords = [
          [rectangleFirstCorner.lng, rectangleFirstCorner.lat],
          [moveEvent.lngLat.lng, rectangleFirstCorner.lat],
          [moveEvent.lngLat.lng, moveEvent.lngLat.lat],
          [rectangleFirstCorner.lng, moveEvent.lngLat.lat],
          [rectangleFirstCorner.lng, rectangleFirstCorner.lat]
        ]

        const source = map.getSource('rectangle-preview') as maplibregl.GeoJSONSource
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coords]
              },
              properties: {}
            }]
          })
        }
      }

      map!.on('mousemove', mouseMoveHandler)

      // Store handler reference to remove it later
      ;(map as any)._rectangleMouseMoveHandler = mouseMoveHandler
    } else {
      // Second corner - create rectangle
      const secondCorner = { lng: e.lngLat.lng, lat: e.lngLat.lat }
      console.log('Second corner:', secondCorner)

      const coords: [number, number][] = [
        [rectangleFirstCorner.lng, rectangleFirstCorner.lat],
        [secondCorner.lng, rectangleFirstCorner.lat],
        [secondCorner.lng, secondCorner.lat],
        [rectangleFirstCorner.lng, secondCorner.lat],
        [rectangleFirstCorner.lng, rectangleFirstCorner.lat]
      ]

      const lngs = coords.map(c => c[0])
      const lats = coords.map(c => c[1])

      const searchArea = {
        southWest: {
          lat: Math.min(...lats) as number,
          lng: Math.min(...lngs) as number
        },
        northEast: {
          lat: Math.max(...lats) as number,
          lng: Math.max(...lngs) as number
        }
      }

      console.log('Generating grid for area:', searchArea)
      mapGridStore.generateGrid(searchArea)

      // Remove first corner marker
      if (firstCornerMarker) {
        firstCornerMarker.remove()
        firstCornerMarker = null
      }

      // Remove preview rectangle
      const previewSource = map!.getSource('rectangle-preview') as maplibregl.GeoJSONSource
      if (previewSource) {
        previewSource.setData({
          type: 'FeatureCollection',
          features: []
        })
      }

      // Remove mousemove handler
      if ((map as any)._rectangleMouseMoveHandler) {
        map!.off('mousemove', (map as any)._rectangleMouseMoveHandler)
        ;(map as any)._rectangleMouseMoveHandler = null
      }

      // Reset rectangle mode
      rectangleMode = false
      rectangleFirstCorner = null
      if (rectangleButton) {
        rectangleButton.style.backgroundColor = 'white'
        rectangleButton.style.color = 'black'
      }
      if (map) {
        map.getCanvas().style.cursor = ''
      }
    }
  })

  // Handle sector clicks
  map.on('click', 'sectors-fill', handleSectorClick)

  // Change cursor on hover
  map.on('mouseenter', 'sectors-fill', () => {
    if (map) map.getCanvas().style.cursor = 'pointer'
  })
  map.on('mouseleave', 'sectors-fill', () => {
    if (map) map.getCanvas().style.cursor = ''
  })

  // Watch for sector updates
  watch(
    () => mapGridStore.sectors,
    (newSectors) => {
      updateSectorsLayer(newSectors)
      updateInactiveAreasLayer()
    },
    { immediate: true }
  )

  // Watch for active area changes
  watch(
    () => mapGridStore.activeAreaId,
    () => {
      updateSectorsLayer(mapGridStore.sectors)
      updateInactiveAreasLayer()
    }
  )

  // Watch for selected sector
  watch(
    () => mapGridStore.selectedSector,
    (selectedLabel, oldLabel) => {
      updateSelectedSector(selectedLabel, oldLabel)
    }
  )

  // Watch for drone position updates
  watch(
    () => mapGridStore.dronePosition,
    (newPos) => {
      if (newPos && map) {
        updateDroneMarker(newPos)
      }
    },
    { immediate: true }
  )

  // Watch for flight state
  watch(
    () => mapGridStore.isFlying,
    (isFlying) => {
      if (isFlying) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId)
        animateDroneFlight()
      } else {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
          animationFrameId = null
        }
      }
    }
  )

  // Watch for search path changes
  watch(
    () => mapGridStore.searchPath,
    (searchPath) => {
      if (!map) return

      const source = map.getSource('search-path') as maplibregl.GeoJSONSource
      if (!source) return

      if (searchPath && searchPath.waypoints.length > 0) {
        // Create line feature
        const lineFeature = {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: searchPath.waypoints.map(wp => [wp.lng, wp.lat])
          },
          properties: {}
        }

        // Create point features for waypoints
        const pointFeatures = searchPath.waypoints.map((wp, index) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [wp.lng, wp.lat]
          },
          properties: {
            index,
            label: searchPath.sectors[index] || `WP${index + 1}`
          }
        }))

        source.setData({
          type: 'FeatureCollection',
          features: [lineFeature, ...pointFeatures]
        })

        console.log('Search path visualized:', searchPath.waypoints.length, 'waypoints')
      } else {
        // Clear path
        source.setData({
          type: 'FeatureCollection',
          features: []
        })
      }
    },
    { immediate: true }
  )

  // Watch for searched sectors changes
  watch(
    () => mapGridStore.searchedSectors,
    () => {
      // Re-render sectors to show searched status
      updateSectorsLayer(mapGridStore.sectors)
    },
    { deep: true }
  )
})

function handleDrawCreate(e: any) {
  const features = e.features
  if (features && features.length > 0) {
    const feature = features[0]
    const coords = feature.geometry.coordinates[0]

    // Get bounding box
    const lngs = coords.map((c: number[]) => c[0])
    const lats = coords.map((c: number[]) => c[1])

    const searchArea = {
      southWest: {
        lat: Math.min(...lats),
        lng: Math.min(...lngs)
      },
      northEast: {
        lat: Math.max(...lats),
        lng: Math.max(...lngs)
      }
    }

    mapGridStore.generateGrid(searchArea)

    // Remove the drawn shape
    if (draw) {
      draw.deleteAll()
    }
  }
}

function handleDrawDelete() {
  mapGridStore.clearGrid()
}

function handleSectorClick(e: any) {
  if (e.features && e.features.length > 0) {
    const label = e.features[0].properties.label
    console.log('Sector clicked:', label)
    mapGridStore.selectSector(label)
  }
}

function updateSectorsLayer(sectors: any[]) {
  if (!map) return

  const selectedLabel = mapGridStore.selectedSector

  const features: Feature<Polygon>[] = sectors.map(sector => ({
    type: 'Feature',
    id: sector.label,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [sector.bounds.southWest.lng, sector.bounds.southWest.lat],
        [sector.bounds.northEast.lng, sector.bounds.southWest.lat],
        [sector.bounds.northEast.lng, sector.bounds.northEast.lat],
        [sector.bounds.southWest.lng, sector.bounds.northEast.lat],
        [sector.bounds.southWest.lng, sector.bounds.southWest.lat]
      ]]
    },
    properties: {
      label: sector.label,
      selected: sector.label === selectedLabel,
      status: mapGridStore.getSectorStatus(sector.label),
    }
  }))

  const geojson: FeatureCollection<Polygon> = {
    type: 'FeatureCollection',
    features
  }

  const source = map.getSource('sectors') as maplibregl.GeoJSONSource
  if (source) {
    source.setData(geojson)
  }
}

function updateInactiveAreasLayer() {
  if (!map) return
  const source = map.getSource('inactive-areas') as maplibregl.GeoJSONSource
  if (!source) return
  const activeId = mapGridStore.activeAreaId
  const features: Feature<Polygon>[] = []
  for (const area of mapGridStore.areaList) {
    if (area.id === activeId) continue
    for (const sector of area.sectors) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [sector.bounds.southWest.lng, sector.bounds.southWest.lat],
            [sector.bounds.northEast.lng, sector.bounds.southWest.lat],
            [sector.bounds.northEast.lng, sector.bounds.northEast.lat],
            [sector.bounds.southWest.lng, sector.bounds.northEast.lat],
            [sector.bounds.southWest.lng, sector.bounds.southWest.lat],
          ]]
        },
        properties: { label: sector.label, area: area.name }
      })
    }
  }
  source.setData({ type: 'FeatureCollection', features })
}

function updateSelectedSector(selectedLabel: string | null, oldLabel: string | null) {
  if (!map) return

  console.log('Updating selected sector:', { selectedLabel, oldLabel })

  // Re-render all sectors with updated selection
  updateSectorsLayer(mapGridStore.sectors)

  // Fly to selected sector
  if (selectedLabel) {
    const sector = mapGridStore.getSectorByLabel(selectedLabel)
    if (sector) {
      console.log('Flying to sector:', sector)
      map.flyTo({
        center: [sector.center.lng, sector.center.lat],
        zoom: Math.max(map.getZoom(), 15),
        duration: 1000
      })
    }
  }
}

function updateDroneMarker(position: any) {
  if (!map) return

  const lngLat: [number, number] = [position.lng, position.lat]

  if (!droneMarker) {
    // Create drone marker element
    const el = document.createElement('div')
    el.className = 'drone-marker'
    el.style.cssText = `
      width: 40px;
      height: 40px;
      background-image: url('data:image/svg+xml;base64,${btoa(`
        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="8" fill="red" stroke="white" stroke-width="2"/>
          <line x1="20" y1="12" x2="20" y2="2" stroke="red" stroke-width="2"/>
          <polygon points="20,2 18,8 22,8" fill="red"/>
        </svg>
      `)}');
      background-size: contain;
      background-repeat: no-repeat;
    `

    droneMarker = new maplibregl.Marker({ element: el })
      .setLngLat(lngLat)
      .addTo(map)

    map.flyTo({ center: lngLat, zoom: 15 })
  } else {
    droneMarker.setLngLat(lngLat)

    if (mapGridStore.isFlying) {
      map.panTo(lngLat, { duration: 100 })
    }
  }
}

function animateDroneFlight() {
  if (
    !mapGridStore.isFlying ||
    !mapGridStore.targetPosition ||
    !mapGridStore.dronePosition
  ) {
    animationFrameId = null
    return
  }

  const current = mapGridStore.dronePosition
  const target = mapGridStore.targetPosition
  const speed = mapGridStore.droneSpeed

  // Calculate distance using Haversine formula
  const R = 6371000
  const φ1 = (current.lat * Math.PI) / 180
  const φ2 = (target.lat * Math.PI) / 180
  const Δφ = ((target.lat - current.lat) * Math.PI) / 180
  const Δλ = ((target.lng - current.lng) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  // Calculate heading
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const heading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360

  if (distance < 0.5) {
    mapGridStore.updateDronePosition({
      ...target,
      altitude: current.altitude,
      heading,
      speed: 0
    })

    // Check if we're in a search pattern and should advance to next waypoint
    if (mapGridStore.searchPatternActive && mapGridStore.searchPath) {
      mapGridStore.advanceToNextWaypoint()

      // Continue animation if still flying (new target set)
      if (mapGridStore.isFlying) {
        animationFrameId = requestAnimationFrame(animateDroneFlight)
      }
    } else {
      mapGridStore.stopFlying()
    }
    return
  }

  const fps = 60
  const distanceThisFrame = speed / fps
  const ratio = Math.min(distanceThisFrame / distance, 1)

  const newLat = current.lat + (target.lat - current.lat) * ratio
  const newLng = current.lng + (target.lng - current.lng) * ratio

  mapGridStore.updateDronePosition({
    lat: newLat,
    lng: newLng,
    altitude: current.altitude,
    heading,
    speed
  })

  animationFrameId = requestAnimationFrame(animateDroneFlight)
}

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container"></div>
    <div class="instruction-panel">
      Click ▢ to draw rectangle (2 opposite corners) or use the polygon tool.
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  position: relative;
}

.instruction-panel {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 14px;
  font-size: 11px;
  z-index: 5;
  pointer-events: none;
  animation: fade 7s forwards;
  background: var(--color-glass);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--layer-border-1);
  color: var(--color-text-secondary);
  letter-spacing: -0.01em;
}

@keyframes fade {
  0%, 60% { opacity: 1; }
  100% { opacity: 0; }
}

.map-container :deep(.maplibregl-ctrl-top-right) {
  margin-top: 12px;
  margin-right: 12px;
  z-index: 1000 !important;
  position: relative !important;
  pointer-events: auto !important;
}

.map-container :deep(.maplibregl-ctrl-group) {
  border-radius: 8px !important;
  overflow: hidden !important;
  border: 1px solid var(--layer-border-1) !important;
  pointer-events: auto !important;
}

.map-container :deep(.maplibregl-ctrl button) {
  background-color: var(--color-glass) !important;
  border: none !important;
  cursor: pointer !important;
  min-width: 32px !important;
  min-height: 32px !important;
  pointer-events: auto !important;
  color: var(--color-text-secondary) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
}

.map-container :deep(.maplibregl-ctrl button:hover) {
  background-color: var(--layer-bg-3) !important;
  color: var(--color-text-primary) !important;
}

.map-container :deep(.maplibregl-ctrl button.active) {
  background-color: var(--color-accent-bg) !important;
  color: var(--color-accent) !important;
}

.rectangle-draw-btn {
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: none !important;
  background: transparent !important;
  cursor: pointer !important;
  transition: all 0.12s ease !important;
}

.rectangle-draw-btn:hover {
  background-color: var(--layer-bg-3) !important;
  color: var(--color-text-primary) !important;
}
</style>

<style>
.maplibregl-ctrl-top-right {
  z-index: 1000 !important;
  pointer-events: auto !important;
}

.maplibregl-ctrl-group {
  pointer-events: auto !important;
}

.maplibregl-ctrl button,
.maplibre-gl-draw_ctrl-draw-btn {
  pointer-events: auto !important;
  cursor: pointer !important;
}
</style>
