#!/usr/bin/env python3
"""Generate Android launcher icons from the PWA icons.

Source of truth stays in public/icons/ (the same artwork the PWA manifest
uses), so the sideloadable APK ships identical branding:
  - public/icons/icon-512.png          ("any" icon)      -> legacy mipmap ic_launcher / ic_launcher_round
  - public/icons/icon-maskable-512.png ("maskable" icon) -> adaptive-icon foreground

Densities follow the Android launcher spec:
  legacy:    mdpi 48, hdpi 72, xhdpi 96, xxhdpi 144, xxxhdpi 192
  foreground (108dp full-bleed): mdpi 108, hdpi 162, xhdpi 216, xxhdpi 324, xxxhdpi 432
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEGACY_SRC = os.path.join(ROOT, "public", "icons", "icon-512.png")
FOREGROUND_SRC = os.path.join(ROOT, "public", "icons", "icon-maskable-512.png")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
FOREGROUND_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def resize(src, dest, size):
    img = Image.open(src).convert("RGBA")
    img = img.resize((size, size), Image.LANCZOS)
    img.save(dest, "PNG")


def main():
    for path in (LEGACY_SRC, FOREGROUND_SRC):
        if not os.path.exists(path):
            print(f"missing source icon: {path}", file=sys.stderr)
            return 1
    if not os.path.isdir(RES):
        print(f"android res dir not found: {RES} (run `npx cap add android` first)",
              file=sys.stderr)
        return 1
    for d, size in LEGACY_SIZES.items():
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            resize(LEGACY_SRC, os.path.join(RES, d, name), size)
    for d, size in FOREGROUND_SIZES.items():
        resize(FOREGROUND_SRC, os.path.join(RES, d, "ic_launcher_foreground.png"), size)
    print("android launcher icons regenerated from public/icons/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
