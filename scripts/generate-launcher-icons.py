#!/usr/bin/env python3
"""
generate-launcher-icons.py — build the Android launcher icon set from the master artwork.

Source of truth: frontend/public/icon-512.png — the same "?" mark used by the website, the
PWA and the Play Store listing icon, so all four stay in sync.

Run from the repo root:  python3 scripts/generate-launcher-icons.py

Writes into android/app/src/main/res/:
  mipmap-<density>/ic_launcher.png             legacy square icon (Android 7 and below)
  mipmap-<density>/ic_launcher_round.png       legacy round icon (API 25)
  mipmap-<density>/ic_launcher_foreground.png  adaptive foreground — the "?" alone
  mipmap-<density>/ic_launcher_background.png  adaptive background — the scene, "?" removed
  mipmap-<density>/ic_launcher_monochrome.png  Android 13+ themed-icon silhouette

Why an adaptive icon at all: without one, Android 8+ letterboxes the legacy icon onto a
white rounded square, so a full-bleed design like this one ends up looking nothing like the
store listing. The adaptive layers let the scene bleed to the edges and the "?" stay
centred inside the safe zone whatever mask the launcher applies.

After running this, bump versionCode/versionName in android/app/build.gradle and build with
scripts/build-release.sh (which prompts for the keystore password).
"""

import os
import sys
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'frontend', 'public', 'icon-512.png')
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

# Legacy launcher icon sizes (48dp) and adaptive layer sizes (108dp), per density.
DENSITIES = {
    'mdpi':    (48,  108),
    'hdpi':    (72,  162),
    'xhdpi':   (96,  216),
    'xxhdpi':  (144, 324),
    'xxxhdpi': (192, 432),
}

# The adaptive canvas is 108dp but only the central 72dp is guaranteed visible, so the glyph
# is sized as a fraction of the FULL canvas while being judged against that visible window.
# 0.40 of 108dp = ~43dp, i.e. about 60% of the visible 72dp — legible at launcher sizes while
# keeping the breathing room the store icon has. At 0.58 the glyph filled ~87% of the visible
# area and read as cramped.
SAFE_FRACTION = 0.40

# Separating the "?" from the waves, and why this particular test:
#   "?" teal      (35, 142, 136)  →  b - g =  -6
#   wave blue    (141, 217, 240)  →  b - g =  +23
#   cream        (249, 249, 249)  →  g - r =    0
#   sand         (244, 174,  22)  →  g - r =  -70
# So `b - g < 10` rejects the waves, `g - r > 15` rejects cream and sand, and the glyph
# satisfies both. An earlier version tested `abs(g - b) < 50`, which the waves also passed —
# it selected the whole image. Keep the blue-vs-green asymmetry; it is the load-bearing part.
GLYPH_R, CREAM_R = 35, 240


def glyph_alpha(rgb_img):
    """Soft alpha mask of the "?" glyph, anti-aliasing preserved."""
    w, h = rgb_img.size
    px = rgb_img.load()
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    span = CREAM_R - GLYPH_R
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if (b - g) < 4 and (g - r) > 15 and r < 200:
                # Coverage falls off linearly from glyph teal to cream, which reproduces
                # the original anti-aliasing instead of hard-edging it.
                a = round((CREAM_R - r) * 255 / span)
                # Noise floor: the palest anti-aliased wave edges sit around b-g = 9 and
                # produce single-digit alpha. Without this they drag the glyph bbox out to
                # the full canvas and the foreground layer picks up wave speckle.
                mp[x, y] = max(0, min(255, a)) if a >= 24 else 0

    # Confine the mask to the neighbourhood of the confidently-detected glyph. Threshold
    # tuning alone can't fully suppress pale wave speckle, and stray specks matter twice
    # over: they inflate the crop box (which pushes the glyph off-centre in the foreground
    # layer) and they show up as dots on the finished icon. The glyph is a single centred
    # element, so anchoring to the alpha>=200 core is both safe and deterministic.
    core = mask.point(lambda v: 255 if v >= 200 else 0).getbbox()
    if core is None:
        raise SystemExit('ERROR: no glyph core found — the artwork or its palette changed')
    pad = 6
    x0, y0, x1, y1 = (core[0] - pad, core[1] - pad, core[2] + pad, core[3] + pad)
    keep = Image.new('L', mask.size, 0)
    keep.paste(255, (max(0, x0), max(0, y0), min(w, x1), min(h, y1)))
    return Image.composite(mask, Image.new('L', mask.size, 0), keep)


