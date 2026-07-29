# Google Play store listing assets

Assets uploaded **in Play Console**, not built into the app. Changing anything here needs
**no TWA rebuild, no `versionCode` bump, and no new release** — and therefore carries no
risk to the signing key.

## App icon

`abierto-play-store-icon-512.png` — 512×512, 32-bit PNG (RGBA, fully opaque), 283 KB.

Generated from `frontend/public/icon-512.png`, the same "?" mark the website and PWA use,
so the store listing, the website and the home-screen PWA all match. The source artwork is
already full-bleed to all four edges, so nothing was cropped or rescaled — only an opaque
alpha channel was added, because Play requires a 32-bit PNG and the source was 24-bit RGB.

Do **not** bake rounded corners or a drop shadow into this file. Play applies its own
corner masking and shadow; a pre-rounded icon ends up visibly double-rounded.

### Regenerating

```bash
python3 - <<'PY'
from PIL import Image
Image.open('frontend/public/icon-512.png').convert('RGB').convert('RGBA') \
     .save('marketing/store/abierto-play-store-icon-512.png', 'PNG', optimize=True)
PY
```

### Uploading

Play Console → **Grow → Store presence → Main store listing → App icon** → replace →
**Save**. Goes through review; typically live in a few hours.

## What this does NOT change

The **launcher icon** — the one on a user's home screen — is a different asset entirely:
`twa-project/app/src/main/res/mipmap-*/ic_launcher*.png` in the `abierto-build` repo. It is
currently the "Abierto?" wordmark, not this "?" mark. Changing it requires a full TWA
release: bump `versionCode`, `./gradlew bundleRelease` with the keystore password, upload a
new AAB, and existing users only see it after they update.

Store icon and launcher icon are independent. They do not have to match, but they usually
should.
