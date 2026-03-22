# Abierto v1.1 Launch Roadmap

**Goal:** Ship a live, usable MVP on the web within 2–4 weeks, with a pragmatic path to Android and iOS without overengineering.

**Philosophy:** Fix real launch blockers (auth, ops risk), deploy fast, learn from users, refine after.

---

## Executive Summary

Abierto v1.0 works. v1.1 makes it safe and deployable. The app is a React + Express monolith that's perfect for a one-host deployment. The actual work:

1. **Strengthen business owner auth** (4–6 hours) — rate limiting, stronger codes/passwords, token expiry
2. **Deploy to Render/Railway** (2–3 hours) — one URL, one host, no CORS headaches
3. **Add SQLite backup immediately OR plan Postgres migration** (2–4 hours) — don't launch blind to data loss
4. **Wrap with Capacitor for Android** (2–4 hours) — reuse the web app, publish to Play Store

**Real blockers before public launch:**
- ✅ Owner auth rate limiting
- ✅ Token expiry (7–30 days, not infinite)
- ✅ A backup or migration plan for data

**Nice-to-haves that can wait:**
- Refresh token system (adds complexity, not critical for MVP)
- Postgres migration (SQLite is fine if you back it up)
- Email 2FA (useful, but stronger password/code is enough to start)
- Analytics, error tracking, monitoring (important after first users)

---

## Phase 1: Strengthen Owner Auth & Add Rate Limiting

**Why:** The biggest public-launch risk. A leaked 6-char code gives anyone full control of a business.

**What to do:**

### 1A. Increase code strength and make owner auth actually strong
- **Business code generation** (in `backend/routes/businesses.js`): Keep 6 chars, but add alphanumeric (not just digits). Or go to 8 chars.
- **Owner password:** Add a *required* password field for business setup. This becomes the real owner credential, separate from the ephemeral guest code.
- **Guest code lifespan:** Optional — set a max age (e.g., 30 days) or require explicit refresh by the owner.

### 1B. Add rate limiting to login attempts
- Install `express-rate-limit`:
  ```bash
  npm install express-rate-limit
  ```
- Apply to `POST /api/auth/login` in `backend/routes/auth.js`:
  ```javascript
  const rateLimit = require('express-rate-limit');

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                     // max 5 failed attempts
    message: 'Too many login attempts, try again in 15 minutes',
    keyGenerator: (req) => req.ip || req.connection.remoteAddress
  });

  router.post('/login', loginLimiter, (req, res) => {
    // existing auth logic
  });
  ```

### 1C. Set sensible token expiry
- In `backend/middleware/auth.js`, ensure JWT tokens expire:
  ```javascript
  const token = jwt.sign(
    { businessId, role: 'owner' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' } // or '7d' for stricter security
  );
  ```
