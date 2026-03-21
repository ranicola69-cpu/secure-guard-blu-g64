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
import com.facebook.react.devsupport.interfaces.DevSplitBundleCallback

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

  override fun loadSplitBundleFromServer(bundlePath: String, callback: DevSplitBundleCallback) {
    callback.onError(bundlePath, RuntimeException("Split bundle loading not supported in ExpoLogBox dev manager"))
  }

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



# ─── 8. Create missing CurrentActivityNotFoundException (removed from expo-core) ─
# expo-modules-core no longer ships CurrentActivityNotFoundException in
# expo.modules.core.errors. expo-web-browser and others still import it.
# Re-create the class to fix the missing reference.

CURRENT_ACTIVITY_EX = (
    "frontend/node_modules/expo-modules-core/android/src/main/java"
    "/expo/modules/core/errors/CurrentActivityNotFoundException.kt"
)

CURRENT_ACTIVITY_EX_CONTENT = """\
package expo.modules.core.errors

/**
 * Thrown when an operation requires a current Activity but none is available.
 * Re-created for RN 0.79 compat — this class was removed from expo-modules-core
 * but is still referenced by expo-web-browser and other packages.
 */
class CurrentActivityNotFoundException :
  Exception("Current activity is not available")
"""

if not os.path.exists(CURRENT_ACTIVITY_EX):
    os.makedirs(os.path.dirname(CURRENT_ACTIVITY_EX), exist_ok=True)
    with open(CURRENT_ACTIVITY_EX, "w") as f:
        f.write(CURRENT_ACTIVITY_EX_CONTENT)
    print(f"[OK] Created CurrentActivityNotFoundException.kt")
else:
    print(f"[--] CurrentActivityNotFoundException.kt already exists")



# ─── 9. Fix expo/ExpoReactHostFactory.kt (named args banned for Java in K2) ──
# Kotlin K2 compiler (2.x) does not allow named arguments for Java methods
# when parameter names are not stored in bytecode (shown as p0, p1 ...).
# ReactHostImpl is a Java class; use positional arguments instead.

EXPO_HOST_FACTORY = (
    "frontend/node_modules/expo/android/src/main/java/expo/modules"
    "/ExpoReactHostFactory.kt"
)

if os.path.exists(EXPO_HOST_FACTORY):
    with open(EXPO_HOST_FACTORY, "r") as f:
        factory_content = f.read()

    OLD_CALL = """      val reactHostImpl =
        ReactHostImpl(
          context,
          delegate = reactHostDelegate,
          componentFactory = componentFactory,
          allowPackagerServerAccess = true,
          useDevSupport = useDevSupport
        )"""

    NEW_CALL = """      val reactHostImpl =
        ReactHostImpl(
          context,
          reactHostDelegate,
          componentFactory,
          true,
          useDevSupport
        )"""

    if OLD_CALL in factory_content:
        factory_content = factory_content.replace(OLD_CALL, NEW_CALL)
        with open(EXPO_HOST_FACTORY, "w") as f:
            f.write(factory_content)
        print(f"[OK] Patched ExpoReactHostFactory.kt to use positional ReactHostImpl args")
    else:
        print(f"[--] ExpoReactHostFactory.kt already patched or uses different format")
else:
    print(f"[!!] {EXPO_HOST_FACTORY} not found — skipping")



# ─── 10. Fix MainApplication.kt (regenerated by prebuild, broken for RN 0.79) ─
# expo prebuild regenerates MainApplication.kt using a template that still
# imports ReactNativeApplicationEntryPoint which was removed in RN 0.79.
# Also missing: reactNativeHost abstract member implementation.
# Patch runs AFTER prebuild to fix the generated file.

MAIN_APP = (
    "frontend/android/app/src/main/java/com/dphms/secureguard/MainApplication.kt"
)

FIXED_MAIN_APP = """\
package com.dphms.secureguard

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost
    get() = throw UnsupportedOperationException(
      "New Architecture (bridgeless) is enabled. Use reactHost instead of reactNativeHost."
    )

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    DefaultNewArchitectureEntryPoint.load()
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
"""

