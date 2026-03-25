# Cloudflare + Render: Quick Setup (15 mins)

**Goal:** Point abiertovqs.com → Render backend → Go live

---

## Part 1: Cloudflare DNS (5 mins)

You just bought on Cloudflare. Now point it to Render.

### 1.1 Get Render's DNS Target

1. Go to **Render.com** (logged in)
2. Create a new **Web Service** (don't finish yet, just get the info)
3. Render will give you a **render.com** subdomain like:
   ```
   abierto-abc123.onrender.com
   ```

### 1.2 Add DNS Record in Cloudflare

1. Log in to **Cloudflare** → Select domain `abiertovqs.com`
2. **DNS** tab → **Add record**
3. **Type:** CNAME
4. **Name:** @ (or leave blank for root domain)
5. **Target:** `abierto-abc123.onrender.com` (from Render)
6. **Proxy status:** "Proxied" (orange cloud)
7. Click **Save**

### 1.3 Verify DNS

```bash
nslookup abiertovqs.com
# Should return Cloudflare's nameservers + Render target
```

**⏱️ Time to propagate:** 5-30 minutes (usually instant)

---

## Part 2: Render Deployment (10 mins)

### 2.1 Create Web Service on Render

1. Go to https://render.com → **New** → **Web Service**
2. **Connect repository:** Select `qforgues/abierto`
3. **Settings:**
   - **Name:** `abierto`
   - **Branch:** `main` (or your current branch)
   - **Runtime:** `Node`
   - **Build command:**
     ```
     cd backend && npm install
     ```
   - **Start command:**
     ```
     node backend/server.js
     ```
   - **Instance type:** Free (fine for testing) or Starter ($7/month)

### 2.2 Add Environment Variables

Click **Environment** tab and add:

```
NODE_ENV=production
JWT_SECRET=your-random-secret-here-make-it-64-chars-long
FRONTEND_URL=https://abiertovqs.com
DB_PATH=/var/data/abierto.db
PORT=5000
```

**Generate JWT_SECRET** (run once):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Add Custom Domain

1. After creating the service, go to **Settings**
2. **Custom domains** section
3. Click **Add Custom Domain**
4. Enter: `abiertovqs.com`
5. Render will show DNS instructions (but Cloudflare is already set up, so just confirm)

### 2.4 Deploy

Click **Deploy** → Wait for build to complete (2-3 minutes)

**Check status:** Should say "Live" with a green checkmark

---

## Part 3: Deploy assetlinks.json (2 mins)

Now add assetlinks.json to your backend's public folder.

### 3.1 Update Backend

1. In your local repo:
   ```bash
   mkdir -p backend/public/.well-known
   cp android/assetlinks.json backend/public/.well-known/
   ```

2. Commit and push:
   ```bash
   git add backend/public/
   git commit -m "feat: add digital asset links for Android TWA"
   git push
   ```

3. Render auto-redeploys → Done ✅

### 3.2 Verify It's Live

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
        "DD:F0:86:86:33:5C:25:59:0D:4D:D9:2E:45:B7:9E:20:49:09:9E:21:6D:70:7B:6C:3F:40:84:05:9E:F5:E8:EF"
      ]
    }
  }
]
```

Also test the health endpoint:
```bash
curl https://abiertovqs.com/api/health
# Should return: {"status":"UP"}
```

---

## Checklist

- [ ] **Cloudflare DNS:** CNAME record added (@ → render.onrender.com)
- [ ] **Render service:** Created + deployed (showing "Live")
- [ ] **Custom domain:** Added `abiertovqs.com` in Render settings
- [ ] **Environment vars:** All 5 added (JWT_SECRET, NODE_ENV, etc.)
- [ ] **assetlinks.json:** Committed + pushed
- [ ] **Test:** `curl https://abiertovqs.com/api/health` returns 200

Once all ✅, move to next step.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| DNS not resolving | Cloudflare propagation takes 5-30 min; check with `nslookup abiertovqs.com` |
| Render says "Build failed" | Check build logs; usually missing `backend/server.js` or npm issue |
| assetlinks.json returns 404 | Make sure folder is `backend/public/.well-known/` (exact path) |
| "Cannot GET /api/health" | Restart Render service (Settings → Manual Deploy) |

---

## Next

Once verified:
1. Build Android locally: `cd android && ./gradlew bundleRelease`
2. Go to Play Store, upload AAB
3. Submit → Live in 24-48h

Questions? Let me know.
