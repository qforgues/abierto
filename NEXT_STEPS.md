# Abierto → Play Store: Next Steps

**Status:** Android configs updated to `abiertovqs.com` ✅

**Blockers:** Backend not deployed + Android SDK not installed

---

## Step 1: Deploy Backend to abiertovqs.com (30 mins)

You mentioned Render/Railway. Pick one:

### Option A: Render.com
1. Push your repo to GitHub (if not already)
2. Log in to Render.com → **New** → **Web Service**
3. Connect GitHub repo → Select `abierto`
4. **Build command:** `cd backend && npm install`
5. **Start command:** `npm start`
6. **Environment variables:**
   ```
   NODE_ENV=production
   PORT=5000
   JWT_SECRET=<generate-random-64-char-string>
   FRONTEND_URL=https://abiertovqs.com
   DB_PATH=/var/data/abierto.db
   ```
7. Add custom domain: `abiertovqs.com` (need to own the domain)
8. Deploy → Wait for "Service is live"
9. Test: `curl https://abiertovqs.com/api/health`

### Option B: Railway.app
1. Same as above but in Railway dashboard
2. Simpler domain setup

**⚠️ You MUST have:**
- Domain `abiertovqs.com` already registered + DNS pointing to Render/Railway
- HTTPS enabled (auto, both platforms)

---

## Step 2: Install Android SDK (10 mins)

### macOS
```bash
# Install via Homebrew
brew install android-commandlinetools

# Or download Android Studio (full IDE):
# https://developer.android.com/studio
```

### Windows/Linux
- Download Android Studio: https://developer.android.com/studio
- Install → Open → Tools → SDK Manager → Install "Android SDK Build-Tools 34"

**Test:** `adb --version` (should print version)

---

## Step 3: Generate Signing Key (5 mins)

```bash
cd android/app

# Generate key (ONE TIME)
keytool -genkey -v \
  -keystore abierto-key.jks \
  -keyalias abierto-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass mypassword123 \
  -keypass mypassword123

# Get SHA256 (SAVE THIS)
keytool -list -v -keystore abierto-key.jks -alias abierto-key -storepass mypassword123
```

**Copy the SHA256 fingerprint** — you'll need it in Step 4.

---

## Step 4: Deploy assetlinks.json (5 mins)

1. Copy `android/assetlinks.json` to your backend's public folder:
   ```bash
   # On Render/Railway, add this to your backend's public/ or serve it:
   mkdir -p public/.well-known
   cp android/assetlinks.json public/.well-known/assetlinks.json
   ```

2. Update the SHA256 in `assetlinks.json`:
   ```json
   "sha256_cert_fingerprints": [
     "YOUR_SHA256_FROM_KEYTOOL"
   ]
   ```

3. Redeploy backend

4. Verify:
   ```bash
   curl https://abiertovqs.com/.well-known/assetlinks.json
   ```

---

## Step 5: Build APK/AAB (15 mins)

```bash
cd android

# Set env vars
export KEYSTORE_PASSWORD="mypassword123"
export KEY_PASSWORD="mypassword123"

# Build AAB (for Play Store)
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

**Save the AAB file** — you'll upload it to Play Console.

---

## Step 6: Play Store (1 hour)

1. **Create Play Developer account:** https://play.google.com/apps/publish ($25 fee)
2. **Create app:** Abierto
3. **Fill store listing:**
   - Title: Abierto
   - Description: Manage your business and upload photos
   - Category: Business
   - Upload screenshots (4-5)
   - Upload icon: `frontend/dist/icon-512.png`
4. **Upload AAB:** Release → Production → Upload `app-release.aab`
5. **Review & submit** → Google Play scans (24-48h) → Live

**Full guide:** See `android/TWA_PLAY_CONSOLE_RUNBOOK.md`

---

## TL;DR Command Sequence

```bash
# 1. Deploy backend (Render/Railway)
# 2. Install SDK: brew install android-commandlinetools
# 3. Generate key
keytool -genkey -v -keystore abierto-key.jks -keyalias abierto-key -keyalg RSA -keysize 2048 -validity 10000

# 4. Get SHA256 & update assetlinks.json
keytool -list -v -keystore abierto-key.jks -alias abierto-key

# 5. Deploy assetlinks.json to backend

# 6. Build
cd android
export KEYSTORE_PASSWORD="your-password"
export KEY_PASSWORD="your-password"
./gradlew bundleRelease

# 7. Upload AAB to Play Console (https://play.google.com/apps/publish)
```

---

## What I Need From You

Pick ONE:
- [ ] **Help me deploy backend first** (I'll give you exact Render/Railway steps)
- [ ] **Help me build Android** (I'll run the gradle commands)
- [ ] **Do both** (end-to-end)

Just say which and I'll execute.
