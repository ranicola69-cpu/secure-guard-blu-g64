#!/usr/bin/env python3
"""
Post-prebuild patches for android/build.gradle and android/gradle.properties.

1. Forces androidx.core:core-ktx to 1.15.0 (core-ktx 1.17.0 requires AGP 8.9.1+
   but expo prebuild generates AGP 8.8.2).
2. Fixes hermesCommand to use react-native/sdks/hermesc instead of
   the nonexistent hermes-compiler package.
"""
import re
import sys
import os


# ─── 1. Fix hermesCommand in app/build.gradle ────────────────────────────────

APP_BUILD = "frontend/android/app/build.gradle"

with open(APP_BUILD, "r") as f:
    app_content = f.read()

if "hermes-compiler" in app_content:
    patched = re.sub(
        r'hermesCommand\s*=\s*new File\(\["node",\s*"--print",\s*'
        r'"require\.resolve\(\'hermes-compiler/package\.json\'.*?\)"\]'
        r'\.execute\(null,\s*rootDir\)\.text\.trim\(\)\)'
        r'\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*"/hermesc/%OS-BIN%/hermesc"',
        'hermesCommand = new File(["node", "--print", '
        '"require.resolve(\'react-native/package.json\')"]'
        '.execute(null, rootDir).text.trim())'
        '.getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"',
        app_content,
        flags=re.DOTALL,
    )
    if patched != app_content:
        with open(APP_BUILD, "w") as f:
            f.write(patched)
        print(f"[OK] Patched hermesCommand in {APP_BUILD}")
    else:
        # fallback: simple replace
        app_content = app_content.replace(
            "require.resolve('hermes-compiler/package.json', { paths: [require.resolve('react-native/package.json')] })",
            "require.resolve('react-native/package.json')",
        ).replace(
            ').getParentFile().getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc"',
            ').getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"',
        )
        with open(APP_BUILD, "w") as f:
            f.write(app_content)
        print(f"[OK] Patched hermesCommand (fallback) in {APP_BUILD}")
else:
    print(f"[--] hermesCommand already correct in {APP_BUILD}")


# ─── 2. Force core-ktx to 1.15.0 in root build.gradle ───────────────────────
# core-ktx 1.17.0 requires AGP 8.9.1; expo prebuild generates AGP 8.8.2.
# Forcing 1.15.0 satisfies AGP 8.8.2 compatibility.

ROOT_BUILD = "frontend/android/build.gradle"

with open(ROOT_BUILD, "r") as f:
    root_content = f.read()

RESOLUTION_BLOCK = """
// Force androidx.core to versions compatible with AGP 8.8.2
// (core-ktx 1.17.0 requires AGP 8.9.1 which conflicts with RN 0.79 generated config)
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core-ktx:1.15.0'
            force 'androidx.core:core:1.15.0'
        }
    }
}
"""

if "resolutionStrategy" not in root_content:
    with open(ROOT_BUILD, "a") as f:
        f.write(RESOLUTION_BLOCK)
    print(f"[OK] Added resolutionStrategy to {ROOT_BUILD}")
else:
    print(f"[--] resolutionStrategy already present in {ROOT_BUILD}")


# ─── 3. Ensure local.properties has sdk.dir ──────────────────────────────────

LOCAL_PROPS = "frontend/android/local.properties"
android_home = os.environ.get("ANDROID_HOME", "/usr/local/lib/android/sdk")

with open(LOCAL_PROPS, "w") as f:
    f.write(f"sdk.dir={android_home}\n")
print(f"[OK] Wrote {LOCAL_PROPS} with sdk.dir={android_home}")


# ─── 4. Fix ReactStylesDiffMapBackingFieldAccessor.java (RN 0.79 compat) ─────
# RN 0.79 removed internal_backingMap(); the package-private field mBackingMap
# is still accessible from the same package.

ACCESSOR_FILE = (
    "frontend/node_modules/expo-modules-core/android/src/main/java"
    "/com/facebook/react/uimanager/ReactStylesDiffMapBackingFieldAccessor.java"
)

