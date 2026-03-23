# TWA Scaffolding Complete ✅

**Status:** Android TWA structure is 100% scaffolded. Ready to build.

---

## What Was Created

### Build Configuration
- ✅ `android/build.gradle` — Root Gradle config
- ✅ `android/app/build.gradle` — App build config (signing, versionCode, dependencies)
- ✅ `android/settings.gradle` — Gradle settings
- ✅ `android/gradle.properties` — Properties (hostname, scheme, etc.)
- ✅ `android/app/proguard-rules.pro` — Obfuscation rules

### Code
- ✅ `android/app/src/main/java/com/abierto/app/MainActivity.java` — TWA entry point
- ✅ `android/app/src/main/java/com/abierto/app/AssetLinksActivity.java` — Asset link handler
- ✅ `android/app/src/main/AndroidManifest.xml` — Manifest (deep linking configured)
- ✅ `android/app/src/main/res/values/strings.xml` — App strings
- ✅ `android/app/src/main/res/values/styles.xml` — Themes

### Domain Verification
- ✅ `android/assetlinks.json` — Digital Asset Links file (needs SHA256 + deploy to `.well-known/`)
- ✅ `android/TWA_PLAY_CONSOLE_RUNBOOK.md` — Complete Play Store guide

---

## What You Need to Do NOW

### Phase 1: Configuration (15 mins)

**TODO:**
1. **Domain:** Update `android/gradle.properties` and `AndroidManifest.xml` with your actual domain
   - Default is `abierto.com` — change if different

2. **Backend URL:** Update `MainActivity.java`
   - Line 18: `APP_URL = "https://abierto.com"`
   - Should match your deployed backend

3. **Signing Key:** Generate once
   ```bash
   cd android/app
   keytool -genkey -v -keystore abierto-key.jks -keyalias abierto-key -keyalg RSA -keysize 2048 -validity 10000 -storepass YOUR_PASSWORD -keypass YOUR_PASSWORD
   ```
   - **Save the SHA256 fingerprint** (output from keytool)

4. **assetlinks.json:** Update & deploy
   - Update `android/assetlinks.json` with SHA256 from step 3
   - Deploy to `https://your-domain/.well-known/assetlinks.json`
   - Verify with: `curl https://your-domain/.well-known/assetlinks.json`

### Phase 2: Build (10 mins)

```bash
cd android

# Set passwords
export KEYSTORE_PASSWORD="your-password-from-keytool"
export KEY_PASSWORD="your-password-from-keytool"

# Build AAB (for Play Store)
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Phase 3: Play Store (1 hour)

Follow `TWA_PLAY_CONSOLE_RUNBOOK.md` sections 3-5.

---

## Critical Questions (Answer Now)

**Q1: What is your production domain?**
- Current: `abierto.com`
- Actual: ???

**Q2: Is your backend already deployed to that domain + HTTPS?**
- If NO → Deploy phase 2 first, then come back

**Q3: Do you have Android SDK + build tools installed?**
- If NO → Run: `brew install android-platform-tools` (macOS)
- If NO (Windows/Linux) → Download Android Studio from https://developer.android.com/studio

**Q4: Timeline — when do you want it live?**
- Current goal: 2-4 weeks
- Realistic? (Play Store approval can be 24-48h)

---

## Files Ready to Review

📄 [View TWA Runbook](TWA_PLAY_CONSOLE_RUNBOOK.md) — Full step-by-step guide

---

## Next Action

Answer the 4 questions above, and I'll either:
1. **Update the Android config** with your domain
2. **Build it** right now
3. **Help with Play Console submission**

Pick one and let's go.