def inpaint(rgb_img, mask):
    """
    Erase the glyph from the scene so the background layer doesn't ghost it.

    Row-wise median fill: for each row the glyph touches, take the median of the *unmasked*
    pixels just left and right of it and flat-fill the masked run with that. The "?" sits
    entirely on the near-uniform cream field (values vary by only 2–3 levels), so this is
    imperceptible, and working per-row reproduces any vertical gradient exactly.

    A blur-based fill was tried first and left a clearly visible grey ghost — averaging a
    neighbourhood that still contains the dark teal just smears it rather than replacing it.
    Excluding the masked pixels from the estimate is the whole trick.
    """
    import numpy as np

    arr = np.array(rgb_img, dtype=np.float64)
    # Dilate so anti-aliased glyph edges are covered too.
    hard = np.array(
        mask.point(lambda v: 255 if v > 8 else 0).filter(ImageFilter.MaxFilter(7))
    ) > 0

    h, w = hard.shape
    rows = np.flatnonzero(hard.any(axis=1))
    for y in rows:
        masked = hard[y]
        cols = np.flatnonzero(masked)
        x0, x1 = cols.min(), cols.max()
        # Widen the sampling window until it contains enough clean pixels.
        for pad in (30, 60, 120, w):
            lo, hi = max(0, x0 - pad), min(w, x1 + 1 + pad)
            window = ~masked[lo:hi]
            if window.sum() >= 8:
                fill = np.median(arr[y, lo:hi][window], axis=0)
                break
        else:
            fill = np.median(arr[y][~masked], axis=0)
        arr[y, masked] = fill

    return Image.fromarray(arr.round().clip(0, 255).astype('uint8'))


def save(img, density, name):
    d = os.path.join(RES, f'mipmap-{density}')
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, name)
    img.save(path, 'PNG', optimize=True)
    return path


def round_crop(img):
    """Circular crop for the legacy API-25 round icon."""
    size = img.size[0]
    big = size * 4
    m = Image.new('L', (big, big), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).ellipse((0, 0, big - 1, big - 1), fill=255)
    m = m.resize((size, size), Image.LANCZOS)
    out = img.convert('RGBA')
    out.putalpha(m)
    return out


def main():
    if not os.path.exists(SRC):
        sys.exit(f'ERROR: missing source artwork {SRC}')
    if not os.path.isdir(RES):
        sys.exit(f'ERROR: missing android res dir {RES}\n'
                 f'       (the LIVE android project is ~/abierto/android, not abierto-build)')

    art = Image.open(SRC).convert('RGB')
    if art.size != (512, 512):
        sys.exit(f'ERROR: expected a 512x512 source, got {art.size}')

    print(f'Source: {SRC} {art.size}')

    mask = glyph_alpha(art)
    bbox = mask.getbbox()
    print(f'Glyph bbox: {bbox}  ({bbox[2]-bbox[0]}x{bbox[3]-bbox[1]} px)')

    # Foreground: the glyph alone, on transparency, trimmed to its own bounds.
    glyph = Image.new('RGBA', art.size, (0, 0, 0, 0))
    glyph.paste(art, (0, 0), mask)
    glyph = glyph.crop(bbox)

    # Background: the same scene with the glyph erased.
    scene = inpaint(art, mask)

    written = 0
    for density, (legacy_px, adaptive_px) in DENSITIES.items():
        # ── Legacy icons (pre-Android 8) — the full artwork, as-is.
        legacy = art.resize((legacy_px, legacy_px), Image.LANCZOS)
        save(legacy, density, 'ic_launcher.png')
        save(round_crop(legacy), density, 'ic_launcher_round.png')

        # ── Adaptive background: scene bleeding to all four edges.
        save(scene.resize((adaptive_px, adaptive_px), Image.LANCZOS).convert('RGBA'),
             density, 'ic_launcher_background.png')

        # ── Adaptive foreground: glyph centred inside the safe zone.
        target_h = int(adaptive_px * SAFE_FRACTION)
        scale = target_h / glyph.size[1]
        gw, gh = max(1, int(glyph.size[0] * scale)), target_h
        fg = Image.new('RGBA', (adaptive_px, adaptive_px), (0, 0, 0, 0))
        fg.paste(glyph.resize((gw, gh), Image.LANCZOS),
                 ((adaptive_px - gw) // 2, (adaptive_px - gh) // 2))
        save(fg, density, 'ic_launcher_foreground.png')

        # ── Monochrome (Android 13+ themed icons): the same silhouette, solid black.
        #    The system recolours it; only the alpha channel matters.
        mono = Image.new('RGBA', (adaptive_px, adaptive_px), (0, 0, 0, 0))
        sil = Image.new('RGBA', glyph.size, (0, 0, 0, 255))
        sil.putalpha(glyph.getchannel('A'))
        mono.paste(sil.resize((gw, gh), Image.LANCZOS),
                   ((adaptive_px - gw) // 2, (adaptive_px - gh) // 2))
        save(mono, density, 'ic_launcher_monochrome.png')

        written += 5
        print(f'  {density:8s} legacy {legacy_px}px · adaptive {adaptive_px}px '
              f'· glyph {gw}x{gh}')

    # ── Adaptive icon descriptors.
    xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
'''
    d = os.path.join(RES, 'mipmap-anydpi-v26')
    os.makedirs(d, exist_ok=True)
    for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        with open(os.path.join(d, name), 'w') as f:
            f.write(xml)
        written += 1

    print(f'\n{written} files written to android/app/src/main/res/')
    print('Next: bump versionCode/versionName in android/app/build.gradle,')
    print('      then ./scripts/build-release.sh')


if __name__ == '__main__':
    main()