if os.path.exists(MAIN_APP):
    with open(MAIN_APP, "r") as f:
        existing = f.read()
    if "ReactNativeApplicationEntryPoint" in existing:
        with open(MAIN_APP, "w") as f:
            f.write(FIXED_MAIN_APP)
        print("[OK] Replaced MainApplication.kt (removed ReactNativeApplicationEntryPoint, "
              "added reactNativeHost stub + SoLoader.init + DefaultNewArchitectureEntryPoint.load)")
    else:
        print("[--] MainApplication.kt already patched")
else:
    print(f"[!!] {MAIN_APP} not found — skipping")



# ─── 11. Fix react-native-worklets WorkletRuntime to expose executeSync(lambda) ─
# expo-modules-core WorkletJSCallInvoker calls executeSync(std::function<>) but
# react-native-worklets v0.5.1 guards this overload behind WORKLETS_BUNDLE_MODE.
# Removing the ifdef guard makes the overloads always available (both in the
# header declaration and the .cpp implementation).

WORKLET_RUNTIME_H = (
    "frontend/node_modules/react-native-worklets/Common/cpp/worklets"
    "/WorkletRuntime/WorkletRuntime.h"
)
WORKLET_RUNTIME_CPP = (
    "frontend/node_modules/react-native-worklets/Common/cpp/worklets"
    "/WorkletRuntime/WorkletRuntime.cpp"
)

if os.path.exists(WORKLET_RUNTIME_H):
    with open(WORKLET_RUNTIME_H, "r") as f:
        h_content = f.read()

    OLD_H = """#ifdef WORKLETS_BUNDLE_MODE
  jsi::Value executeSync(std::function<jsi::Value(jsi::Runtime &)> &&job) const;

  jsi::Value executeSync(
      const std::function<jsi::Value(jsi::Runtime &)> &job) const;
#endif // WORKLETS_BUNDLE_MODE"""

    NEW_H = """  jsi::Value executeSync(std::function<jsi::Value(jsi::Runtime &)> &&job) const;

  jsi::Value executeSync(
      const std::function<jsi::Value(jsi::Runtime &)> &job) const;"""

    if OLD_H in h_content:
        h_content = h_content.replace(OLD_H, NEW_H)
        with open(WORKLET_RUNTIME_H, "w") as f:
            f.write(h_content)
        print("[OK] Patched WorkletRuntime.h: removed WORKLETS_BUNDLE_MODE guard from executeSync declarations")
    else:
        print("[--] WorkletRuntime.h already patched or format differs")
else:
    print(f"[!!] {WORKLET_RUNTIME_H} not found")

if os.path.exists(WORKLET_RUNTIME_CPP):
    with open(WORKLET_RUNTIME_CPP, "r") as f:
        cpp_content = f.read()

    OLD_CPP = """#ifdef WORKLETS_BUNDLE_MODE
jsi::Value WorkletRuntime::executeSync(
    std::function<jsi::Value(jsi::Runtime &)> &&job) const {
  auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
  jsi::Runtime &uiRuntime = getJSIRuntime();
  return job(uiRuntime);
}

jsi::Value WorkletRuntime::executeSync(
    const std::function<jsi::Value(jsi::Runtime &)> &job) const {
  auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
  jsi::Runtime &uiRuntime = getJSIRuntime();
  return job(uiRuntime);
}
#endif // WORKLETS_BUNDLE_MODE"""

    NEW_CPP = """jsi::Value WorkletRuntime::executeSync(
    std::function<jsi::Value(jsi::Runtime &)> &&job) const {
  auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
  jsi::Runtime &uiRuntime = getJSIRuntime();
  return job(uiRuntime);
}

jsi::Value WorkletRuntime::executeSync(
    const std::function<jsi::Value(jsi::Runtime &)> &job) const {
  auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
  jsi::Runtime &uiRuntime = getJSIRuntime();
  return job(uiRuntime);
}"""

    if OLD_CPP in cpp_content:
        cpp_content = cpp_content.replace(OLD_CPP, NEW_CPP)
        with open(WORKLET_RUNTIME_CPP, "w") as f:
            f.write(cpp_content)
        print("[OK] Patched WorkletRuntime.cpp: removed WORKLETS_BUNDLE_MODE guard from executeSync implementations")
    else:
        print("[--] WorkletRuntime.cpp already patched or format differs")
