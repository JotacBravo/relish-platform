#!/usr/bin/env python3
"""Shrink the story icons in place (256 px, 256-colour palette).

Usage: python3 processing/icons/compress_icons.py [--size 256] [--colors 256]
"""

import os
import glob
import argparse
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
DIRS = [
    os.path.join(ROOT, "relish", "public", "icons", "dishes_v2"),
    os.path.join(ROOT, "relish", "public", "icons", "ingredients"),
]


def flatten_to_white(im):
    """Composite any transparency onto white, return RGB."""
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert("RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=256)
    ap.add_argument("--colors", type=int, default=256)
    args = ap.parse_args()

    total_before = total_after = count = 0

    # Channel avatars are 400x400 JPEGs shown at 52x52 in the food-feed chapter.
    # 160px keeps them crisp on retina at a fraction of the weight.
    avatars = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "relish", "public", "images", "channel_avatars"))
    jpgs = sorted(glob.glob(os.path.join(avatars, "*.jpg")))
    for p in jpgs:
        before = os.path.getsize(p)
        im = flatten_to_white(Image.open(p))
        if im.width > 160:
            im = im.resize((160, 160), Image.LANCZOS)
        im.save(p, "JPEG", quality=82, optimize=True, progressive=True)
        total_before += before
        total_after += os.path.getsize(p)
        count += 1
    print(f"{'channel_avatars':14} {len(jpgs)} avatars")

    for d in DIRS:
        d = os.path.abspath(d)
        pngs = sorted(glob.glob(os.path.join(d, "*.png")))
        for p in pngs:
            before = os.path.getsize(p)
            im = flatten_to_white(Image.open(p))
            if im.width > args.size or im.height > args.size:
                im = im.resize((args.size, args.size), Image.LANCZOS)
            pal = im.quantize(colors=args.colors, method=Image.FASTOCTREE,
                              dither=Image.FLOYDSTEINBERG)
            pal.save(p, optimize=True)
            after = os.path.getsize(p)
            total_before += before
            total_after += after
            count += 1
        print(f"{os.path.basename(d):14} {len(pngs)} icons")

    mb = lambda b: b / 1024 / 1024
    print(f"\n{count} icons · {mb(total_before):.1f}MB -> {mb(total_after):.2f}MB "
          f"({(1 - total_after / total_before) * 100:.0f}% smaller)")


if __name__ == "__main__":
    main()
