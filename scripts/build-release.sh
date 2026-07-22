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

./gradlew bundleRelease

AAB="$PWD/app/build/outputs/bundle/release/app-release.aab"
if [ ! -f "$AAB" ]; then
  echo "ERROR: build finished but no AAB at $AAB" >&2
  exit 1
fi

echo
echo "Built: $AAB"
ls -lh "$AAB" | awk '{print "Size: " $5}'
