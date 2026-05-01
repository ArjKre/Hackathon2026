# WomenSafe — Codebase Reference

**Purpose:** Women's personal safety app. Detects impacts/shakes via phone sensors, triggers SOS with countdown, shows live risk score by zone, displays crime heatmap, and manages emergency contacts + nearby services.

---

## Tech Stack

| Concern | Library |
|---------|---------|
| Framework | React Native 0.81 + Expo 54 |
| Motion sensors | `expo-sensors` (Accelerometer + Gyroscope) |
| GPS | `@react-native-community/geolocation` |
| Map | `react-native-webview` + Leaflet/Folium HTML |
| Vector graphics | `react-native-svg` |
| Platform | Android + iOS |

---

## Folder Structure

```
src/
  App.js
  theme.js
  screens/
    HomeScreen.js
    HeatmapScreen.js
    EmergencyScreen.js
    ProfileScreen.js
  components/
    FloatingNavbar.js
    EmergencyOverlay.js
    NavModal.js
    SensorWidgets.js
  services/
    SensorService.js
    LocationService.js
  assets/
    heatmapHtml.js
```

---

## Design System — `src/theme.js`

Single source of truth for all colors, spacing, and zone labels.

```js
COLORS = {
  safe:          '#4ade80',   // green
  caution:       '#fbbf24',   // amber
  unsafe:        '#f87171',   // red
  base:          '#121214',   // app background
  card:          '#1c1c1e',   // card surface
  elevated:      '#2c2c2e',   // elevated card / avatar bg
  border:        '#3a3a3c',   // borders / dividers
  textPrimary:   '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted:     '#71717a',
}

SPACING = {
  screenPadding: 20,
  cardGap:       10,
  radiusCard:    16,
  radiusLarge:   20,
  radiusPill:    100,
}

ZONES = { SAFE: 'Safe', CAUTION: 'Caution', UNSAFE: 'Unsafe' }
```

Zone → accent color mapping is used throughout the app to tint UI elements.

---

## App Shell — `src/App.js`

Owns top-level navigation and zone state.

**State:**
- `activeTab` — which screen is shown (`'Home' | 'Heatmap' | 'Emergency' | 'Profile'`)
- `zone` — current safety zone (`ZONES.SAFE/CAUTION/UNSAFE`)
- `score` — safety score 0–100 (Safe=82, Caution=51, Unsafe=22)

**Key behaviors:**
- All 4 screens are always mounted, toggled via `display: 'none'` — this preserves WebView state when switching tabs
- Android `BackHandler`: if not on Home, back button goes to Home instead of exiting app
- `getZoneAccent()` maps current zone to its color and passes it to `FloatingNavbar`

**Renders:** 4 screen views + `FloatingNavbar`

---

## Screens

### Home Screen — `src/screens/HomeScreen.js`

Main dashboard. Owns sensor and location lifecycle.

**State:**
- `emergency` — bool, triggers `EmergencyOverlay`
- `location` — string label shown in pill (e.g. "Fazer Town, Bengaluru")
- `readings` — `{ accelMag, gyroMag }` from sensor service
- `displayScore` — animated integer derived from `score` prop

**On mount:**
1. Calls `LocationService.requestPermission()`
2. Starts `SensorService.startMonitoring()`
3. Wires `SensorService.onImpactDetected` → sets `emergency = true` + vibrates
4. Wires `SensorService.onReadingsUpdated` → updates `readings`

**UI sections (top to bottom):**

1. **Header** — "WOMEN SAFE" label + greeting + notification bell (shows accent-colored badge when not Safe) + avatar initial
2. **Location Pill** — animated pulsing dot + city name + "• Live"
3. **Score Ring** — SVG circle, `strokeDasharray` fill = `(score/100) × 283`. Animated score counter. Pulsing outer ring shown only in Unsafe zone.
4. **Factor Cards** — 4-column row: Risk · Movement (live: "Fast" if accelMag > 15, else "Steady") · Time · Crime %
5. **Alert Banner** — conditionally shown for Caution/Unsafe, context-appropriate message
6. **SOS Button** — calls `handleSOS()` which sets `emergency = true` + vibrates. Full accent fill in Unsafe zone.
7. **Nearby Services** — horizontal scroll of `ServiceCard` components: Police · Hospital · Fire, each with distance + "Go" button
8. **Zone Cycle Button** — demo-only, cycles Safe → Caution → Unsafe and updates score

**Also renders:** `EmergencyOverlay` (visible = `emergency` state), wired to call `tel:112` on confirm.

