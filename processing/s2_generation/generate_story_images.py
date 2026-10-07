#!/usr/bin/env python3
"""Paint the card illustrations with Imagen 3 on Vertex AI (skips existing ones).

Usage: python3 processing/s2_generation/generate_story_images.py [--limit N] [--indices 1,11] [--force]
"""

import json
import os
import sys
import time
import base64
import urllib.request
import urllib.parse
import argparse

# Config
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
CARDS_PATH = os.path.join(DATA_DIR, "story_cards.json")
IMAGES_DIR = (os.environ.get("STORY_IMAGES_DIR") or os.path.join(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"), "images", "story_cards"))
CREDENTIALS_PATH = (os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or "")
LOCATION = (os.environ.get("IMAGEN_LOCATION") or "us-central1")
MODEL = (os.environ.get("IMAGEN_MODEL") or "imagen-3.0-generate-002")

# {description} is the card's image_prompt; only the medium is fixed.
PROMPT_TEMPLATE = 'Gouache illustration, set in the year 2050: {description}. Food magazine editorial style, no text, no logos'


def load_cards():
    if not os.path.exists(CARDS_PATH):
        print(f"ERROR: {CARDS_PATH} not found. Run generate_story_cards.py first.")
        sys.exit(1)
    with open(CARDS_PATH, "r") as f:
        return json.load(f)


def get_existing_images():
    if not os.path.exists(IMAGES_DIR):
        return set()
    existing = set()
    for fname in os.listdir(IMAGES_DIR):
        if fname.startswith("story_") and fname.endswith(".png"):
            try:
                idx = int(fname.replace("story_", "").replace(".png", ""))
                existing.add(idx)
            except ValueError:
                pass
    return existing


def get_access_token():
    """Get OAuth2 access token using service account JWT."""
    import jwt as pyjwt

    if not CREDENTIALS_PATH or not os.path.exists(CREDENTIALS_PATH):
        print("ERROR: set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON key file")
        sys.exit(1)

    with open(CREDENTIALS_PATH) as f:
        creds = json.load(f)

    now = int(time.time())
    payload = {
        'iss': creds['client_email'],
        'sub': creds['client_email'],
        'aud': 'https://oauth2.googleapis.com/token',
        'iat': now,
        'exp': now + 3600,
        'scope': 'https://www.googleapis.com/auth/cloud-platform'
    }
    signed = pyjwt.encode(payload, creds['private_key'], algorithm='RS256')

    token_req = urllib.request.Request(
        'https://oauth2.googleapis.com/token',
        data=urllib.parse.urlencode({
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': signed
        }).encode(),
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    token_resp = json.loads(urllib.request.urlopen(token_req).read())
    return token_resp['access_token'], creds['project_id']


def generate_image(prompt, output_path, access_token, project_id):
    """Generate a single image via Vertex AI Imagen API."""
    url = (
        f'https://{LOCATION}-aiplatform.googleapis.com/v1/'
        f'projects/{project_id}/locations/{LOCATION}/'
        f'publishers/google/models/{MODEL}:predict'
    )
    full_prompt = PROMPT_TEMPLATE.format(description=prompt)

    body = json.dumps({
        "instances": [{"prompt": full_prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "3:4",
            "safetySetting": "block_only_high",
            "personGeneration": "allow_adult"
        }
    }).encode()

    req = urllib.request.Request(url, data=body, headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    })
    resp = urllib.request.urlopen(req, timeout=90)
    data = json.loads(resp.read())

    if 'predictions' not in data or not data['predictions']:
        raise RuntimeError("No image returned — prompt may have been blocked by safety filter")

    img_bytes = base64.b64decode(data['predictions'][0]['bytesBase64Encoded'])
    with open(output_path, 'wb') as f:
        f.write(img_bytes)
    return len(img_bytes)


def main():
    parser = argparse.ArgumentParser(description="Generate story card images")
    parser.add_argument("--limit", type=int, help="Max number of images to generate")
    parser.add_argument("--indices", type=str, help="Comma-separated story indices to generate")
    parser.add_argument("--force", action="store_true", help="Regenerate even if the image already exists (overwrites in place)")
    parser.add_argument("--sleep", type=float, default=5, help="Seconds to wait between requests (raise to avoid 429s)")
    args = parser.parse_args()

    os.makedirs(IMAGES_DIR, exist_ok=True)

    cards = load_cards()
    existing = get_existing_images()
    if args.force:
        existing = set()  # regenerate everything (outdated v1 images → v2 prompts)
    print(f"Total story cards: {len(cards)}")
    print(f"Images already generated: {len(existing)}")

    # Skip cards that shouldn't be painted: hidden/off-topic (relevant == False)
    # and any without an image prompt. These never appear in the public deck, so
    # generating an image for them just wastes an Imagen call (and errors out).
    def paintable(c):
        return c.get("relevant") is not False and c.get("hidden") is not True and bool(c.get("image_prompt"))

    # Filter to only new, paintable stories
    to_generate = [c for c in cards if c["story_index"] not in existing and paintable(c)]

    # Apply filters (an explicit --indices request still honours paintability)
    if args.indices:
        target = set(int(x) for x in args.indices.split(","))
        to_generate = [c for c in cards if c["story_index"] in target and c["story_index"] not in existing and paintable(c)]

    if args.limit:
        to_generate = to_generate[:args.limit]

    if not to_generate:
        print("✓ All images already generated. Nothing to do.")
        return

    print(f"Images to generate: {len(to_generate)}")
    print(f"Model: {MODEL}")
    print(f"Location: {LOCATION}")
    print()

    # Get access token once (valid for 1 hour)
    print("Authenticating with service account...", flush=True)
    access_token, project_id = get_access_token()
    print(f"✓ Authenticated for project: {project_id}")
    print()

    errors = []
    for i, card in enumerate(to_generate):
        idx = card["story_index"]
        prompt = card.get("image_prompt", "")
        output_path = os.path.join(IMAGES_DIR, f"story_{idx}.png")

        # OAuth tokens expire after 1h; refresh periodically so long batches don't
        # start failing with 401 partway through.
        if i > 0 and i % 45 == 0:
            print("  ↻ refreshing access token...", flush=True)
            access_token, project_id = get_access_token()

        print(f'[{i+1}/{len(to_generate)}] #{idx} "{card.get("title", "?")}"', flush=True)

        if not prompt:
            print("  ✗ No image prompt, skipping")
            errors.append({"index": idx, "error": "No image prompt"})
            continue

        try:
            size = generate_image(prompt, output_path, access_token, project_id)
            print(f"  ✓ Saved ({size // 1024}KB)")

            if i < len(to_generate) - 1:
                time.sleep(args.sleep)

        except Exception as e:
            err_body = ''
            try:
                err_body = e.read().decode()[:200] if hasattr(e, 'read') else ''
            except:
                pass
            print(f"  ✗ {e} {err_body}")
            errors.append({"index": idx, "error": str(e)})
            if "quota" in str(e).lower() or "rate" in str(e).lower() or "429" in str(e):
                print("  Rate limited — waiting 60s...")
                time.sleep(60)

    print()
    print(f"═══ Done ═══")
    print(f"  Generated: {len(to_generate) - len(errors)}/{len(to_generate)} images")
    print(f"  Total images: {len(existing) + len(to_generate) - len(errors)}")
    print(f"  Errors: {len(errors)}")
    if errors:
        print(f"  Failed indices: {[e['index'] for e in errors]}")
    print(f"  Output folder: {IMAGES_DIR}")


if __name__ == "__main__":
    main()