- Let expired tokens trigger a re-login (don't silently refresh; make it obvious to the user).

### 1D. Optional: Add email verification for new business setup
- If you want extra assurance, require the owner to verify their email before the business goes live.
- For MVP, skip this — stronger password + rate limiting is enough.

**Success criteria:**
- Owner password is required and hashed (bcrypt, not plaintext)
- Rate limiting blocks brute force attempts
- Tokens expire and require re-login
- Guest codes are still short-lived or owner-refreshable

**Estimated effort:** 4–6 hours (including testing)

---

## Phase 2: Deploy to Render or Railway

**Why:** Get live fast, no infrastructure overhead, one moving part.

**Choose one:**

### Option A: Render.com (recommended for you)
- Free tier supports Node.js + PostgreSQL
- Built-in GitHub integration (auto-deploy on push)
- Persistent disk available (good for SQLite backups)
- Clear env var management

### Option B: Railway.app
- Similar feature set
- Slightly cheaper at scale
- Good CLI for local testing

**Deployment steps (Render.com example):**

1. **Create a Dockerfile** (in repo root):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["node", "backend/server.js"]
   ```

2. **Set up env vars in Render dashboard:**
   ```
   NODE_ENV=production
   JWT_SECRET=<your-secret-key>
   ADMIN_PASSWORD=<your-setup-password>
   DATABASE_URL=./db/database.sqlite (or path on persistent disk)
   API_URL=https://yourdomain.com
   UPLOAD_URL=https://yourdomain.com/uploads
   ```

3. **Connect your GitHub repo** and deploy. Render auto-rebuilds on push.

4. **Test the health endpoint:**
   ```bash
   curl https://yourdomain.com/api/health
   # Should return {"status":"ok"}
   ```

5. **Smoke test:**
   - Create a test business
   - Upload a photo
   - Toggle status from incognito browser

**Success criteria:**
- Web app is live at a public URL
- All API endpoints respond
- Images upload and display correctly
- Health check passes

**Estimated effort:** 2–3 hours (includes testing and fixing any env var issues)

---

## Phase 3: Backup Plan for SQLite (Do This Immediately)

**Why:** If your host loses the disk (rare but possible), you lose all business data. Unacceptable for any public launch.

**Choose one approach:**

### Option A: Automated SQLite backups (faster, good for MVP)
- Set up a cron job (or Render cron) to dump the database nightly to Supabase Storage or S3
- Example cron job in `scripts/backup.sh`:
  ```bash
  #!/bin/bash
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  cp ./backend/db/database.sqlite ./db_backup_${TIMESTAMP}.sqlite
  # Upload to S3 or Supabase Storage
  aws s3 cp ./db_backup_${TIMESTAMP}.sqlite s3://your-bucket/
  ```
- Add to `package.json`:
  ```json
  "scripts": {
    "backup": "bash scripts/backup.sh"
  }
  ```
- In Render, set up a cron job (Render Cron Job service) to run `npm run backup` daily

### Option B: Migrate to Supabase Postgres (better long-term, more work upfront)
- Use `better-sqlite3` or `pg` to query Supabase Postgres instead of SQLite
- Schema migration (doable but real work; 4–6 hours)
- Benefit: scales without rewriting, Supabase handles backups for you
- **Decision point:** Do this if you have Supabase ready and want to avoid future migration pain

**For now, recommend Option A** (backup to S3/Supabase Storage). It's fast, keeps your current codebase unchanged, and buys you time to learn if SQLite is a real bottleneck.

**Success criteria:**
- Database backups exist and are testable (at least one manual backup restore)
- Automated backup job runs daily
- You can restore from a backup in <30 min if needed

**Estimated effort:**
- Option A: 2–4 hours
- Option B: 6–8 hours (defer to Phase 4 or after first users)

---

## Phase 4: Wrap with Capacitor for Android (Week 3–4)

**Why:** Reuse 90% of your web code, get an APK in 1–2 days, publish to Play Store with minimal extra work.

**Steps:**

1. **Install Capacitor:**
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init abierto-app com.yourcompany.abierto
   npx cap add android
   ```

2. **Update `capacitor.json`:**
   ```json
   {
     "appId": "com.yourcompany.abierto",
     "appName": "Abierto",
     "webDir": "frontend/build",
     "server": {
       "url": "https://yourdomain.com",
       "cleartext": false
     }
   }
   ```

3. **Build the web app:**
   ```bash
   npm run build
   ```

4. **Copy to Android project:**
   ```bash
   npx cap copy android
   ```

5. **Open Android Studio and build:**
   ```bash
   npx cap open android
   ```
   - In Android Studio: Build → Generate Signed Bundle/APK
   - Create a signing key (one-time, keep it safe)
   - Generate signed APK

6. **Test on emulator or device:**
   - Install the APK and verify:
     - Offline detection works (Capacitor handles network state)
     - Camera/photo upload works (if you use native camera, add the plugin)
     - Business status toggle works

7. **Submit to Google Play:**
   - Create a Google Play Developer account ($25 one-time)
   - Create a new app listing
   - Upload the signed APK
   - Fill in metadata (description, screenshots, privacy policy)
   - Submit for review (24–48 hours typically)

**For Apple later:**
- Same Capacitor setup, different build artifact
- Requires macOS to build (or hire someone)
- App Store review is stricter; expect 1–3 feedback rounds
- Can defer this 2–4 weeks while you validate with Android users

**Success criteria:**
- App installs and launches on Android emulator/device
- All core features work (business lookup, photo upload, status toggle)
- APK signed and ready for Play Store
- Play Store listing is complete

**Estimated effort:** 2–4 hours to build and test; 1 hour to submit.

---

## Timeline & Dependencies

```
Week 1:
  Mon–Wed: Phase 1 (auth hardening)           → 4–6 hours
  Thu–Fri: Phase 2 (Render/Railway deploy)    → 2–3 hours
          Phase 3a (SQLite backups)           → 2–4 hours
          Testing & smoke test                 → 2 hours
          [LAUNCH: v1.1 web live]

Week 2–3:
  Mon–Wed: Phase 4 (Capacitor + Android)      → 2–4 hours
  Thu–Fri: Google Play submission
          [LAUNCH: v1.1 Android live]

Week 4+:
  iOS (same Capacitor, requires macOS)
  Monitor, gather user feedback, plan v1.2
```

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Auth still too weak | **HIGH** | Rate limiting + stronger password + token expiry (Phase 1) |
| Data loss (SQLite disk) | **HIGH** | Automated backups (Phase 3a) or Postgres migration (Phase 3b) |
| Deployment complexity | **MEDIUM** | Use Render/Railway, not custom infra; one host, known setup |
| Android build breaks | **MEDIUM** | Test APK on emulator before Play Store submission |
| Play Store rejection | **LOW** | Check Play Store policies early; most rejections are fixable in <24h |

---

## Success Criteria for v1.1 Launch

**MVP is live when:**
- ✅ Web app is public at `yourdomain.com` and stable
- ✅ Any user can create a business (with owner password)
- ✅ Owner can upload photos and toggle status in real-time
- ✅ Guest access works (short code, read-only)
- ✅ Database is backed up nightly
- ✅ Rate limiting blocks brute force attempts
- ✅ Tokens expire after 7–30 days
- ✅ Health check endpoint responds (`/api/health`)

**Optional but nice-to-have for first week after launch:**
- Basic uptime monitoring (UptimeRobot, free tier)
- Error tracking (Sentry, free tier)
- Analytics (Plausible, Fathom, or GA)

---

## What's NOT in v1.1 (Defer These)

- Refresh token system (too complex for MVP; expiry + re-login is fine)
- Email 2FA (nice-to-have; stronger password is enough)
- Postgres migration (keep SQLite, just back it up)
- Dark mode, internationalization, PWA offline mode
- Admin dashboard (you can manage businesses via backend/DB directly)
- Payment/subscription (validate demand first)

---

## Questions Before You Start

1. **Do you have a domain ready?** (e.g., `abierto.com`, `mybusiness-status.app`)
2. **Render or Railway?** (Either works; Render is slightly more polished)
3. **AWS account for backups?** (Or use Supabase Storage if you already have it)
4. **Apple developer account?** (Not needed for v1.1, but needed for iOS later; $99/year)

---

## Next Immediate Actions

1. **Review auth code** in `backend/routes/auth.js` and `backend/middleware/auth.js` — identify exactly what needs to change
2. **Choose Render vs. Railway** and sign up
3. **Generate a JWT_SECRET and ADMIN_PASSWORD** for production
4. **Test the current build locally:**
   ```bash
   npm run build && NODE_ENV=production node backend/server.js
   ```
5. **Pick a domain** (can use Render's free subdomain for testing)

Then start Phase 1. You'll be live in 2–3 weeks.
