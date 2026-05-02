package com.anonymous.womensafe

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class BackgroundSensorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "BackgroundSensorModule"
  }

  override fun getName(): String {
    return "BackgroundSensor"
  }

  @ReactMethod
  fun startBackgroundSensorService(promise: Promise) {
    try {
      Log.d(TAG, "Starting background sensor service")
      val intent = Intent(reactApplicationContext, BackgroundSensorService::class.java)
      BackgroundSensorService.reactContext = reactApplicationContext
      
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
        reactApplicationContext.startForegroundService(intent)
      } else {
        reactApplicationContext.startService(intent)
      }
      
      Log.d(TAG, "Background sensor service started")
      promise.resolve("Service started")
    } catch (e: Exception) {
      Log.e(TAG, "Error starting service: ${e.message}")
      promise.reject("START_SERVICE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun stopBackgroundSensorService(promise: Promise) {
    try {
      Log.d(TAG, "Stopping background sensor service")
      val intent = Intent(reactApplicationContext, BackgroundSensorService::class.java)
      reactApplicationContext.stopService(intent)
      BackgroundSensorService.reactContext = null
      Log.d(TAG, "Background sensor service stopped")
      promise.resolve("Service stopped")
    } catch (e: Exception) {
      Log.e(TAG, "Error stopping service: ${e.message}")
      promise.reject("STOP_SERVICE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun requestOverlayPermission(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        if (!Settings.canDrawOverlays(reactApplicationContext)) {
          val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${reactApplicationContext.packageName}")
          )
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          reactApplicationContext.startActivity(intent)
          promise.resolve("Overlay permission requested")
          return
        }
      }
      promise.resolve("Overlay permission already granted")
    } catch (e: Exception) {
      Log.e(TAG, "Error requesting overlay permission: ${e.message}")
      promise.reject("OVERLAY_PERMISSION_ERROR", e.message)
    }
  }
}
