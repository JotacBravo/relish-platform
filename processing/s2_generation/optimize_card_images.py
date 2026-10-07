#!/usr/bin/env python3
"""Write web-sized WebP copies of the card illustrations and their manifest.json.

Usage: python3 processing/s2_generation/optimize_card_images.py [--force]
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone

from PIL import Image

_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output")
SRC_DIR = (os.environ.get("STORY_IMAGES_DIR") or os.path.join(_OUT, "images", "story_cards"))
WEB_DIR = (os.environ.get("STORY_IMAGES_WEB_DIR") or os.path.join(_OUT, "images", "story_cards_web"))
TARGET_W = 720          # card tops out ~520px (modal); 720 stays crisp at ~2x
QUALITY = 80            # WebP quality; illustrations stay crisp well below this
_NAME_RE = re.compile(r"^story_(\d+)\.png$")


def optimise_one(index, force=False):
    """Write story_<index>.webp from the master PNG. Returns (ok, bytes, skipped)."""
    src = os.path.join(SRC_DIR, f"story_{index}.png")
    dst = os.path.join(WEB_DIR, f"story_{index}.webp")
    if not os.path.exists(src):
        return (False, 0, False)
    if (not force and os.path.exists(dst)
            and os.path.getmtime(dst) >= os.path.getmtime(src)):
        return (True, os.path.getsize(dst), True)
    os.makedirs(WEB_DIR, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGB")
        if im.width > TARGET_W:
            h = round(im.height * TARGET_W / im.width)
            im = im.resize((TARGET_W, h), Image.LANCZOS)
        im.save(dst, "WEBP", quality=QUALITY, method=6)
    return (True, os.path.getsize(dst), False)


def write_manifest():
    """List every story_<n>.webp present and record it in manifest.json."""
    os.makedirs(WEB_DIR, exist_ok=True)
    indices = sorted(
        int(m.group(1))
        for f in os.listdir(WEB_DIR)
        if (m := re.match(r"^story_(\d+)\.webp$", f))
    )
    manifest = {
        "indices": indices,
        "count": len(indices),
        "target_width": TARGET_W,
        "generated": datetime.now(timezone.utc).isoformat(),
    }
    with open(os.path.join(WEB_DIR, "manifest.json"), "w") as fh:
        json.dump(manifest, fh)
    return indices


def all_source_indices():
    if not os.path.isdir(SRC_DIR):
        return []
    return sorted(
        int(m.group(1))
        for f in os.listdir(SRC_DIR)
        if (m := _NAME_RE.match(f))
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="rebuild even if up to date")
    ap.add_argument("--indices", help="comma-separated subset, e.g. 1,2,3")
    args = ap.parse_args()

    if args.indices:
        idxs = [int(x) for x in args.indices.split(",") if x.strip()]
    else:
        idxs = all_source_indices()

    total_bytes = made = skipped = missing = 0
    for i in idxs:
        ok, nbytes, was_skip = optimise_one(i, force=args.force)
        if not ok:
            missing += 1
            continue
        total_bytes += nbytes
        if was_skip:
            skipped += 1
        else:
            made += 1
            if made % 25 == 0:
                print(f"  ... {made} written", flush=True)

    indices = write_manifest()
    print(f"done: {made} written, {skipped} up-to-date, {missing} missing source; "
          f"{len(indices)} in manifest; "
          f"total web payload {total_bytes/1024/1024:.1f} MB "
          f"(avg {total_bytes/max(len(indices),1)/1024:.0f} KB/img)")


if __name__ == "__main__":
    sys.exit(main())
