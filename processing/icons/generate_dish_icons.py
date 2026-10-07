#!/usr/bin/env python3
"""Draw a flat icon (Gemini) for each frequent everyday dish that has none.

Usage: GEMINI_API_KEY=... python3 processing/icons/generate_dish_icons.py
"""

import json
import os
import sys
import time
import base64
import urllib.request
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
NORMALIZED_PATH = os.path.join(DATA_DIR, "regular_dishes_normalized.json")
ICONS_DIR = (os.environ.get("DISH_ICONS_DIR") or os.path.join(ROOT, "relish", "public", "icons", "dishes"))
MIN_COUNT = 5
MODEL = "gemini-2.5-flash-image"

PROMPT_TEMPLATE = (
    "Generate an image: A single flat vector icon of {dish}, centered on a pure white background. "
    "Minimal detail, soft rounded shapes, no outline, subtle shadows. "
    "Use the natural realistic colors of this specific food — vibrant and distinct. "
    "Top-down 3/4 view. No text, no plate, no utensils, no decoration. "
    "Square canvas, subject fills 80% of the frame."
)


def sanitize_filename(name):
    return re.sub(r'[^a-z0-9_]', '_', name.lower().strip()).strip('_')


def generate_icon(api_key, dish_name, output_path):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": PROMPT_TEMPLATE.format(dish=dish_name)}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=90)
    result = json.loads(resp.read())

    for part in result.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        if "inlineData" in part:
            img_data = base64.b64decode(part["inlineData"]["data"])
            with open(output_path, "wb") as f:
                f.write(img_data)
            return len(img_data)
    return 0


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: Set GEMINI_API_KEY env var")
        sys.exit(1)

    os.makedirs(ICONS_DIR, exist_ok=True)

    with open(NORMALIZED_PATH) as f:
        data = json.load(f)

    counts = data["counts"]
    dishes = sorted(
        [(name, count) for name, count in counts.items() if count >= MIN_COUNT],
        key=lambda x: x[1], reverse=True
    )
    print(f"Dishes with >= {MIN_COUNT} responses: {len(dishes)}")

    generated = 0
    skipped = 0
    errors = []

    for i, (dish, count) in enumerate(dishes):
        filename = sanitize_filename(dish) + ".png"
        filepath = os.path.join(ICONS_DIR, filename)

        if os.path.exists(filepath):
            print(f"  [{i+1}/{len(dishes)}] {dish} ({count}x) — already exists, skipping")
            skipped += 1
            continue

        print(f"  [{i+1}/{len(dishes)}] {dish} ({count}x) — generating...", end=" ", flush=True)
        try:
            size = generate_icon(api_key, dish, filepath)
            print(f"done ({size // 1024}KB)")
            generated += 1
            if i + 1 < len(dishes):
                time.sleep(1)
        except Exception as e:
            print(f"ERROR: {e}")
            errors.append(f"{dish}: {e}")
            if "rate" in str(e).lower() or "429" in str(e):
                print("  Rate limited, waiting 30s...")
                time.sleep(30)

    # Save icon manifest (dish -> filename mapping)
    manifest = {}
    for dish, count in dishes:
        filename = sanitize_filename(dish) + ".png"
        if os.path.exists(os.path.join(ICONS_DIR, filename)):
            manifest[dish] = filename

    manifest_path = os.path.join(ICONS_DIR, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\n{'═' * 50}")
    print(f"Generated: {generated}")
    print(f"Skipped (already existed): {skipped}")
    print(f"Errors: {len(errors)}")
    print(f"Manifest: {manifest_path} ({len(manifest)} entries)")
    if errors:
        print("\nFailed:")
        for e in errors:
            print(f"  {e}")


if __name__ == "__main__":
    main()
