import Geolocation from '@react-native-community/geolocation';
import {PermissionsAndroid, Platform} from 'react-native';

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
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'SafeGuard needs your location to share with emergency services.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    // iOS: Geolocation.requestAuthorization() handles it natively
    Geolocation.requestAuthorization();
    return true;
  }

  getCurrentPosition() {
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        pos => {
          this._last = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          resolve(this._last);
        },
        () => resolve(this._last),
        {enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000},
      );
    });
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