FIXED_ACCESSOR = """\
package com.facebook.react.uimanager;

import com.facebook.react.bridge.ReadableMap;

/**
 * Access the package private field declared inside of [ReactStylesDiffMap].
 * Patched for RN 0.79+ which removed the internal_backingMap() accessor.
 */
public class ReactStylesDiffMapBackingFieldAccessor {
  static ReadableMap getBackingMap(ReactStylesDiffMap diffMap) {
    return diffMap.mBackingMap;
  }
}
"""

if os.path.exists(ACCESSOR_FILE):
    with open(ACCESSOR_FILE, "r") as f:
        current = f.read()
    if "internal_backingMap" in current:
        with open(ACCESSOR_FILE, "w") as f:
            f.write(FIXED_ACCESSOR)
        print(f"[OK] Patched ReactStylesDiffMapBackingFieldAccessor.java for RN 0.79")
    else:
        print(f"[--] ReactStylesDiffMapBackingFieldAccessor.java already patched")
else:
    print(f"[!!] {ACCESSOR_FILE} not found — skipping")



# ─── 5. Fix expo-constants/ConstantsService.kt (Kotlin property vs method) ───
# expo-modules-core ConstantsInterface switched from Java-style methods
# (getConstants(), getAppScopeKey() …) to Kotlin properties
# (val constants, val appScopeKey …).
# The ConstantsService.kt shipped with expo-constants@17 still uses the old
# Java-style overrides, causing "overrides nothing" / "not abstract" errors.

CONSTANTS_SERVICE = (
    "frontend/node_modules/expo-constants/android/src/main/java"
    "/expo/modules/constants/ConstantsService.kt"
)

FIXED_CONSTANTS_SERVICE = """\
package expo.modules.constants

import org.apache.commons.io.IOUtils

import expo.modules.core.interfaces.InternalModule
import expo.modules.interfaces.constants.ConstantsInterface

import android.os.Build
import android.util.Log
import android.content.Context

import java.io.FileNotFoundException
import java.lang.Exception
import java.nio.charset.StandardCharsets
import java.util.*

private val TAG = ConstantsService::class.java.simpleName
private const val CONFIG_FILE_NAME = "app.config"

open class ConstantsService(private val context: Context) : InternalModule, ConstantsInterface {
  var statusBarHeightInternal = context.resources.getIdentifier("status_bar_height", "dimen", "android")
    .takeIf { it > 0 }
    ?.let { (context.resources::getDimensionPixelSize)(it) }
    ?.let { pixels -> convertPixelsToDp(pixels.toFloat(), context) }
    ?: 0

  private val sessionId = UUID.randomUUID().toString()

  enum class ExecutionEnvironment(val string: String) {
    BARE("bare"),
    STANDALONE("standalone"),
    STORE_CLIENT("storeClient")
  }

  override fun getExportedInterfaces(): List<Class<*>> = listOf(ConstantsInterface::class.java)

  override val constants: Map<String, Any?>
    get() = mutableMapOf(
      "sessionId" to sessionId,
      "executionEnvironment" to ExecutionEnvironment.BARE.string,
      "statusBarHeight" to statusBarHeightInternal,
      "deviceName" to deviceName,
      "systemFonts" to systemFonts,
      "systemVersion" to systemVersion,
      "manifest" to appConfig,
      "platform" to mapOf<String, Map<String, Any>>("android" to emptyMap())
    )

  override val appScopeKey: String?
    get() = context.packageName

  override val deviceName: String
    get() = Build.MODEL

  override val statusBarHeight: Int
    get() = statusBarHeightInternal

  override val systemVersion: String
    get() = Build.VERSION.RELEASE

  override val systemFonts: List<String>
    get() = listOf(
      "normal",
      "notoserif",
      "sans-serif",
      "sans-serif-light",
      "sans-serif-thin",
      "sans-serif-condensed",
      "sans-serif-medium",
      "serif",
      "Roboto",
      "monospace"
    )

  private val appConfig: String?
    get() {
      try {
        context.assets.open(CONFIG_FILE_NAME).use { stream ->
          return IOUtils.toString(stream, StandardCharsets.UTF_8)
        }
      } catch (e: FileNotFoundException) {
        // do nothing, expected in managed apps
      } catch (e: Exception) {
        Log.e(TAG, "Error reading embedded app config", e)
      }
      return null
    }

  companion object {
    private fun convertPixelsToDp(px: Float, context: Context): Int {
      val resources = context.resources
      val metrics = resources.displayMetrics
      val dp = px / (metrics.densityDpi / 160f)
      return dp.toInt()
    }
  }
}
"""

