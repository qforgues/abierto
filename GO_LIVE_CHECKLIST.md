# GO LIVE CHECKLIST

**Status:** Android ✅ | Backend DNS Setup → Next

---

## Step 1: DNS (Cloudflare) — 5 mins

**If you haven't already:**

1. **Cloudflare Dashboard** → Domain `abiertovqs.com`
2. **DNS Tab** → **Add Record**
   - Type: **CNAME**
   - Name: **@** (root)
   - Target: **abierto-xxx.onrender.com** (you'll get this from Render)
3. Save → Wait 5-30 mins for propagation

**[See detailed guide](CLOUDFLARE_RENDER_SETUP.md)**

---

## Step 2: Render Deployment — 10 mins

**Option A: Auto (Easiest)**
1. Push `render.yaml` to GitHub
2. Go to Render.com → **New Web Service**
3. Connect GitHub repo
4. Render auto-reads `render.yaml` → Done

**Option B: Manual**
1. Render.com → **New Web Service**
2. Settings from [CLOUDFLARE_RENDER_SETUP.md](CLOUDFLARE_RENDER_SETUP.md)
3. Deploy

**[See detailed guide](CLOUDFLARE_RENDER_SETUP.md)**

---

## Step 3: Add assetlinks.json — 2 mins

```bash
# In your repo:
mkdir -p backend/public/.well-known
cp android/assetlinks.json backend/public/.well-known/

git add backend/public/
git commit -m "feat: add digital asset links"
git push
```

Render auto-redeploys.

---

## Step 4: Verify Backend is Live — 1 min

```bash
curl https://abiertovqs.com/api/health
# Should return: {"status":"UP"}

curl https://abiertovqs.com/.well-known/assetlinks.json
# Should return JSON with SHA256
```

---

## Step 5: Build Android AAB Locally — 10 mins

**On your machine (macOS/Linux/Windows):**

```bash
cd android

export KEYSTORE_PASSWORD="abierto123"
export KEY_PASSWORD="abierto123"

./gradlew bundleRelease
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

---

## Step 6: Submit to Play Store — 1 hour

1. **Google Play Developer account:** https://play.google.com/apps/publish ($25)
2. **New App** → Name: "Abierto"
3. **Store Listing:**
   - Title, description, category (Business)
   - Screenshots (4-5)
   - Icon: `frontend/dist/icon-512.png`
4. **Release** → **Production** → Upload AAB
5. **Submit** → Wait 24-48h → Live ✅

**[Full guide](android/TWA_PLAY_CONSOLE_RUNBOOK.md)**

---

## Status

- ✅ Android Gradle setup
- ✅ Signing key generated
- ✅ assetlinks.json ready
- ⏳ Cloudflare DNS
- ⏳ Render deployment
- ⏳ Backend live
- ⏳ Android build
- ⏳ Play Store submission

---

## Do These Now

1. Set up Cloudflare CNAME
2. Create Render service
3. Push assetlinks.json
4. Verify backend works

Then let me know you're ready to build + submit.