---

### Heatmap Screen — `src/screens/HeatmapScreen.js`

Interactive crime heatmap of Bengaluru rendered in a WebView.

**State:**
- `loading` — shows spinner overlay while HTML loads
- `mapReady` — set true on WebView `onLoadEnd`
- `location` — GPS coords object `{ latitude, longitude }`
- `locating` — bool, disables Locate button during fetch

**On mount:** calls `fetchLocation()` → `LocationService.requestPermission()` + `getCurrentPosition()`

**After both `mapReady` and `location` are set:** injects JavaScript into the WebView that:
1. Gets the Leaflet map by its variable name `map_345240f864f74764bb31fc442ebf7084`
2. Calls `map.setView([lat, lng], 14)` to re-center
3. Removes previous user marker if exists (`window._userMarker`)
4. Adds a green `circleMarker` at user position with popup showing coords

**UI:**
- Header with title + live GPS subtitle + "📍 Locate" button (spinner when busy)
- Full-height `WebView` sourced from `heatmapHtml` string
- Loading overlay until map initializes

---

### Emergency Screen — `src/screens/EmergencyScreen.js`

Emergency contacts and nearest services hub.

**State:**
- `navFacility` — the service object currently selected for navigation (or null)

**Sections:**

**Broadcast SOS Banner:** Full-width button, tapping calls `tel:112` directly. Red glowing border.

**Emergency Contacts (3):**
```
Mom    — Family    — +91 98765 43210
Alex   — Friend    — +91 87654 32109
Priya  — Colleague — +91 76543 21098
```
Each row: avatar initial + name + relation + phone + "📞 Call" button (`tel:` link)

**Nearest Services (3):**
```
👮 Police  — Central Police Station — MG Road       — 0.8 km, 3 min — call: 100
🏥 Hospital — St. John's Hospital  — Sarjapur Road  — 1.2 km, 5 min — call: 108
🚒 Fire     — Fire Station 4       — Koramangala    — 2.5 km, 8 min — call: 101
```
Each card: icon + type + name + address + Navigate button (opens `NavModal`) + Call button (`tel:` link)

**Also renders:** `NavModal` (visible when `navFacility` is set)

---

### Profile Screen — `src/screens/ProfileScreen.js`

User profile and settings.

**Sections:**
- **Avatar block** — large avatar (initial "H"), name "Haidar", email, "Safe Zone Active" green badge
- **Settings list** — 5 rows with icon, label, subtitle, chevron:
  - Safe Zones · Alert Settings · Emergency Contacts · Share Location · Journey Log
- **App version** — "Women Safe · v1.0.0" footer

No logic wired — navigation and settings are UI-only.

---

## Components

### Floating Navbar — `src/components/FloatingNavbar.js`

Pill-shaped bottom navigation bar, absolutely positioned at bottom of screen.

**Props:** `activeTab`, `onTabChange`, `zoneAccent`

**Tabs:** Home 🏠 · Heatmap 🗺️ · Alert 🚨 · User 👤

Active tab gets `zoneAccent` as background tint + border + shows text label. Inactive tabs show icon only. Full iOS/Android shadow support.

---

### Emergency Overlay — `src/components/EmergencyOverlay.js`

Full-screen modal shown on impact detection or manual SOS.

**Props:** `visible`, `onCancel`, `onCallNow`

**On `visible` becoming true:**
1. Fades in backdrop
2. Starts pulsing animation on warning icon
3. Vibrates: `[0, 500, 200, 500]`
4. Starts 180s countdown interval
5. Fetches GPS via `LocationService.getCurrentPosition()`
6. At countdown = 0: calls `onCallNow()` automatically

**UI elements:**
- Pulsing ⚠ icon in red ring
- Title "IMPACT DETECTED"
- **Circular countdown ring** — SVG with `strokeDasharray` = `circumference × (secondsLeft/180)`. Color: green > 120s, amber > 60s, red ≤ 60s.
- **Location card** — shows spinner while GPS loads, then `lat, lng` coordinates
- **"CALL EMERGENCY NOW"** — red button, calls `onCallNow()` immediately
- **"I'M SAFE — CANCEL"** — bordered button, calls `onCancel()`

All state resets each time `visible` flips to true.

---

### Nav Modal — `src/components/NavModal.js`

Bottom sheet shown when user taps "Navigate" on an Emergency screen service card.

**Props:** `visible`, `facility` (`{ name, dist, time, coords: { lat, lng } }`), `onDismiss`

