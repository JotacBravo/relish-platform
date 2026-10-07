#!/usr/bin/env python3
"""Draw a dishes_v2 icon (Imagen 3) for each desert island dish that has none.

Usage: python3 processing/icons/generate_menu_icons.py [--limit N] [--sleep 5]
"""

import os
import re
import sys
import json
import time
import base64
import argparse
import urllib.request
import urllib.parse

CREDENTIALS_PATH = (os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or "")
LOCATION = (os.environ.get("IMAGEN_LOCATION") or "us-central1")
MODEL = (os.environ.get("IMAGEN_MODEL") or "imagen-3.0-generate-002")
API = (os.environ.get("RELISH_API_URL") or "http://127.0.0.1:5000") + "/api/survey/filtered?surveyType=youth"
ICONS_DIR = (os.environ.get("MENU_ICONS_DIR") or os.path.join(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."), "relish", "public", "icons", "dishes_v2"))
MANIFEST = os.path.join(ICONS_DIR, "manifest.json")

PROMPT_TEMPLATE = (
    "A single flat vector icon of {dish}, centered on a pure white background. "
    "Minimal detail, soft rounded shapes, no outline, subtle shadows. "
    "Use the natural realistic colors of this specific food — vibrant and distinct. "
    "Top-down 3/4 view. No text, no plate, no utensils, no decoration. "
    "Square canvas, subject fills 80% of the frame."
)

DISH_SPELLING = {"lasagne": "lasagna", "spagetti": "spaghetti"}


def norm_food(s):
    n = re.sub(r"[^a-zà-ú\s]", "", str(s or "").lower().strip())
    n = re.sub(r"\s+", " ", n).strip()
    return " ".join(DISH_SPELLING.get(w, w) for w in n.split(" ")) if n else ""


def cap(s):
    return s[0].upper() + s[1:] if s else s


def sanitize(name):
    return re.sub(r"[^a-z0-9_]", "_", name.lower().strip()).strip("_")


def get_access_token():
    import jwt as pyjwt
    if not CREDENTIALS_PATH or not os.path.exists(CREDENTIALS_PATH):
        print("ERROR: set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON key file")
        sys.exit(1)
    with open(CREDENTIALS_PATH) as f:
        creds = json.load(f)
    now = int(time.time())
    payload = {
        "iss": creds["client_email"], "sub": creds["client_email"],
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now, "exp": now + 3600,
        "scope": "https://www.googleapis.com/auth/cloud-platform",
    }
    signed = pyjwt.encode(payload, creds["private_key"], algorithm="RS256")
    if isinstance(signed, bytes):
        signed = signed.decode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=urllib.parse.urlencode({
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": signed,
        }).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    resp = json.loads(urllib.request.urlopen(req).read())
    return resp["access_token"], creds["project_id"]


def generate_image(dish, output_path, token, project_id):
    url = (f"https://{LOCATION}-aiplatform.googleapis.com/v1/"
           f"projects/{project_id}/locations/{LOCATION}/"
           f"publishers/google/models/{MODEL}:predict")
    body = json.dumps({
        "instances": [{"prompt": PROMPT_TEMPLATE.format(dish=dish)}],
        "parameters": {"sampleCount": 1, "aspectRatio": "1:1",
                       "safetySetting": "block_only_high", "personGeneration": "dont_allow"},
    }).encode()
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    data = json.loads(urllib.request.urlopen(req, timeout=90).read())
    if not data.get("predictions"):
        raise RuntimeError("no image returned (safety filter?)")
    img = base64.b64decode(data["predictions"][0]["bytesBase64Encoded"])
    with open(output_path, "wb") as f:
        f.write(img)
    return len(img)


def menu_missing(manifest):
    raw = json.loads(urllib.request.urlopen(API, timeout=30).read())
    counts = {}
    for r in raw:
        resp = r.get("responses", r)
        di = norm_food(resp.get("desert_island_food"))
        if di:
            counts[di] = counts.get(di, 0) + 1
    menu = sorted([(k, c) for k, c in counts.items() if c >= 2], key=lambda x: -x[1])
    missing = [(k, c) for k, c in menu if not (manifest.get(cap(k)) or manifest.get(k))]
    return menu, missing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int)
    ap.add_argument("--sleep", type=float, default=5)
    args = ap.parse_args()

    with open(MANIFEST) as f:
        manifest = json.load(f)

    menu, missing = menu_missing(manifest)
    if args.limit:
        missing = missing[:args.limit]
    print(f"Menu dishes: {len(menu)} · to generate: {len(missing)}")
    if not missing:
        return

    token, project_id = get_access_token()
    print(f"Vertex project: {project_id}\n")

    ok, errors = 0, []
    for i, (key, count) in enumerate(missing):
        name = cap(key)
        fname = sanitize(key) + ".png"
        print(f"  [{i+1}/{len(missing)}] {name} ({count}x) -> {fname} ...", end=" ", flush=True)
        try:
            size = generate_image(name, os.path.join(ICONS_DIR, fname), token, project_id)
            manifest[name] = fname
            with open(MANIFEST, "w") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
                f.write("\n")
            print(f"ok ({size // 1024}KB)")
            ok += 1
        except Exception as e:
            print(f"FAILED: {e}")
            errors.append(f"{name}: {e}")
            if "429" in str(e) or "quota" in str(e).lower():
                print("  rate limited, waiting 30s..."); time.sleep(30)
        if i + 1 < len(missing):
            time.sleep(args.sleep)

    print(f"\nGenerated {ok}/{len(missing)}. Manifest now has {len(manifest)} entries.")
    for e in errors:
        print("  " + e)


if __name__ == "__main__":
    main()
