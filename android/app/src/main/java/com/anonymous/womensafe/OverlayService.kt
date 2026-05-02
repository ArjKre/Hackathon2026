package com.anonymous.womensafe

import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView

class OverlayService : Service() {
  private var windowManager: WindowManager? = null
  private var overlayView: TextView? = null

  companion object {
    private const val TAG = "OverlayService"
  }

  override fun onCreate() {
    super.onCreate()
    showOverlayView()
  }

  private fun showOverlayView() {
    try {
      windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

      val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
      }

      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        type,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
        PixelFormat.TRANSLUCENT
      )
      params.gravity = Gravity.TOP

      overlayView = TextView(this).apply {
        text = "Impact Detected — Are you okay?"
        setBackgroundColor(Color.argb(220, 200, 0, 0))
        setTextColor(Color.WHITE)
        textSize = 18f
        setPadding(32, 32, 32, 32)
        gravity = Gravity.CENTER
      }

      windowManager?.addView(overlayView, params)
      Log.d(TAG, "Overlay view added")

      // Auto-dismiss after 10 seconds
      overlayView?.postDelayed({ stopSelf() }, 10_000L)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to show overlay: ${e.message}", e)
      stopSelf()
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    try {
      overlayView?.let { windowManager?.removeView(it) }
    } catch (e: Exception) {
      Log.e(TAG, "Error removing overlay: ${e.message}", e)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
