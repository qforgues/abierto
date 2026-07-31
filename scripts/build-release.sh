#!/usr/bin/env bash
# Builds the signed release AAB for Play Console upload.
# Prompts for the keystore password so it never lands in your shell history.
set -euo pipefail

cd "$(dirname "$0")/../android"

KEYSTORE=app/abierto-key.jks
if [ ! -f "$KEYSTORE" ]; then
  echo "ERROR: missing $KEYSTORE" >&2
  exit 1
fi

printf 'Keystore password: '
read -rs KEYSTORE_PASSWORD; echo
printf 'Key password (Enter if same as above): '
read -rs KEY_PASSWORD; echo
[ -z "$KEY_PASSWORD" ] && KEY_PASSWORD="$KEYSTORE_PASSWORD"

# Fail fast on a wrong password instead of after a full build.
if ! keytool -list -keystore "$KEYSTORE" -storepass "$KEYSTORE_PASSWORD" >/dev/null 2>&1; then
  echo "ERROR: keystore password rejected. Nothing was built." >&2
  exit 1
fi
echo "Password accepted. Building..."

export KEYSTORE_PASSWORD KEY_PASSWORD
export KEY_ALIAS=abierto-key

# The .aab is what Play wants, but an .aab CANNOT be installed on a phone — and the release
# checklist requires actually running the thing before upload. So build both from this one
# password prompt: the bundle to upload, and a real-key-signed APK to install and open.
# The APK is signed with the same upload key, so Digital Asset Links verify and the TWA runs
# full-screen exactly as it will for users (a debug-key APK would fail verification and fall
# back to a browser bar, testing the wrong thing).
./gradlew bundleRelease assembleRelease

AAB="$PWD/app/build/outputs/bundle/release/app-release.aab"
APK="$PWD/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$AAB" ]; then
  echo "ERROR: build finished but no AAB at $AAB" >&2
  exit 1
fi

echo
echo "Bundle (upload this to Play):"
echo "  $AAB  ($(ls -lh "$AAB" | awk '{print $5}'))"
if [ -f "$APK" ]; then
  echo "APK (install this on a phone and OPEN IT before uploading):"
  echo "  $APK  ($(ls -lh "$APK" | awk '{print $5}'))"
else
  echo "NOTE: no release APK was produced — test via Play's internal testing track instead."
fi
echo
echo "Next:  ./scripts/verify-release.sh \"$AAB\""
