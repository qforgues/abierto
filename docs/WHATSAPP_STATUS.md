# Status updates by WhatsApp (and SMS)

An owner sends **`OPEN`** to Abierto's WhatsApp number and their public status changes
instantly. No login, no dashboard, no app.

This matters more than it looks. Abierto's promise is "open **right now**", and that promise
is only as good as how often owners update their status. Asking a busy restaurant to log
into a web dashboard is a big ask. Asking them to send one word on WhatsApp — the app
they're already in all day in Puerto Rico — is almost no ask at all.

**The code is written and tested (`backend/routes/webhooks.js`, 30 tests). What's missing is
configuration and phone numbers.**

---

## Commands

| Send | Status becomes |
|---|---|
| `OPEN` / `ABIERTO` | Open |
| `CLOSED` / `CERRADO` / `CLOSE` | Closed |
| `LUNCH` / `ALMUERZO` | Out to Lunch |
| `SEASON` / `TEMPORADA` | Closed for the Season |
| `STATUS` / `ESTADO` | replies with what the public currently sees |
| `HELP` / `AYUDA` | replies with this list |

Case- and whitespace-insensitive. An unrecognised word gets a friendly "reply HELP" and
changes nothing.

---

## Two prerequisites, in this order

### 1. Populate `businesses.phone` — currently **0 of 25**

Nothing works until owners' numbers are on file, because the number *is* the credential.
Add them in the admin dashboard, or have owners fill in the (optional) phone field at signup.

Format doesn't matter. `(787) 555-0142`, `+1 787 555 0142` and `7875550142` all match — the
lookup compares the last 10 digits with punctuation stripped on both sides.

### 2. Wire up Twilio

1. **Twilio account** → Messaging → Try it out → **WhatsApp sandbox** (works immediately, no
   Meta approval, perfect for testing with your own phone).
2. Set the sandbox's **"When a message comes in"** webhook to:
   ```
   https://abierto.app/api/webhooks/twilio      (HTTP POST)
   ```
3. Set **`TWILIO_AUTH_TOKEN`** on Render (Environment → Add Environment Variable) and
   restart. Until this is set the endpoint accepts unsigned requests — fine locally,
   **not acceptable in production**, because anyone who guesses an owner's phone number
   could change that business's status.
4. Test: join the sandbox from your phone, send `HELP`, then `OPEN`.
5. **Going beyond the sandbox** needs a WhatsApp Business sender: a Meta Business account,
   business verification, and a dedicated number. Twilio walks you through it. Budget a few
   days for Meta's verification.

SMS works through the same endpoint and needs no Meta approval — a reasonable fallback for
owners who don't use WhatsApp.

### Cost

Twilio charges per message and Meta charges per conversation. For a couple of dozen
businesses sending a handful of messages a day this is small, but it is **not** free — worth
checking current WhatsApp pricing before rolling it out island-wide.

---

## Two bugs that made this a silent no-op until 2026-07-30

Both are worth knowing about, because both were invisible — the owner got a plausible reply
either way, and nothing appeared in any log.

**1. The phone lookup could never match.** The signup form stores a display-formatted number
(`(787) 555-1234`) while Twilio sends `whatsapp:+17875551234`. The old query was
`WHERE b.phone = ?`. Every owner would have been told "your number is not linked to any
business" forever. Now matched on the last 10 digits.

**2. The schedule silently overruled the owner.** `utils/status.js#computeStatus` **ignores**
the stored status whenever a business has hours for today — unless `quick_override` is set.
92% of businesses have hours. The old code never set the flag, so an owner's `CLOSED` was
accepted, stored, confirmed... and then the schedule kept showing "Open" to the public.
Command-driven updates now set `quick_override = 1`.

The override **expires at the end of the Vieques day** (`computeStatus` checks the date it
was set), so a business can't get stuck "Open" forever because of one forgotten message. The
hourly cron (`/api/cron/status-reset`, see `docs/CRON_SETUP.md`) also clears these.

Regression tests for both live in `backend/tests/webhooks.test.js`. Don't delete them.

---

## Security

- **Twilio signature validation** on every request once `TWILIO_AUTH_TOKEN` is set. A missing
  or malformed signature is a clean **403**.
- **Rate limited** to 60 messages/minute — it's a public, unauthenticated endpoint and Twilio
  retries on failure.
- **Replies are XML-escaped.** The owner's message is echoed back on an unknown command; an
  unescaped `&` or `<` would produce invalid TwiML and Twilio would deliver nothing.
- **Inactive businesses are unreachable**, so deactivating a listing also revokes its number.

The phone number is the only credential. That is a deliberate trade — the whole value is
that there's nothing to remember — but it means **a leaked or reassigned number can change a
business's status**. Acceptable at this scale, and worth revisiting if Abierto ever carries
something more sensitive than open/closed.
