# Android releases — the rules, and why they exist

## THE RULE

> ## GitHub is the only source of truth.
> **`~/abierto/android` in this repo is the app. Build from here, from a clean checkout of
> `main`, and from nowhere else. If an Android project exists outside this repository, it is
> not the app — no matter how new it looks.**

Nothing gets uploaded to Play that was not built from this repo and did not pass
`./scripts/verify-release.sh`.

---

## What went wrong on 30 July 2026

`versionCode 7` was uploaded to production and **crashed on launch for every user**. The
Play listing showed *"Abierto closed because this app has a bug."*

Two Android projects existed:

| | `~/abierto/android` (in the repo) | `abierto-build/twa-project` (outside it) |
|---|---|---|
| Architecture | Hand-rolled `MainActivity` opening a **Chrome Custom Tab** | Real **TWA** — `androidbrowserhelper` `LauncherActivity` |
| Custom Java | 2 files, including untested Play Integrity code | **None** — all behaviour from the library |
| versionCode | 6 | 5 |
| targetSdk | 36 | 35 |
| Last commit | Jul 22 | May 12 |
| **Ever shipped to users?** | **No** | **Yes — this was the live app** |

Every available signal said the repo project was the live one: higher versionCode, higher
targetSdk, more recent commits, the keystore, the build script. All of it indicated where
*development* had happened — **none of it indicated what was actually deployed**. The repo
project had never shipped. Building from it replaced the working app with a different
application whose Play Integrity code had never run on a device.

### Why the checks in place didn't catch it

It compiled. It was signed with the right key. The versionCode was higher. The new icons
were present in the bundle and pixel-verified. **Every one of those passed, and not one of
them can detect "this is a different application."**

Compiling is not working. The gap was never running it.

### The three things that would have caught it

1. **Comparing the artifact against the live app's components** — now automated in
   `scripts/verify-release.sh`.
2. **Reconciling the repo against Play.** Play said the live version was `5`; the repo said
   `6`. That contradiction was visible and was not chased down.
3. **Running it.** On a device or emulator, once, before upload.

---

## Release checklist — all of it, every time

```bash
cd ~/abierto
git checkout main && git pull            # 1. build only from GitHub's main
                                         # 2. bump versionCode/versionName in
                                         #    android/app/build.gradle — versionCode must
                                         #    exceed what is LIVE ON PLAY, not the repo
./scripts/build-release.sh               # 3. prompts for the keystore password
./scripts/verify-release.sh              # 4. MANDATORY GATE — must print all checks passed
```

5. **Install the artifact and open it.** Emulator or a real phone. Watch it launch, load
   abierto.app, and navigate. This is not optional; it is the step whose absence caused the
   outage.
6. Upload to Play Console → Production → Create new release.
7. **After it rolls out**, set `lastShippedVersionCode` in `android/release-baseline.json`
   to the version you just shipped. The gate depends on that number being true.

### What `verify-release.sh` checks

- **The artifact contains `androidbrowserhelper.trusted.LauncherActivity`** — the live app's
  entry point. This is the load-bearing check.
- **It does not contain `abierto/app/MainActivity`** — the rewrite that crashed production.
- Package is `com.abierto.app`; the bundle is signed.
- `versionCode` exceeds what is live on Play.
- `targetSdk` meets Play's current floor.

Verified in both directions: it passes the restored app and **rejects** the exact build that
broke production.

---

## Recovery from the outage

`versionCode 8` / `1.1.1` restores the real TWA. Its `app/build.gradle` is **identical to the
proven production build except the two version lines** — deliberately the smallest possible
change from known-good code, because an emergency fix is the wrong place for improvements.

Play does not permit republishing a lower `versionCode`, so recovery always moves forward.

The unshipped hand-rolled project is preserved in this repo's git history (removed in the
commit that restored the TWA) if anything in it is ever wanted again. **Do not resurrect it
without running it on a device first.**

---

## Deferred deliberately

- **targetSdk 36** — required by **31 Aug 2026**, currently 35. It must ship as its own
  release, tested on a device, *not* bundled with anything else. The previous attempt to
  combine an SDK bump with other changes is what produced the outage.
- **New launcher icons** — `python3 scripts/generate-launcher-icons.py` regenerates them
  into `android/app/src/main/res/`. Held back from the emergency fix on purpose; ship them
  with the targetSdk 36 release once that is device-tested.

---

## The signing key

`android/app/abierto-key.jks` signs every update. **If the file or its password is lost, the
app can never be updated again.** It is git-ignored and must stay that way. Backups:
`~/env.bak/abierto/` and Google Drive ("Abierto — KEYS & PASSWORDS"). Google Play App
Signing is enabled, so an upload-key reset is possible in a worst case.

Verified 30 Jul 2026: the copies in `~/abierto/android/app/`,
`abierto-build/twa-project/app/` and `~/env.bak/abierto/` are byte-identical.