if os.path.exists(CONSTANTS_SERVICE):
    with open(CONSTANTS_SERVICE, "r") as f:
        cs_content = f.read()
    if "override fun getConstants" in cs_content:
        with open(CONSTANTS_SERVICE, "w") as f:
            f.write(FIXED_CONSTANTS_SERVICE)
        print(f"[OK] Patched ConstantsService.kt to use Kotlin property syntax")
    else:
        print(f"[--] ConstantsService.kt already uses property syntax")
else:
    print(f"[!!] {CONSTANTS_SERVICE} not found — skipping")



# ─── 6. Fix expo-constants/ConstantsModule.kt (AppContext.constants missing) ─
# AppContext does not have a .constants property in this version of
# expo-modules-core. Use legacyModule<ConstantsInterface>() instead.

CONSTANTS_MODULE = (
    "frontend/node_modules/expo-constants/android/src/main/java"
    "/expo/modules/constants/ConstantsModule.kt"
)

FIXED_CONSTANTS_MODULE = """\
// Copyright 2015-present 650 Industries. All rights reserved.
package expo.modules.constants

import expo.modules.interfaces.constants.ConstantsInterface
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ConstantsModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("ExponentConstants")

    Constants {
      return@Constants appContext.legacyModule<ConstantsInterface>()?.constants ?: emptyMap()
    }

    AsyncFunction<String?>("getWebViewUserAgentAsync") {
      return@AsyncFunction System.getProperty("http.agent")
    }
  }
}
"""

if os.path.exists(CONSTANTS_MODULE):
    with open(CONSTANTS_MODULE, "r") as f:
        cm_content = f.read()
    if "appContext.constants?.constants" in cm_content:
        with open(CONSTANTS_MODULE, "w") as f:
            f.write(FIXED_CONSTANTS_MODULE)
        print(f"[OK] Patched ConstantsModule.kt to use legacyModule<ConstantsInterface>()")
    else:
        print(f"[--] ConstantsModule.kt already patched")
else:
    print(f"[!!] {CONSTANTS_MODULE} not found — skipping")



# ─── 7. Fix @expo/log-box ExpoLogBoxDevSupportManager.kt (RN 0.79 API) ──────
# RN 0.79 changes:
#  - getUniqueTag() is abstract Java method; 'override val uniqueTag' no longer works
#  - showNewJavaError now takes Throwable? (nullable)
#  - lastErrorTitle/lastErrorStack are now 'val' interface properties (can't assign)

LOG_BOX_MGR = (
    "frontend/node_modules/@expo/log-box/android/src/main/expo/modules/logbox"
    "/ExpoLogBoxDevSupportManager.kt"
)

