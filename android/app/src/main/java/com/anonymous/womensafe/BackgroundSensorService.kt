package com.anonymous.womensafe

import android.app.Service
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.hardware.Sensor
import android.provider.Settings
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class BackgroundSensorService : Service(), SensorEventListener {
  private var sensorManager: SensorManager? = null
  private var accelerometer: Sensor? = null
  private var gyroscope: Sensor? = null
  
  private var lastAccelMag = 9.81f
  private var lastImpactTime = 0L
  private val COOLDOWN_MS = 15_000L
  private val ACCEL_THRESHOLD = 25.0f
  private val GYRO_THRESHOLD = 8.0f
  
  private var gx = 0f
  private var gy = 0f
  private var gz = 0f

  companion object {
    private const val TAG = "BackgroundSensorService"
    private const val NOTIFICATION_ID = 9999
    private const val CHANNEL_ID = "impact_detection_channel"
    var reactContext: ReactContext? = null
  }

  override fun onCreate() {
    super.onCreate()
    Log.d(TAG, "Service created on Android ${Build.VERSION.SDK_INT}")
    
    // Create notification for foreground service (required for Android 8+)
    createNotificationChannel()
    startForegroundNotification()
    
    sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
    accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    gyroscope = sensorManager?.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
    
    Log.d(TAG, "Accelerometer: ${accelerometer?.name} (${accelerometer?.vendor})")
    Log.d(TAG, "Gyroscope: ${gyroscope?.name} (${gyroscope?.vendor})")
    
    // Start listening to sensors with appropriate delay
    val delay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      SensorManager.SENSOR_DELAY_NORMAL
    } else {
      SensorManager.SENSOR_DELAY_NORMAL
    }
    
    val accelRegistered = sensorManager?.registerListener(this, accelerometer, delay) ?: false
    val gyroRegistered = sensorManager?.registerListener(this, gyroscope, delay) ?: false
    
    Log.d(TAG, "Sensors registered - Accel: $accelRegistered, Gyro: $gyroRegistered")
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Impact Detection",
        NotificationManager.IMPORTANCE_LOW
      )
      channel.description = "Running background impact detection"
      val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(channel)
    }
  }

  private fun startForegroundNotification() {
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("SafeJourney")
      .setContentText("Monitoring for impacts...")
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()

    startForeground(NOTIFICATION_ID, notification)
    Log.d(TAG, "Foreground notification started")
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.d(TAG, "Service started")
    return START_STICKY
  }

  override fun onSensorChanged(event: SensorEvent) {
    try {
      when (event.sensor.type) {
        Sensor.TYPE_ACCELEROMETER -> {
          val x = event.values[0]
          val y = event.values[1]
          val z = event.values[2]
          
          val mag = kotlin.math.sqrt(x * x + y * y + z * z)
          val delta = kotlin.math.abs(mag - lastAccelMag)
          lastAccelMag = mag
          
          Log.v(TAG, "Accel - Mag: $mag, Delta: $delta, Threshold: $ACCEL_THRESHOLD, DeltaThreshold: 20")
          
          if (shouldTriggerImpact(mag, delta)) {
            Log.w(TAG, "ACCEL IMPACT: Mag=$mag, Delta=$delta")
            onImpactDetected()
          }
        }
        Sensor.TYPE_GYROSCOPE -> {
          gx = event.values[0]
          gy = event.values[1]
          gz = event.values[2]
          
          val gyroMag = kotlin.math.sqrt(gx * gx + gy * gy + gz * gz)
          Log.v(TAG, "Gyro - Mag: $gyroMag, Threshold: $GYRO_THRESHOLD")
          
          if (shouldTriggerImpact(gyroMag, 0f)) {
            Log.w(TAG, "GYRO IMPACT: Mag=$gyroMag")
            onImpactDetected()
          }
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "Error in onSensorChanged: ${e.message}", e)
    }
  }

  private fun shouldTriggerImpact(mag: Float, delta: Float): Boolean {
    val currentTime = System.currentTimeMillis()
    val isOnCooldown = currentTime - lastImpactTime < COOLDOWN_MS
    
    if (isOnCooldown) {
      return false
    }
    
    val accelTriggered = mag > ACCEL_THRESHOLD
    val deltaTriggered = delta > 20
    
    return accelTriggered || deltaTriggered
  }

  private fun onImpactDetected() {
    lastImpactTime = System.currentTimeMillis()
    Log.d(TAG, "IMPACT DETECTED at $lastImpactTime")
    
    showOverlay()
    
    // Send event to React Native
    reactContext?.let {
      try {
        val event: WritableMap = Arguments.createMap()
        event.putString("timestamp", lastImpactTime.toString())
        
        it.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("BackgroundImpactDetected", event)
        
        Log.d(TAG, "Event emitted to React Native")
      } catch (e: Exception) {
        Log.e(TAG, "Error emitting event: ${e.message}", e)
      }
    } ?: run {
      Log.w(TAG, "ReactContext is null, cannot emit event")
    }
  }

  private fun showOverlay() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
        !Settings.canDrawOverlays(this)) {
      Log.w(TAG, "Overlay permission not granted, cannot show overlay")
      return
    }

    try {
      val intent = Intent(this, OverlayService::class.java)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      startService(intent)
      Log.d(TAG, "Overlay service started")
    } catch (e: Exception) {
      Log.e(TAG, "Error starting overlay service: ${e.message}", e)
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    // Not needed for impact detection
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(TAG, "Service destroyed")
    sensorManager?.unregisterListener(this)
  }

  override fun onBind(intent: Intent?): IBinder? {
    return null
  }
}
