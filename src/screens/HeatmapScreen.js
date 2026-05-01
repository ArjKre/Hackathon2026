import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { COLORS, SPACING } from "../theme";
import heatmapHtml from "../assets/heatmapHtml";
import LocationService from "../services/LocationService";

// Must match the Leaflet map variable name in the HTML
const MAP_VAR = "map_345240f864f74764bb31fc442ebf7084";

function buildInjectScript(lat, lng) {
  return `
    (function() {
      try {
        var map = ${MAP_VAR};
        if (!map) return;

        // Re-center on user
        map.setView([${lat}, ${lng}], 14);

        // Remove previous user marker if exists
        if (window._userMarker) {
          window._userMarker.remove();
        }

        // Pulsing circle marker
        window._userMarker = L.circleMarker([${lat}, ${lng}], {
          radius: 10,
          color: '#4ade80',
          fillColor: '#4ade80',
          fillOpacity: 0.85,
          weight: 3
        })
        .bindPopup('<b>You are here</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}')
        .addTo(map)
        .openPopup();
      } catch(e) {}
    })();
    true;
  `;
}

export default function HeatmapScreen() {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const fetchLocation = async () => {
    setLocating(true);
    await LocationService.requestPermission();
    const pos = await LocationService.getCurrentPosition();
    if (pos) setLocation(pos);
    setLocating(false);
  };

  // Fetch GPS on mount
  useEffect(() => {
    fetchLocation();
  }, []);

  // Inject whenever both map is ready AND location is available
  useEffect(() => {
    if (mapReady && location) {
      webViewRef.current?.injectJavaScript(
        buildInjectScript(location.latitude, location.longitude),
      );
    }
  }, [mapReady, location]);

  const handleLoadEnd = () => {
    setLoading(false);
    setMapReady(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Risk Heatmap</Text>
          <Text style={styles.subtitle}>
            {location
              ? `📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
              : "Tap locate to centre map"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.locateBtn, locating && styles.locateBtnBusy]}
          onPress={fetchLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color={COLORS.safe} />
          ) : (
            <Text style={styles.locateBtnText}>📍 Locate</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: heatmapHtml }}
          style={styles.map}
          originWhitelist={["*"]}
          mixedContentMode="always"
          javaScriptEnabled
          domStorageEnabled
          onLoadStart={() => setLoading(true)}
          onLoadEnd={handleLoadEnd}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.safe} />
            <Text style={styles.loadingText}>Loading map…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  locateBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: `${COLORS.safe}18`,
    borderWidth: 1,
    borderColor: `${COLORS.safe}44`,
    minWidth: 80,
    justifyContent: "center",
  },
  locateBtnBusy: { opacity: 0.6 },
  locateBtnText: { color: COLORS.safe, fontSize: 13, fontWeight: "700" },
  mapContainer: { flex: 1 },
  map: { flex: 1, backgroundColor: COLORS.base },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.base,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },
});
