#!/usr/bin/env bash
# verify-release.sh — MANDATORY pre-upload gate for any Android release.
#
# WHY THIS EXISTS (30 Jul 2026):
#   versionCode 7 was uploaded to production and crashed on launch for every user. Cause:
#   it was built from a DIFFERENT APPLICATION than the one that was live. Two Android
#   projects existed — the real production TWA (androidbrowserhelper LauncherActivity) and
#   an unshipped hand-rolled rewrite (custom MainActivity opening a Custom Tab). The
#   rewrite looked newer by every signal — higher versionCode, higher targetSdk, more
#   recent commits, the build script pointed at it — so it was assumed to be live. It never
#   had been.
#
#   Everything that was checked passed: it compiled, it was signed, the icons were present,
#   the versionCode was higher. NONE of that catches "this is the wrong app". This script
#   does, by asserting the artifact still contains the components the live app is built on.
#
# Run it on the signed bundle BEFORE uploading anything to Play:
#     ./scripts/verify-release.sh android/app/build/outputs/bundle/release/app-release.aab
#
# Exit 0 = safe to upload. Any other exit = DO NOT UPLOAD.

set -uo pipefail

ARTIFACT="${1:-android/app/build/outputs/bundle/release/app-release.aab}"
BASELINE="$(dirname "$0")/../android/release-baseline.json"
fails=0

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; fails=$((fails+1)); }

echo
echo "Verifying $ARTIFACT"
echo

[ -f "$ARTIFACT" ] || { fail "artifact not found — build it first with ./scripts/build-release.sh"; exit 1; }
[ -f "$BASELINE" ] || { fail "missing android/release-baseline.json"; exit 1; }

json() { python3 -c "import json,sys;print(json.load(open('$BASELINE'))$1)"; }

EXPECT_PKG=$(json "['package']")
EXPECT_LAUNCHER=$(json "['requiredLauncherClass']")
FORBIDDEN=$(json "['forbiddenClasses'][0]")
# Dex stores class names with slashes ("Lcom/google/.../LauncherActivity;"), not dots.
# Searching the dotted form finds nothing and every check silently "passes as missing".
EXPECT_LAUNCHER_DEX=${EXPECT_LAUNCHER//./\/}
EXPECT_PKG_DEX=${EXPECT_PKG//./\/}
LAST_SHIPPED=$(json "['lastShippedVersionCode']")
MIN_TARGET=$(json "['minTargetSdk']")

# Extract every dex ONCE to a temp file. Two reasons this isn't a pipeline:
#   - `unzip -p ... | grep -q` makes grep exit on first match, which SIGPIPEs unzip; with
#     `set -o pipefail` the pipeline then reports FAILURE even though the string was found.
#     That produced a checker whose results depended on where in the file the match landed.
#   - the dex is ~7 MB; unpacking it once instead of per-check is simply faster.
DEX=$(mktemp -t abierto-dex)
trap 'rm -f "$DEX"' EXIT
unzip -p "$ARTIFACT" '*.dex' > "$DEX" 2>/dev/null
[ -s "$DEX" ] || { fail "no dex found in artifact — is this really an app bundle?"; exit 1; }
dexhas() { grep -aqF "$1" "$DEX"; }

# 1. THE CHECK THAT WOULD HAVE CAUGHT IT — is this even the same application?
if dexhas "$EXPECT_LAUNCHER_DEX"; then
  pass "contains the live app's launcher ($EXPECT_LAUNCHER)"
else
  fail "MISSING $EXPECT_LAUNCHER — this is NOT the app that is live on Play. STOP."
fi

if dexhas "$FORBIDDEN"; then
  fail "contains $FORBIDDEN — this is the hand-rolled rewrite that crashed production. STOP."
else
  pass "does not contain the known-bad rewrite"
fi

# 2. Right package. Checked against the dex, because a binary APK manifest stores strings
#    as UTF-16 (invisible to grep) while an AAB manifest is protobuf — the dex is the one
#    format-independent place the package name reliably appears.
if dexhas "$EXPECT_PKG_DEX"; then
  pass "package is $EXPECT_PKG"
else
  fail "package does not look like $EXPECT_PKG"
fi

# 3. Signed. Only enforced for .aab — that is what gets uploaded, and it carries a
#    META-INF/*.RSA. Debug APKs use v2-scheme signing with no such entry, so demanding it
#    there would be a false alarm.
case "$ARTIFACT" in
  *.aab)
    if unzip -l "$ARTIFACT" | grep -qE "META-INF/.*\.(RSA|EC|DSA)"; then
      pass "bundle is signed"
    else
      fail "bundle is NOT signed — did build-release.sh get the keystore password?"
    fi ;;
  *) pass "signing check skipped (not a .aab — only bundles are uploaded)" ;;
esac

# 4. versionCode must exceed what is already live on Play — not what's in the repo.
GRADLE="$(dirname "$0")/../android/app/build.gradle"
VC=$(grep -oE 'versionCode +[0-9]+' "$GRADLE" | grep -oE '[0-9]+')
VN=$(grep -oE 'versionName +"[^"]+"' "$GRADLE" | sed 's/.*"\(.*\)"/\1/')
TS=$(grep -oE 'targetSdk +[0-9]+' "$GRADLE" | grep -oE '[0-9]+')
if [ "$VC" -gt "$LAST_SHIPPED" ]; then
  pass "versionCode $VC > last shipped $LAST_SHIPPED (versionName $VN)"
else
  fail "versionCode $VC does NOT exceed the last shipped $LAST_SHIPPED — Play will reject it"
fi

# 5. Target API, for the Play deadline.
if [ "$TS" -ge "$MIN_TARGET" ]; then
  pass "targetSdk $TS meets the required minimum $MIN_TARGET"
else
  fail "targetSdk $TS is below the Play-required $MIN_TARGET (deadline 31 Aug 2026)"
fi

echo
if [ "$fails" -gt 0 ]; then
  printf '\033[31m%s check(s) FAILED — DO NOT UPLOAD.\033[0m\n\n' "$fails"
  exit 1
fi
printf '\033[32mAll checks passed.\033[0m Safe to upload to Play Console.\n'
echo "After it rolls out, update lastShippedVersionCode in android/release-baseline.json to $VC."
echo