else:
    print(f"[!!] {WORKLET_RUNTIME_CPP} not found")



# ─── 12. Restore WorkletRuntime::getWeakRuntimeFromJSIRuntime (removed in 0.5.1) ──
# expo-modules-core WorkletRuntimeInstaller.cpp and WorkletNativeRuntime.cpp call
# worklets::WorkletRuntime::getWeakRuntimeFromJSIRuntime(jsi::Runtime &rt) which was
# removed in react-native-worklets 0.5.1. We re-add it via a static registry
# (jsi::Runtime* -> weak_ptr<WorkletRuntime>) populated in WorkletRuntime::init().

WORKLET_RT_H = (
    "frontend/node_modules/react-native-worklets/Common/cpp/worklets"
    "/WorkletRuntime/WorkletRuntime.h"
)
WORKLET_RT_CPP = (
    "frontend/node_modules/react-native-worklets/Common/cpp/worklets"
    "/WorkletRuntime/WorkletRuntime.cpp"
)

# --- patch header ---
if os.path.exists(WORKLET_RT_H):
    with open(WORKLET_RT_H, "r") as f:
        h = f.read()

    if "getWeakRuntimeFromJSIRuntime" not in h:
        # 1) Add <map> and <mutex> includes after existing includes
        h = h.replace(
            "#include <memory>",
            "#include <memory>\n#include <map>\n#include <mutex>"
        )
        # 2) Add static PUBLIC methods BEFORE the private: section
        OLD_PRIVATE = " private:"
        NEW_PRIVATE = (
            "  static std::weak_ptr<WorkletRuntime> getWeakRuntimeFromJSIRuntime(jsi::Runtime &rt);\n"
            "  static void registerInRuntimeRegistry(jsi::Runtime &rt, std::weak_ptr<WorkletRuntime> wr);\n"
            "  static void unregisterFromRuntimeRegistry(jsi::Runtime &rt);\n"
            "\n"
            "  void schedule(std::function<void(jsi::Runtime &)> &&job) {\n"
            "    eventLoop_->pushTask(std::move(job));\n"
            "  }\n"
            "\n"
            " private:\n"
            "  static std::map<jsi::Runtime *, std::weak_ptr<WorkletRuntime>> sRuntimeRegistry_;\n"
            "  static std::mutex sRegistryMutex_;\n"
            "\n"
        )
        if OLD_PRIVATE in h:
            h = h.replace(OLD_PRIVATE, NEW_PRIVATE, 1)
            with open(WORKLET_RT_H, "w") as f:
                f.write(h)
            print("[OK] WorkletRuntime.h: added getWeakRuntimeFromJSIRuntime declaration + registry fields")
        else:
            print("[!!] WorkletRuntime.h: could not find private section anchor")
    else:
        print("[--] WorkletRuntime.h: getWeakRuntimeFromJSIRuntime already present")
else:
    print(f"[!!] {WORKLET_RT_H} not found")

