# Abierto → Play Store: Final Action Checklist

**Status:** ✅ Android fully configured, signing key generated, gradle wrapper ready

---

## What's Ready (In Your Folder)

- ✅ `android/` folder with full Gradle build config
- ✅ `android/app/abierto-key.jks` — Signing key (password stored securely, not in repo)
- ✅ `android/assetlinks.json` — Domain verification (SHA256 already added)
- ✅ `android/gradlew` and `android/gradlew.bat` — Gradle auto-downloader (Linux/macOS/Windows)

---

## Step 1: Build Android AAB (On Your Machine)

**On macOS/Linux:**
```bash
cd android

# Set these to your actual keystore password (from secure storage)
export KEYSTORE_PASSWORD="<your-keystore-password>"
export KEY_PASSWORD="<your-key-password>"

./gradlew bundleRelease
```

**On Windows (PowerShell):**
```powershell
cd android
# Set these to your actual keystore password (from secure storage)
$env:KEYSTORE_PASSWORD="<your-keystore-password>"
$env:KEY_PASSWORD="<your-key-password>"
.\gradlew.bat bundleRelease
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

⏱️ **Time:** ~2-3 minutes (first time downloads gradle + builds)

---

## Step 2: Deploy Backend to abiertovqs.com

**You'll need:**
- ✅ Domain `abiertovqs.com` registered + pointing to a server
- ✅ Render.com or Railway.app account (free tier works)

### Option A: Render.com (Easiest)

1. Go to https://render.com → Sign up
2. **New** → **Web Service**
3. Connect GitHub (authorize if needed)
4. **Repository:** `qforgues/abierto`
5. **Build command:**
   ```
   cd backend && npm install
   ```
6. **Start command:**
   ```
   npm start
   ```
7. **Environment variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=<generate-random-64-char-string>
   FRONTEND_URL=https://abiertovqs.com
   DB_PATH=/var/data/abierto.db
   ```
8. **Custom domain:** Add `abiertovqs.com` (Render will give you DNS instructions)
9. Deploy → Wait for "Service is live"

### Option B: Railway.app (Also Easy)

1. Go to https://railway.app → Sign up
2. **New Project** → **GitHub Repo**
3. Select `qforgues/abierto`
4. Add environment variables (same as above)
5. Deploy → Done

---

## Step 3: Deploy assetlinks.json

After backend is live, copy the assetlinks.json to your backend's public folder:

**On Render/Railway:**
1. Create `backend/public/.well-known/assetlinks.json`
2. Copy contents from `android/assetlinks.json`
3. Redeploy backend

**Verify it's accessible:**
```bash
curl https://abiertovqs.com/.well-known/assetlinks.json
```

Should return:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.abierto.app",
      "sha256_cert_fingerprints": [
        "9C:03:FB:FE:21:F2:CC:34:62:FA:3A:FE:DD:FF:6D:41:DD:DE:1C:81:91:C1:23:2C:33:08:01:7B:C1:40:9F:45"
      ]
    }
  }
]
```

---

## Step 4: Submit to Play Store (1 hour)

1. **Create Google Play Developer account:** https://play.google.com/apps/publish ($25)
2. **Create new app** → Name: "Abierto"
3. **Fill store listing:**
   - Title: Abierto
   - Description: Manage your business and upload photos
   - Category: Business
   - Upload 4-5 screenshots
   - Upload icon: `frontend/dist/icon-512.png`
   - Upload feature graphic: `frontend/dist/combined-logo.png`
4. **Upload AAB:** Release → Production → Upload `app-release.aab`
5. **Submit for review** → Google Play scans (24-48h) → Live!

**See full guide:** `android/TWA_PLAY_CONSOLE_RUNBOOK.md`

---

## Critical Info

| Item | Value |
|------|-------|
| **App Package** | `com.abierto.app` |
| **App Version** | 1.4.0 |
| **Min SDK** | 24 (Android 7.0+) |
| **Target SDK** | 34 (Android 14) |
| **Keystore Password** | Stored securely in password manager |
| **Key Password** | Stored securely in password manager |
| **SHA256 Fingerprint** | `9C:03:FB:FE:21:F2:CC:34:62:FA:3A:FE:DD:FF:6D:41:DD:DE:1C:81:91:C1:23:2C:33:08:01:7B:C1:40:9F:45` |

---

## What I Still Need From You

1. **Do you have `abiertovqs.com` registered + DNS ready?**
2. **Which do you prefer: Render.com or Railway.app?**
3. **Can you run `./gradlew bundleRelease` on your machine right now?**

Once you answer, I can:
- Create exact Render/Railway deployment config
- Walk you through Play Store setup
- Help debug any build errors

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| `./gradlew: command not found` | Run: `chmod +x android/gradlew` |
| `GRADLE_HOME not set` | It auto-sets; if error persists, install Java 11+ |
| `minSdk too low` error | It's set to 24; this is correct |
| `Cannot resolve symbol 'androidx'` | Gradle will auto-download; just re-run the command |
| `assetlinks.json 404` | Make sure backend is deployed + folder is `public/.well-known/` |

---

## Next: Tell Me

- [ ] Domain ready?
- [ ] Render or Railway?
- [ ] Can you run gradlew locally?

Then we finish this.