FIXED_LOG_BOX_MGR = r"""/*
 * Copyright © 2024 650 Industries.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package expo.modules.logbox

import android.content.Context
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.SurfaceDelegate
import com.facebook.react.common.SurfaceDelegateFactory
import com.facebook.react.devsupport.DevSupportManagerBase
import com.facebook.react.devsupport.ReactInstanceDevHelper
import com.facebook.react.devsupport.interfaces.DevBundleDownloadListener
import com.facebook.react.devsupport.interfaces.DevLoadingViewManager
import com.facebook.react.devsupport.interfaces.DevSupportManager
import com.facebook.react.devsupport.interfaces.PausedInDebuggerOverlayManager
import com.facebook.react.devsupport.interfaces.RedBoxHandler
import com.facebook.react.devsupport.interfaces.StackFrame
import com.facebook.react.packagerconnection.RequestHandler
import com.facebook.react.devsupport.StackTraceHelper.convertJavaStackTrace
import com.facebook.react.devsupport.StackTraceHelper.convertJsStackTrace

class ExpoLogBoxDevSupportManager(
  applicationContext: Context,
  reactInstanceManagerHelper: ReactInstanceDevHelper,
  packagerPathForJSBundleName: String?,
  enableOnCreate: Boolean,
  redBoxHandler: RedBoxHandler?,
  devBundleDownloadListener: DevBundleDownloadListener?,
  minNumShakes: Int,
  customPackagerCommandHandlers: Map<String, RequestHandler>?,
  surfaceDelegateFactory: SurfaceDelegateFactory?,
  devLoadingViewManager: DevLoadingViewManager?,
  pausedInDebuggerOverlayManager: PausedInDebuggerOverlayManager?
) :
  ExpoBridgelessDevSupportManager(
    applicationContext,
    reactInstanceManagerHelper,
    packagerPathForJSBundleName,
    enableOnCreate,
    redBoxHandler,
    devBundleDownloadListener,
    minNumShakes,
    customPackagerCommandHandlers,
    surfaceDelegateFactory,
    devLoadingViewManager,
    pausedInDebuggerOverlayManager
  ) {

  private var redBoxSurfaceDelegate: SurfaceDelegate? = null
  private var _lastErrorTitle: String? = null
  private var _lastErrorStack: Array<StackFrame>? = null

  override val lastErrorTitle: String? get() = _lastErrorTitle
  override val lastErrorStack: Array<StackFrame>? get() = _lastErrorStack

  override fun hideRedboxDialog() {
    redBoxSurfaceDelegate?.hide()
  }

  override fun showNewJavaError(message: String?, e: Throwable?) {
    showNewError(message, if (e != null) convertJavaStackTrace(e) else emptyArray())
  }

  override fun showNewJSError(message: String?, details: ReadableArray?, errorCookie: Int) {
    showNewError(message, convertJsStackTrace(details))
  }

  private fun showNewError(message: String?, stack: Array<StackFrame>) {
    UiThreadUtil.runOnUiThread {
      _lastErrorTitle = message
      _lastErrorStack = stack

      if (redBoxSurfaceDelegate == null) {
        this.redBoxSurfaceDelegate =
          createSurfaceDelegate("RedBox")
            ?: ExpoLogBoxSurfaceDelegate(this@ExpoLogBoxDevSupportManager).apply {
              createContentView("RedBox")
            }
      }

      if (redBoxSurfaceDelegate?.isShowing() == true) {
        return@runOnUiThread
      }
      redBoxSurfaceDelegate?.show()
    }
  }
}

open class ExpoBridgelessDevSupportManager(
  applicationContext: Context,
  reactInstanceManagerHelper: ReactInstanceDevHelper,
  packagerPathForJSBundleName: String?,
  enableOnCreate: Boolean,
  redBoxHandler: RedBoxHandler?,
  devBundleDownloadListener: DevBundleDownloadListener?,
  minNumShakes: Int,
  customPackagerCommandHandlers: Map<String, RequestHandler>?,
  surfaceDelegateFactory: SurfaceDelegateFactory?,
  devLoadingViewManager: DevLoadingViewManager?,
  pausedInDebuggerOverlayManager: PausedInDebuggerOverlayManager?
) :
  DevSupportManagerBase(
    applicationContext,
    reactInstanceManagerHelper,
    packagerPathForJSBundleName,
    enableOnCreate,
    redBoxHandler,
    devBundleDownloadListener,
    minNumShakes,
    customPackagerCommandHandlers,
    surfaceDelegateFactory,
    devLoadingViewManager,
    pausedInDebuggerOverlayManager
  ) {

  override fun getUniqueTag(): String = "Bridgeless"

  override fun handleReloadJS() {
    UiThreadUtil.assertOnUiThread()
    hideRedboxDialog()
    reactInstanceDevHelper.reload("BridgelessDevSupportManager.handleReloadJS()")
  }
}
"""

if os.path.exists(LOG_BOX_MGR):
    with open(LOG_BOX_MGR, "r") as f:
        lb_content = f.read()
    if "override val uniqueTag" in lb_content or "'val' cannot be reassigned" in lb_content \
            or "lastErrorTitle = " in lb_content:
        with open(LOG_BOX_MGR, "w") as f:
            f.write(FIXED_LOG_BOX_MGR)
        print(f"[OK] Patched ExpoLogBoxDevSupportManager.kt for RN 0.79 API")
    else:
        print(f"[--] ExpoLogBoxDevSupportManager.kt already patched")
else:
    print(f"[!!] {LOG_BOX_MGR} not found — skipping")


print("\nAll android build patches applied.")
