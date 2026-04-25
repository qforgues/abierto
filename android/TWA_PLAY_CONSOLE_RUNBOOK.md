# Abierto TWA → Play Store Release Runbook

**Version:** 1.4.0
**Target:** Google Play Store (2-4 weeks to live)

---

## Phase 1: Pre-Build Setup (30 mins)

### 1.1 Generate Android Signing Key

```bash
cd android/app

# Generate a new keystore (ONE TIME only)
keytool -genkey -v \
  -keystore abierto-key.jks \
  -keyalias abierto-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass <YOUR_KEYSTORE_PASSWORD> \
  -keypass <YOUR_KEY_PASSWORD>

# Get the SHA256 fingerprint (you'll need this for assetlinks.json)
keytool -list -v \
  -keystore abierto-key.jks \
  -alias abierto-key \
  -storepass <YOUR_KEYSTORE_PASSWORD>
```

**⚠️ SAVE THE SHA256 FINGERPRINT** — you'll need it in 1.5.

### 1.2 Update `gradle.properties` (if not done)

Edit `android/gradle.properties`:

```properties
twa.hostname=abierto.com  # TODO: Update to your domain
twa.scheme=https
```

### 1.3 Update AndroidManifest.xml

In `android/app/src/main/AndroidManifest.xml`, replace:
- `android:host="abierto.com"` → your actual domain (2 places)

### 1.4 Update MainActivity.java

In `android/app/src/main/java/com/abierto/app/MainActivity.java`:
- `APP_URL` → your backend URL (e.g., `https://abierto.com`)

### 1.5 Generate & Deploy assetlinks.json

1. Copy `android/assetlinks.json` to your backend's public folder:
   ```bash
   # On your server/deployment (e.g., Render, Railway):
   mkdir -p public/.well-known
   cp android/assetlinks.json public/.well-known/
   ```

2. Update the SHA256 fingerprint in `assetlinks.json`:
   ```json
   "sha256_cert_fingerprints": [
     "YOUR_SHA256_FROM_KEYTOOL_ABOVE"
   ]
   ```

3. Verify it's accessible:
   ```bash
   curl https://abierto.com/.well-known/assetlinks.json
   ```

---

## Phase 2: Build & Sign APK (15 mins)

### 2.1 Install Android SDK & Build Tools

```bash
# macOS (using Homebrew)
brew install android-platform-tools

# Or download Android Studio from:
# https://developer.android.com/studio
```

### 2.2 Build the APK

```bash
cd android

# Set environment variables for signing
export KEYSTORE_PASSWORD="your-keystore-password"
export KEY_PASSWORD="your-key-password"
export KEY_ALIAS="abierto-key"

# Build release APK
./gradlew assembleRelease
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

### 2.3 Build AAB (Android App Bundle) for Play Store

```bash
./gradlew bundleRelease
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

**→ Use the `.aab` for Play Store submission (smaller, Play Store handles APK generation).**

---

## Phase 3: Play Store Setup (1 hour)

### 3.1 Create Google Play Developer Account

- Go to: https://play.google.com/apps/publish
- Pay $25 one-time registration fee
- Verify identity (Google will send a confirmation email)

### 3.2 Create New App in Play Console

1. Click **"Create app"**
2. **App name:** Abierto
3. **Default language:** English
4. **App or game:** Select App
5. **Category:** Business
6. **Declaration:** Accept all terms, click **"Create app"**

### 3.3 Fill in App Store Listing

**Store Listing Tab:**
- **Title:** Abierto (max 50 chars)
- **Short description:** Manage your business and upload photos easily (max 80 chars)
- **Full description:**
  ```
  Abierto makes it easy to manage your business and upload photos on the go.

  Features:
  - Create and manage business profiles
  - Upload photos directly from your phone
  - Track your business data in real-time
  - Secure authentication

  Abierto is built for simplicity and reliability.
  ```
- **Screenshots:** Upload 4-5 screenshots (see section 3.6)
- **Feature graphic:** 1024×500px banner image
- **Icon:** 512×512px (use `frontend/dist/icon-512.png`)
- **Category:** Business
- **Content rating:** Complete the form (G rating for your app)

### 3.4 Set Up Pricing & Distribution

**Pricing & Distribution Tab:**
- **Countries:** Select all (or your target markets)
- **Pricing:** Free
- **Device categories:** Check "Phones and tablets"
- **Supported devices:** Minimum API 24 (Android 7.0+)

### 3.5 App Signing

**App signing by Google Play Tab:**
- Enable "Google Play App Signing"
- Play Store will handle signing for distribution

### 3.6 Privacy Policy & Permissions

**Privacy & Security Tab:**
- Add privacy policy URL:
  ```
  https://abierto.com/privacy
  ```
- Declare any trackers/ads: Check "No tracking"

---

## Phase 4: Upload & Submit (30 mins)

### 4.1 Upload AAB

1. Go to **Release** → **Production**
2. Click **"Create new release"**
3. Upload `android/app/build/outputs/bundle/release/app-release.aab`
4. Add release notes:
   ```
   Version 1.4.0 - Initial Release

   - Full-featured business management
   - Photo upload and storage
   - Real-time data sync
   ```
5. Review the content rating (if not done yet)
6. Click **"Review release"** and **"Rollout to Production"**

### 4.2 Google Play Verification

Google will:
1. Scan for malware (2-24 hours)
2. Verify your assetlinks.json
3. Confirm no policy violations
4. Approve and release to Play Store

⏱️ **Timeline:** 2-4 hours for initial scan, then 24 hours for full rollout.

---

## Phase 5: Post-Launch (Ongoing)

### 5.1 Monitor

- **Play Console Dashboard:** Check crash rates, reviews, user feedback
- **Firebase (optional):** Set up crash reporting in your backend

### 5.2 Updates

For future releases:
```bash
# Bump version in android/app/build.gradle
versionCode 2  # Increment this
versionName "1.4.1"

# Rebuild and upload
./gradlew bundleRelease
# Upload new AAB to Play Console
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `keytool: command not found` | Install Java/Android SDK; ensure PATH is set |
| Signing key password forgotten | Regenerate key (loses old key forever) |
| assetlinks.json returns 404 | Verify URL: `https://your-domain/.well-known/assetlinks.json` |
| "App not verified" on Play Store | Check SHA256 in assetlinks.json matches keytool output |
| "Invalid AAB" error | Ensure minSdk=24, compileSdk=34; rebuild with `./gradlew bundleRelease` |
| Play Store rejection | Review **Policy Center** for common violations (ads, permissions, etc.) |

---

## Quick Commands Reference

```bash
# Generate key (one-time)
keytool -genkey -v -keystore abierto-key.jks -keyalias abierto-key -keyalg RSA -keysize 2048 -validity 10000

# Get SHA256 (for assetlinks.json)
keytool -list -v -keystore abierto-key.jks -alias abierto-key

# Build debug APK (testing)
cd android && ./gradlew assembleDebug

# Build release APK
cd android && ./gradlew assembleRelease

# Build AAB (for Play Store)
cd android && ./gradlew bundleRelease

# Clean build
cd android && ./gradlew clean
```

---

## Next Steps

1. **Do you have a domain ready?** (If not, you need one before Play Store submission)
2. **Is backend deployed?** (assetlinks.json needs to be hosted there)
3. **Ready to generate signing key?** (Run the keytool command above)

Once confirmed, we can move to Phase 1 immediately.
