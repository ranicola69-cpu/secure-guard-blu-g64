#!/usr/bin/env python3
"""
Fixes hermesCommand in android/app/build.gradle.
React Native 0.79+ ships hermesc inside react-native/sdks/hermesc,
not as a separate hermes-compiler package.
"""
import re
import sys

filepath = "frontend/android/app/build.gradle"

with open(filepath, "r") as f:
    content = f.read()

if "hermes-compiler" not in content:
    print("hermesCommand already uses correct path — no patch needed.")
    sys.exit(0)

# Replace the hermesCommand line
old_pattern = re.compile(
    r"hermesCommand\s*=\s*new File\(\[\"node\",\s*\"--print\",\s*"
    r"\"require\.resolve\('hermes-compiler/package\.json'.*?\)\"\]"
    r"\.execute\(null,\s*rootDir\)\.text\.trim\(\)\)"
    r"\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*\"/hermesc/%OS-BIN%/hermesc\"",
    re.DOTALL,
)

new_line = (
    'hermesCommand = new File(["node", "--print", '
    '"require.resolve(\'react-native/package.json\')"]'
    ".execute(null, rootDir).text.trim())"
    '.getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"'
)

patched, count = old_pattern.subn(new_line, content)
if count > 0:
    with open(filepath, "w") as f:
        f.write(patched)
    print(f"Patched hermesCommand in {filepath}")
else:
    # Fallback: simple string replacement
    old = (
        "require.resolve('hermes-compiler/package.json', "
        "{ paths: [require.resolve('react-native/package.json')] })"
    )
    new = "require.resolve('react-native/package.json')"
    if old in content:
        content = content.replace(old, new)
        content = content.replace(
            ').getParentFile().getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc"',
            ').getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"',
        )
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Patched hermesCommand (fallback) in {filepath}")
    else:
        print(f"WARNING: Could not find hermes-compiler reference to patch", file=sys.stderr)
        sys.exit(1)
