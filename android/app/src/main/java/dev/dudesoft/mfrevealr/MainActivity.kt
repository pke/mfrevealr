package dev.dudesoft.mfrevealr

import android.os.Bundle
import android.os.SystemClock
import android.view.ViewGroup
import android.view.ViewTreeObserver
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "mfrevealr"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // The system splash stays until React has drawn its first frame and the
    // art in it has loaded: that frame shows the splash once more
    // (SplashOverlay.tsx), so the system's can go at once, without its fade,
    // and the app hands over to the camera from there. A start that fails
    // still gets through after a while.
    splashScreen.setOnExitAnimationListener { it.remove() }
    val content = findViewById<ViewGroup>(android.R.id.content)
    val started = SystemClock.uptimeMillis()
    var drawnAt = 0L
    content.viewTreeObserver.addOnPreDrawListener(
        object : ViewTreeObserver.OnPreDrawListener {
          override fun onPreDraw(): Boolean {
            val now = SystemClock.uptimeMillis()
            val root = content.getChildAt(0) as? ViewGroup
            if (drawnAt == 0L && (root?.childCount ?: 0) > 0) {
              drawnAt = now
              // Nothing else may ask for a frame meanwhile, so ask again.
              content.postDelayed({ content.invalidate() }, ART_LOAD_MS)
            }
            val ready = drawnAt > 0 && now - drawnAt >= ART_LOAD_MS
            if (!ready && now - started < SPLASH_TIMEOUT_MS) {
              return false
            }
            content.viewTreeObserver.removeOnPreDrawListener(this)
            return true
          }
        })
  }

  private companion object {
    const val SPLASH_TIMEOUT_MS = 4000
    const val ART_LOAD_MS = 250L
  }
}
