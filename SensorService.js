import { Accelerometer, Gyroscope } from 'expo-sensors';

const ACCEL_THRESHOLD = 25.0; // m/s²
const GYRO_THRESHOLD = 8.0; // rad/s
const COOLDOWN_MS = 15_000;

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
    this.az = 0;

    this.onImpactDetected = null;
    this.onReadingsUpdated = null;
  }

  get isMonitoring() {
    return this._monitoring;
  }

  startMonitoring() {
    if (this._monitoring) return;
    this._monitoring = true;

    Accelerometer.setUpdateInterval(50);
    Gyroscope.setUpdateInterval(50);

    this.accelSub = Accelerometer.addListener(({ x, y, z }) => {
      this.ax = x;
      this.ay = y;
      this.az = z;
      const mag = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(mag - this.prevAccelMag);
      this.prevAccelMag = mag;

      const gyroMag = Math.sqrt(this.gx ** 2 + this.gy ** 2 + this.gz ** 2);

      this.onReadingsUpdated?.({
        ax: x, ay: y, az: z,
        gx: this.gx, gy: this.gy, gz: this.gz,
        accelMag: mag,
        gyroMag,
      });

      if (!this.cooldown && (mag > ACCEL_THRESHOLD || delta > 20)) {
        this._trigger();
      }
    });

    this.gyroSub = Gyroscope.addListener(({ x, y, z }) => {
      this.gx = x;
      this.gy = y;
      this.gz = z;
      const gyroMag = Math.sqrt(x * x + y * y + z * z);
      if (!this.cooldown && gyroMag > GYRO_THRESHOLD) {
        this._trigger();
      }
    });
  }

  stopMonitoring() {
    if (this.accelSub) this.accelSub.remove();
    if (this.gyroSub) this.gyroSub.remove();
    this.accelSub = null;
    this.gyroSub = null;
    this._monitoring = false;
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    this.cooldown = false;
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
export {ACCEL_THRESHOLD, GYRO_THRESHOLD};