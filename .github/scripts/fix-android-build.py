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

print("\nAll android build patches applied.")