**Behavior:**
- Slides up/down via `Animated.translateY` (340ms)
- Tapping backdrop dismisses

**UI:**
- Drag handle pill
- **SVG route map** — dark background, grid lines, dashed route path from start dot to destination dot
- **Stats row** — Distance · Est. time · Status ("Open")
- **"Start Navigation →"** button — opens `maps.google.com/?daddr=lat,lng` in external app

Sheet height = 52% of screen height.

---

### Sensor Widgets — `src/components/SensorWidgets.js`

Three standalone visualization components for sensor data display.

**`SensorGauge({ label, value, maxValue, color, unit })`**
Horizontal bar chart. Fill percentage = `value / maxValue`. Bar color lerps from blue (#3B82F6) to red (#EF4444) as fill increases.

**`RadarWidget({ accelMag, gyroMag })`**
SVG radar display. Concentric rings + crosshair axes. Blue circle radius = accel magnitude, purple circle = gyro magnitude, both normalized to radar size.

**`Sparkline({ values, width })`**
SVG line chart of a rolling array of values. Gradient fill below line. Red dashed threshold line at 25 m/s².

---

## Services

### Sensor Service — `src/services/SensorService.js`

Singleton. Drives the core safety detection loop.

**Polling:** Accelerometer + Gyroscope at 50ms interval.  
**Unit conversion:** Raw accelerometer values multiplied by 9.81 to get m/s².

**Impact detection:**
- `ACCEL_THRESHOLD = 25.0` m/s²
- `GYRO_THRESHOLD = 8.0` rad/s
- Both must exceed threshold within a 500ms window of each other
- Trigger: calls `onImpactDetected()`

**Shake pattern detection (runs first, before impact check):**
- `SHAKE_THRESHOLD = 18.0` m/s² OR delta from previous reading > 15
- Must detect 3+ shakes within a 2000ms window
- Trigger: calls `onImpactDetected()`

**Cooldown:** 15s after any trigger — prevents repeated firing.

**Callbacks:**
- `onImpactDetected` — set externally, called on trigger
- `onReadingsUpdated(readings)` — called every accelerometer tick with `{ ax, ay, az, gx, gy, gz, accelMag, gyroMag }`

**API:**
- `startMonitoring()` — subscribes to sensors
- `stopMonitoring()` — unsubscribes, clears cooldown timer
- `isMonitoring` — bool getter

---

### Location Service — `src/services/LocationService.js`

Singleton. Wraps `@react-native-community/geolocation`.

**`requestPermission()`**
Android: requests `ACCESS_FINE_LOCATION` runtime permission. iOS: calls `Geolocation.requestAuthorization()`. Returns bool.

**`getCurrentPosition()`**
Returns a Promise resolving to `{ latitude, longitude, accuracy }`. Config: `enableHighAccuracy: true`, timeout 10s, maxAge 5s. On error, resolves with last known position (never rejects).

**`formatCoords(pos)`**
Returns `"lat.toFixed(6), lng.toFixed(6)"` or `"Location unavailable"`.

**`mapsUrl(pos)`**
Returns `https://maps.google.com/?q=lat,lng`.

**`lastPosition`** — getter for cached last position.

---

## Assets

### Heatmap HTML — `src/assets/heatmapHtml.js`

Exported as a JS string (`String.raw` template literal) injected into WebView as `source={{ html }}`.

**Contents:** Full Leaflet 1.9.3 + Folium-generated HTML page.
- Pre-loaded heatmap layer with Bengaluru crime incident data points
- Map variable name: `map_345240f864f74764bb31fc442ebf7084` — used by HeatmapScreen's inject script
- Dependencies loaded from CDN: Leaflet, jQuery, Bootstrap 5, Leaflet.awesome-markers, FontAwesome

Source file: `area_heatmap_final.html` in repo root (original Folium output).

---

## Data Flow Summary

```
SensorService ──onImpactDetected──► HomeScreen ──sets emergency=true──► EmergencyOverlay
                                                                               │
SensorService ──onReadingsUpdated──► HomeScreen (Factor card: Movement)        │
                                                                               ▼
LocationService.getCurrentPosition() ◄── EmergencyOverlay (GPS on show) ── tel:112

App.js ──zone/score props──► HomeScreen / FloatingNavbar (accent color)

EmergencyScreen ──navFacility──► NavModal ──► maps.google.com deeplink
HeatmapScreen ──injectJavaScript──► WebView (Leaflet) ── user marker
```
