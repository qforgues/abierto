# Abierto v1.1 Blueprint: Suggested Improvements

Use this prompt to refine the v1.1 blueprint. Each section is a specific suggestion to consider before implementation.

---

## Phase 1: Strengthen Owner Auth — Simplify for Speed

**Current design:** Email/username login + password reset via email
**Suggestion:** For launch speed (2–4 weeks), use a simpler approach instead.

**Option (Recommended):**
- Keep the existing code-based business login system
- Add a **required owner password** (8+ characters, bcrypt hashed with 12+ rounds)
- Add **rate limiting** on login attempts (5 fails per 15 min)
- Add **JWT token expiry** (30 days)
- **Defer password reset to v1.2** — use a manual reset flow: owner contacts support or resets via backend admin tool

**Why:** This cuts Phase 1 from 6 hours to 4 hours, and avoids SMTP setup, email templates, and reset token logic. You can add email-based password reset in week 2 post-launch.

**Decision needed:** Do you want email/username login from day one, or is the simplified approach okay?

---

## Phase 2: Deploy to Render/Railway — No Changes

This phase is solid. No suggestions.

---

## Phase 3: Backup Plan for SQLite — Clarify Storage Choice

**Current design:** "AWS S3 or Supabase Storage"
**Suggestion:** Pick one explicitly, now.

**Option A: Supabase Storage (recommended if you have Supabase account)**
- Pros: Already have credentials, simpler integration, fewer keys to manage
- Cons: None if you're already using Supabase

**Option B: AWS S3**
- Pros: Industry standard, cheap ($0.01/month for 30 small backups)
- Cons: Need AWS account, API keys, one more service to manage

**Decision needed:** Which storage backend for Phase 3?

---

## Phase 3 (Continued): Backup Verification & Restore Testing

**Add these steps before launch:**

1. **Backup verification:** After each backup completes, verify the file is readable (don't just check that it exists). Test a small SELECT query on the backup.

2. **Restore procedure documentation:** Write down step-by-step instructions:
   ```
   1. Download backup.sqlite from [S3/Supabase]
   2. Stop the server (Render: pause deployment)
   3. Replace /backend/db/database.sqlite with the backup file
   4. Restart the server
   5. Verify business data is present: curl /api/health
   ```

3. **Pre-launch restore test:** Do one full restore from a backup file to verify it works (don't just assume).

---

## Phase 4: Wrap with Capacitor — Clarify Scope

**Current design:** Tests include "offline capabilities"
**Suggestion:** Clarify what this means for v1.1.

The web app does not currently have offline mode (service worker, cached assets, etc.). For Phase 4, test **one of these instead:**

**Option A (Minimum):** Test that the app gracefully handles no network
- User taps a button when offline → shows an error
- User goes back online → can retry
- No UI crash or infinite spinner

**Option B (More robust, more work):** Add basic offline detection
- Show a "No internet connection" banner
- Prevent button clicks that require network
- Queue actions to retry when online (more complex)

**Recommendation for v1.1:** Go with Option A (graceful degradation). Defer true offline support to v1.2.

---

## Testing Strategy: Reduce Scope for MVP

**Current design:** Jest/Mocha unit tests + integration tests
**Suggestion:** For launch, do manual smoke tests only; automate later.

**Phase 1.5: Pre-Launch Smoke Tests** (1–2 hours)
- Create a new business with owner password
- Upload a photo and verify it's visible
- Toggle business status and refresh page
- Test guest access with business code
- Test rate limiting: try 6 login failures, verify 6th is blocked
- Test token expiry: wait 30 days (or mock time) and verify expired token requires re-login
- Test backup: verify backup file exists and is non-empty

**After launch (v1.2):** Add Jest/Mocha CI pipeline and automated tests.

---

## Phase 2: Health Check Endpoint — Verify Database

**Current design:** Health check exists (Codex added it)
**Suggestion:** Enhance it to check database connectivity.

**Better health check:**
```javascript
app.get('/api/health', (req, res) => {
  try {
    // Verify DB is actually working
    const db = getDatabase();
    const test = db.prepare('SELECT 1').get();
    if (!test) throw new Error('DB query failed');
    res.status(200).json({status: 'ok'});
  } catch (err) {
    res.status(500).json({status: 'error', message: err.message});
  }
});
```

This catches database connection issues, not just app startup.

---

## Phase 4: Signing Key Backup — Security Note

**Current design:** "Document the signing key backup procedure"
**Suggestion:** Add explicit security guidance.

**Do this:**
- Generate the signing key in Android Studio (one-time)
- **Save it to a secure password manager or encrypted file** (not plaintext email, not in Git)
- Document the key **location, not the key itself** in your README
- Example: `"Signing key is in [location]. Ask [person] for access."`

**Why:** If the signing key leaks, anyone can publish fake versions of your app to the Play Store.

---

## Summary of Decisions Needed

1. **Phase 1 auth:** Simplified (code + password) or full email login?
2. **Phase 3 storage:** Supabase Storage or AWS S3?
3. **Phase 4 offline:** Graceful degradation or queued actions?
4. **Testing:** Smoke tests now, Jest/Mocha later?

Answer these and the blueprint is ready to execute.