# --- patch implementation ---
if os.path.exists(WORKLET_RT_CPP):
    with open(WORKLET_RT_CPP, "r") as f:
        cpp = f.read()

    if "getWeakRuntimeFromJSIRuntime" not in cpp:
        # 1) Add static field definitions after namespace line
        OLD_NS = "namespace worklets {"
        NEW_NS = (
            "namespace worklets {\n\n"
            "std::map<jsi::Runtime *, std::weak_ptr<WorkletRuntime>> WorkletRuntime::sRuntimeRegistry_{};\n"
            "std::mutex WorkletRuntime::sRegistryMutex_{};\n\n"
            "std::weak_ptr<WorkletRuntime> WorkletRuntime::getWeakRuntimeFromJSIRuntime(jsi::Runtime &rt) {\n"
            "  std::lock_guard<std::mutex> lock(sRegistryMutex_);\n"
            "  auto it = sRuntimeRegistry_.find(&rt);\n"
            "  if (it != sRuntimeRegistry_.end()) {\n"
            "    return it->second;\n"
            "  }\n"
            "  return std::weak_ptr<WorkletRuntime>{};\n"
            "}\n\n"
            "void WorkletRuntime::registerInRuntimeRegistry(jsi::Runtime &rt, std::weak_ptr<WorkletRuntime> wr) {\n"
            "  std::lock_guard<std::mutex> lock(sRegistryMutex_);\n"
            "  sRuntimeRegistry_[&rt] = std::move(wr);\n"
            "}\n\n"
            "void WorkletRuntime::unregisterFromRuntimeRegistry(jsi::Runtime &rt) {\n"
            "  std::lock_guard<std::mutex> lock(sRegistryMutex_);\n"
            "  sRuntimeRegistry_.erase(&rt);\n"
            "}\n"
        )
        cpp = cpp.replace(OLD_NS, NEW_NS, 1)

        # 2) Register in init() so shared_from_this() is available
        OLD_INIT_BODY = (
            "void WorkletRuntime::init(\n"
            "    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy) {\n"
            "  jsi::Runtime &rt = *runtime_;"
        )
        NEW_INIT_BODY = (
            "void WorkletRuntime::init(\n"
            "    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy) {\n"
            "  jsi::Runtime &rt = *runtime_;\n"
            "  WorkletRuntime::registerInRuntimeRegistry(rt, weak_from_this());"
        )
        if OLD_INIT_BODY in cpp:
            cpp = cpp.replace(OLD_INIT_BODY, NEW_INIT_BODY)

        # No destructor needed: the registry stores weak_ptr entries.
        # When WorkletRuntime is destroyed, existing weak_ptr entries expire naturally.

        with open(WORKLET_RT_CPP, "w") as f:
            f.write(cpp)
        print("[OK] WorkletRuntime.cpp: added static registry + getWeakRuntimeFromJSIRuntime impl + init() registration")
    else:
        print("[--] WorkletRuntime.cpp: getWeakRuntimeFromJSIRuntime already present")
else:
    print(f"[!!] {WORKLET_RT_CPP} not found")

# ── Patch 13: Exclude duplicate worklets Java sources from react-native-reanimated ──────────────
# Both react-native-reanimated and react-native-worklets compile the same
# AndroidUIScheduler / JSCallInvokerResolver / WorkletsMessageQueueThread* classes.
# Since react-native-worklets provides them standalone, exclude them from reanimated's sourceSets.
REANIMATED_BUILD_GRADLE = os.path.join(
    "frontend", "node_modules", "react-native-reanimated", "android", "build.gradle"
)
if os.path.exists(REANIMATED_BUILD_GRADLE):
    with open(REANIMATED_BUILD_GRADLE, "r") as f:
        rg = f.read()
    EXCL_MARKER = "// [patch13] exclude worklets duplicates"
    if EXCL_MARKER not in rg:
        # Step 1: Add compileOnly project(':react-native-worklets') so reanimated can compile
        #         against the shared worklets classes without bundling them.
        OLD_DEPS = "dependencies {\n    implementation \"com.facebook.yoga:proguard-annotations:1.19.0\""
        NEW_DEPS = (
            "dependencies {\n"
            "    // [patch13] exclude worklets duplicates\n"
            "    compileOnly project(':react-native-worklets')\n"
            "    implementation \"com.facebook.yoga:proguard-annotations:1.19.0\""
        )
        # Step 2: Exclude the 4 shared worklets files from reanimated's sourceSets
        OLD_SRCSET = "    sourceSets.main {\n        java {"
        NEW_SRCSET = (
            "    sourceSets.main {\n"
            "        java {\n"
            "            // [patch13] exclude worklets duplicates\n"
            "            exclude 'com/swmansion/worklets/AndroidUIScheduler.java'\n"
            "            exclude 'com/swmansion/worklets/JSCallInvokerResolver.java'\n"
            "            exclude 'com/swmansion/worklets/WorkletsMessageQueueThread.java'\n"
            "            exclude 'com/swmansion/worklets/WorkletsMessageQueueThreadBase.java'\n"
            "            exclude 'com/swmansion/worklets/WorkletsModule.java'"
        )
        changed = False
        if OLD_DEPS in rg:
            rg = rg.replace(OLD_DEPS, NEW_DEPS, 1)
            changed = True
        else:
            print("[!!] Patch 13: dependencies block anchor not found in reanimated build.gradle")
        if OLD_SRCSET in rg:
            rg = rg.replace(OLD_SRCSET, NEW_SRCSET, 1)
            changed = True
        else:
            print("[!!] Patch 13: sourceSets.main anchor not found in reanimated build.gradle")
        if changed:
            with open(REANIMATED_BUILD_GRADLE, "w") as f:
                f.write(rg)
            print("[OK] Patch 13: added compileOnly worklets dep + excluded duplicate sources from react-native-reanimated")
    else:
        print("[--] Patch 13: already applied")
