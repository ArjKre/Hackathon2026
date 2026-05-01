import * as ExpoLocation from 'expo-location';

class LocationService {
  static _instance = null;

  static getInstance() {
    if (!LocationService._instance) LocationService._instance = new LocationService();
    return LocationService._instance;
  }

  constructor() {
    this._last = null;
  }

  get lastPosition() {
    return this._last;
  }

  async requestPermission() {
    const {status} = await ExpoLocation.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async getCurrentPosition() {
    try {
      const {status} = await ExpoLocation.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const granted = await this.requestPermission();
        if (!granted) return this._last;
      }

      const loc = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      this._last = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      };
      return this._last;
    } catch {
      return this._last;
    }
  }

  formatCoords(pos) {
    if (!pos) return 'Location unavailable';
    return `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`;
  }

  mapsUrl(pos) {
    if (!pos) return '';
    return `https://maps.google.com/?q=${pos.latitude},${pos.longitude}`;
  }
}

export default LocationService.getInstance();
