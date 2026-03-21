#!/usr/bin/env python3
"""
Applies compatibility shims to Expo Gradle plugin Kotlin files.
These files use org.gradle.internal.extensions.core.extra which is not
available as a public API in Gradle 8.x. We add a public shim.
"""
import os
import sys

SHIM = (
    "\n"
    "// Compatibility shim: provides .extra extension property on ExtensionAware types\n"
    "private val org.gradle.api.plugins.ExtensionAware.extra: org.gradle.api.plugins.ExtraPropertiesExtension\n"
    "    get() = extensions.extraProperties\n"
    "\n"
)

BASE = "frontend/node_modules"

FILES_TO_PATCH = [
    f"{BASE}/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/ExpoModulesGradlePlugin.kt",
    f"{BASE}/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/ProjectConfiguration.kt",
    f"{BASE}/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/ExpoRootProjectPlugin.kt",
]


def patch_file(filepath):
    if not os.path.exists(filepath):
        print(f"SKIP (not found): {filepath}")
        return

    with open(filepath, "r") as f:
        content = f.read()

    if "Compatibility shim" in content:
        print(f"Already patched: {filepath}")
        return

    lines = content.split("\n")
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import_idx = i

    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, SHIM)
        with open(filepath, "w") as f:
            f.write("\n".join(lines))
        print(f"Patched: {filepath}")
    else:
        print(f"WARNING: No import statement found in {filepath}", file=sys.stderr)


for f in FILES_TO_PATCH:
    patch_file(f)

print("Done applying Gradle compatibility patches.")