else:
    print(f"[!!] Patch 13: {REANIMATED_BUILD_GRADLE} not found")


# ── Patch 14: Add getAndroidUIScheduler() to worklets legacyBundling WorkletsModule ─────────────
# react-native-reanimated's NodesManager calls mWorkletsModule.getAndroidUIScheduler(), but the
# legacyBundling/WorkletsModule.java in react-native-worklets doesn't have this getter.
# Since patch 13 excludes reanimated's WorkletsModule.java (duplicate), worklets' version must
# provide all APIs that reanimated expects.
WORKLETS_MODULE_LEGACY = os.path.join(
    "frontend", "node_modules", "react-native-worklets",
    "android", "src", "legacyBundling", "com", "swmansion", "worklets", "WorkletsModule.java"
)
if os.path.exists(WORKLETS_MODULE_LEGACY):
    with open(WORKLETS_MODULE_LEGACY, "r") as f:
        wm = f.read()
    if "getAndroidUIScheduler" not in wm:
        OLD_INVALIDATE = "  public void invalidate() {"
        NEW_INVALIDATE = (
            "  public AndroidUIScheduler getAndroidUIScheduler() {\n"
            "    return mAndroidUIScheduler;\n"
            "  }\n"
            "\n"
            "  public void invalidate() {"
        )
        if OLD_INVALIDATE in wm:
            wm = wm.replace(OLD_INVALIDATE, NEW_INVALIDATE, 1)
            with open(WORKLETS_MODULE_LEGACY, "w") as f:
                f.write(wm)
            print("[OK] Patch 14: added getAndroidUIScheduler() to worklets legacyBundling WorkletsModule")
        else:
            print("[!!] Patch 14: invalidate() anchor not found in legacyBundling WorkletsModule.java")
    else:
        print("[--] Patch 14: getAndroidUIScheduler() already present")
else:
    print(f"[!!] Patch 14: {WORKLETS_MODULE_LEGACY} not found")

# ── Patch 15: Fix expo-modules-core C++ for worklets 0.5.1 API changes ────────────────────────
# A) Serializable.cpp: remove CustomType case (removed from worklets 0.5.1 ValueType enum)
# B) Worklet.cpp: replace runSync→executeSync and schedule(SerializableWorklet)→runAsyncGuarded
SERIALIZABLE_CPP = os.path.join(
    "frontend", "node_modules", "expo-modules-core",
    "android", "src", "main", "cpp", "worklets", "Serializable.cpp"
)
WORKLET_CPP = os.path.join(
    "frontend", "node_modules", "expo-modules-core",
    "android", "src", "main", "cpp", "worklets", "Worklet.cpp"
)

# 15A: Remove CustomType case from Serializable.cpp
if os.path.exists(SERIALIZABLE_CPP):
    with open(SERIALIZABLE_CPP, "r") as f:
        sc = f.read()
    if "CustomType" in sc:
        OLD_CUSTOM = (
            "    case worklets::Serializable::ValueType::CustomType:\n"
            "      return 20;\n"
        )
        if OLD_CUSTOM in sc:
            sc = sc.replace(OLD_CUSTOM, "", 1)
            with open(SERIALIZABLE_CPP, "w") as f:
                f.write(sc)
            print("[OK] Patch 15A: removed CustomType case from Serializable.cpp")
        else:
            print("[!!] Patch 15A: CustomType anchor not found in Serializable.cpp")
    else:
        print("[--] Patch 15A: CustomType already removed")
