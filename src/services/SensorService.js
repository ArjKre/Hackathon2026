import { Accelerometer, Gyroscope } from 'expo-sensors';

const GRAVITY_MS2 = 9.81;
const ACCEL_THRESHOLD = 25.0; // m/s²
const GYRO_THRESHOLD = 8.0; // rad/s
const COOLDOWN_MS = 15_000;
const THRESHOLD_MATCH_WINDOW_MS = 500;

// Shake pattern detection
const SHAKE_THRESHOLD = 18.0; // Lower threshold for shake detection
const SHAKES_REQUIRED = 3; // Number of shakes in window to trigger
const SHAKE_WINDOW_MS = 2000; // Time window to detect pattern (2 seconds)

class SensorService {
  static _instance = null;

  static getInstance() {
    if (!SensorService._instance) SensorService._instance = new SensorService();
    return SensorService._instance;
  }

  constructor() {
    this.accelSub = null;
    this.gyroSub = null;
    this.cooldown = false;
    this.cooldownTimer = null;
    this.prevAccelMag = 9.81;
    this._monitoring = false;

    // Latest values
    this.gx = 0;
    this.gy = 0;
    this.gz = 0;
    this.ax = 0;
    this.ay = 0;
    this.az = GRAVITY_MS2;
    this.accelMag = GRAVITY_MS2;
    this.gyroMag = 0;
    this.lastAccelThresholdAt = 0;
    this.lastGyroThresholdAt = 0;

    this.onImpactDetected = null;
    this.onReadingsUpdated = null;

    // Shake pattern detection
    this.shakeTimestamps = [];
  }

  get isMonitoring() {
    return this._monitoring;
  }

  startMonitoring() {
    if (this._monitoring) return;
    this._monitoring = true;

    // Reset shake detection state
    this.shakeTimestamps = [];

    Accelerometer.setUpdateInterval(50);
    Gyroscope.setUpdateInterval(50);

    this.accelSub = Accelerometer.addListener(({ x, y, z }) => {
      const ax = x * GRAVITY_MS2;
      const ay = y * GRAVITY_MS2;
      const az = z * GRAVITY_MS2;

      this.ax = ax;
      this.ay = ay;
      this.az = az;
      const mag = Math.sqrt(ax * ax + ay * ay + az * az);
      this.accelMag = mag;
      const delta = Math.abs(mag - this.prevAccelMag);
      this.prevAccelMag = mag;

      const gyroMag = this.gyroMag;

      this.onReadingsUpdated?.({
        ax, ay, az,
        gx: this.gx, gy: this.gy, gz: this.gz,
        accelMag: mag,
        gyroMag,
      });

      // Check for shake pattern first
      if (!this.cooldown && this._checkShakePattern(mag, delta)) {
        return;
      }

      this._checkEmergencyThresholds();
    });

    this.gyroSub = Gyroscope.addListener(({ x, y, z }) => {
      this.gx = x;
      this.gy = y;
      this.gz = z;
      const gyroMag = Math.sqrt(x * x + y * y + z * z);
      this.gyroMag = gyroMag;
      this._checkEmergencyThresholds();
    });
  }

  _checkEmergencyThresholds() {
    const now = Date.now();

    if (this.accelMag > ACCEL_THRESHOLD) {
      this.lastAccelThresholdAt = now;
    }

    if (this.gyroMag > GYRO_THRESHOLD) {
      this.lastGyroThresholdAt = now;
    }

    if (
      !this.cooldown &&
      now - this.lastAccelThresholdAt <= THRESHOLD_MATCH_WINDOW_MS &&
      now - this.lastGyroThresholdAt <= THRESHOLD_MATCH_WINDOW_MS
    ) {
      this._trigger();
    }
  }

  // Check for shake pattern: multiple rapid shakes within time window
  _checkShakePattern(mag, delta) {
    const now = Date.now();
    
    // Detect a shake when acceleration exceeds threshold or has sudden change
    const isShake = mag > SHAKE_THRESHOLD || delta > 15;
    
    if (isShake) {
      // Add timestamp of this shake
      this.shakeTimestamps.push(now);
      
      // Remove timestamps outside the window
      this.shakeTimestamps = this.shakeTimestamps.filter(
        ts => now - ts <= SHAKE_WINDOW_MS
      );
      
      // Check if we have enough shakes in the window
      if (this.shakeTimestamps.length >= SHAKES_REQUIRED) {
        this.shakeTimestamps = []; // Reset after triggering
        this._trigger();
        return true;
      }
    } else {
      // Clean up old timestamps even when no shake detected
      this.shakeTimestamps = this.shakeTimestamps.filter(
        ts => now - ts <= SHAKE_WINDOW_MS
      );
    }
    
    return false;
  }

  stopMonitoring() {
    if (this.accelSub) this.accelSub.remove();
    if (this.gyroSub) this.gyroSub.remove();
    this.accelSub = null;
    this.gyroSub = null;
    this._monitoring = false;
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    this.cooldown = false;
    this.shakeTimestamps = [];
  }

  _trigger() {
    if (this.cooldown) return;
    this.cooldown = true;
    this.onImpactDetected?.();
    this.cooldownTimer = setTimeout(() => {
      this.cooldown = false;
    }, COOLDOWN_MS);
  }

  dispose() {
    this.stopMonitoring();
  }
}

export default SensorService.getInstance();
export {
  ACCEL_THRESHOLD,
  GYRO_THRESHOLD,
  SHAKE_THRESHOLD,
  SHAKES_REQUIRED,
  SHAKE_WINDOW_MS,
  THRESHOLD_MATCH_WINDOW_MS,
};
