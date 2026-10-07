#!/usr/bin/env python3
"""Draw a flat icon (Gemini) for each frequent ingredient with footprint data and no icon.

Usage: GEMINI_API_KEY=... python3 processing/icons/generate_ingredient_icons.py
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
NORMALIZED_PATH = os.path.join(DATA_DIR, "ingredients_normalized.json")
SUST_PATH = os.path.join(ROOT, "relish", "src", "dashboards", "data", "sustainability_portions.json")
ICONS_DIR = (os.environ.get("INGREDIENT_ICONS_DIR") or os.path.join(ROOT, "relish", "public", "icons", "ingredients"))
MIN_COUNT = 4
MODEL = "gemini-2.5-flash-image"

PROMPT_TEMPLATE = (
    "Generate an image: A single flat vector icon of {ingredient}, centered on a pure white background. "
    "Minimal detail, soft rounded shapes, no outline, subtle shadows. "
    "Use the natural realistic colors of this specific food — vibrant and distinct. "
    "Top-down 3/4 view. No text, no plate, no utensils, no decoration. "
    "Square canvas, subject fills 80% of the frame."
)


def sanitize_filename(name):
    return re.sub(r'[^a-z0-9_]', '_', name.lower().strip()).strip('_')


def generate_icon(api_key, ingredient_name, output_path):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": PROMPT_TEMPLATE.format(ingredient=ingredient_name)}]}],
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
        ing_data = json.load(f)

    with open(SUST_PATH) as f:
        sust_data = json.load(f)

    counts = ing_data.get("counts", {})
    with_footprint = {i["name"] for i in sust_data.get("ingredients", [])}

    # Filter: count > MIN_COUNT and has footprint data
    ingredients = sorted(
        [(name, count) for name, count in counts.items()
         if count > MIN_COUNT and name in with_footprint],
        key=lambda x: x[1], reverse=True
    )
    print(f"Ingredients with > {MIN_COUNT} responses and footprint data: {len(ingredients)}")

    generated = 0
    skipped = 0
    errors = []

    for i, (ingredient, count) in enumerate(ingredients):
        filename = sanitize_filename(ingredient) + ".png"
        filepath = os.path.join(ICONS_DIR, filename)

        if os.path.exists(filepath):
            print(f"  [{i+1}/{len(ingredients)}] {ingredient} ({count}x) — already exists, skipping")
            skipped += 1
            continue

        print(f"  [{i+1}/{len(ingredients)}] {ingredient} ({count}x) — generating...", end=" ", flush=True)
        try:
            size = generate_icon(api_key, ingredient, filepath)
            print(f"done ({size // 1024}KB)")
            generated += 1
            if i + 1 < len(ingredients):
                time.sleep(1)
        except Exception as e:
            print(f"ERROR: {e}")
            errors.append(f"{ingredient}: {e}")
            if "rate" in str(e).lower() or "429" in str(e):
                print("  Rate limited, waiting 30s...")
                time.sleep(30)

    # Save icon manifest (ingredient -> filename mapping)
    manifest = {}
    for ingredient, count in ingredients:
        filename = sanitize_filename(ingredient) + ".png"
        if os.path.exists(os.path.join(ICONS_DIR, filename)):
            manifest[ingredient] = filename

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