else:
    print(f"[!!] Patch 15A: {SERIALIZABLE_CPP} not found")

# 15B: Fix Worklet.cpp
if os.path.exists(WORKLET_CPP):
    with open(WORKLET_CPP, "r") as f:
        wc = f.read()
    changed_wc = False
    # Fix 1: schedule(SerializableWorklet) → runAsyncGuarded
    OLD_SCHED = "  workletRuntime->schedule(std::move(worklet));\n}"
    NEW_SCHED = "  workletRuntime->runAsyncGuarded(worklet);\n}"
    if OLD_SCHED in wc:
        wc = wc.replace(OLD_SCHED, NEW_SCHED, 1)
        changed_wc = True
        print("[OK] Patch 15B-1: schedule(SerializableWorklet) -> runAsyncGuarded")
    elif "runAsyncGuarded" in wc:
        print("[--] Patch 15B-1: already using runAsyncGuarded")
    else:
        print("[!!] Patch 15B-1: schedule anchor not found in Worklet.cpp")
    # Fix 2: runSync(worklet) → executeSync lambda
    OLD_RUNSYNC1 = "  workletRuntime->runSync(worklet);\n}"
    NEW_RUNSYNC1 = (
        "  workletRuntime->executeSync([&worklet](jsi::Runtime &rt) -> jsi::Value {\n"
        "    auto func = worklet->toJSValue(rt).asObject(rt).asFunction(rt);\n"
        "    return func.call(rt);\n"
        "  });\n"
        "}"
    )
    if OLD_RUNSYNC1 in wc:
        wc = wc.replace(OLD_RUNSYNC1, NEW_RUNSYNC1, 1)
        changed_wc = True
        print("[OK] Patch 15B-2: runSync(worklet) -> executeSync lambda")
    elif "executeSync([&worklet]" in wc:
        print("[--] Patch 15B-2: already using executeSync")
    else:
        print("[!!] Patch 15B-2: runSync(worklet) anchor not found in Worklet.cpp")
    # Fix 3: runSync([&args, &worklet]...) → executeSync returning undefined
    OLD_RUNSYNC2 = "  workletRuntime->runSync([&args, &worklet](jsi::Runtime &rt) {"
    NEW_RUNSYNC2 = "  workletRuntime->executeSync([&args, &worklet](jsi::Runtime &rt) -> jsi::Value {"
    OLD_RUNSYNC2_END = "  });\n}"
    NEW_RUNSYNC2_END = "    return jsi::Value::undefined();\n  });\n}"
    if OLD_RUNSYNC2 in wc:
        wc = wc.replace(OLD_RUNSYNC2, NEW_RUNSYNC2, 1)
        # Add return statement before closing brace
        OLD_CLOSE = "    func.call(\n      rt,\n      (const jsi::Value *) convertedArgs.data(),\n      convertedArgs.size()\n    );\n  });\n}"
        NEW_CLOSE = "    func.call(\n      rt,\n      (const jsi::Value *) convertedArgs.data(),\n      convertedArgs.size()\n    );\n    return jsi::Value::undefined();\n  });\n}"
        if OLD_CLOSE in wc:
            wc = wc.replace(OLD_CLOSE, NEW_CLOSE, 1)
        changed_wc = True
        print("[OK] Patch 15B-3: runSync([&args,&worklet]...) -> executeSync")
    elif "executeSync([&args, &worklet]" in wc:
        print("[--] Patch 15B-3: already using executeSync with args")
    else:
        print("[!!] Patch 15B-3: runSync([&args,&worklet]...) anchor not found")
    if changed_wc:
        with open(WORKLET_CPP, "w") as f:
            f.write(wc)
else:
    print(f"[!!] Patch 15B: {WORKLET_CPP} not found")

print("\nAll android build patches applied.")
