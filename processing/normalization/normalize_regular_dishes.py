#!/usr/bin/env python3
"""Normalise the everyday dish answers (one name, or null, per value).

Usage: ANTHROPIC_API_KEY=... python3 processing/normalization/normalize_regular_dishes.py
"""

import json
import os
import sys
import time
import urllib.request
from anthropic import Anthropic

API_URL = (os.environ.get("RELISH_API_URL") or "http://127.0.0.1:5000") + "/api/survey/filtered?surveyType=youth"
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
OUTPUT_PATH = os.path.join(DATA_DIR, "regular_dishes_normalized.json")
MODEL = "claude-haiku-4-5"
BATCH_SIZE = 80

SYSTEM_PROMPT = """You are a food/dish normalization expert. You will receive raw survey responses where people named "dishes they regularly eat."

Normalize each response into a single clean dish name.

RULES:
1. CASE: Title Case ("Chicken Stir Fry", "Lentil Soup", "Chicken Curry"). Preserve foreign names ("Arroz de Pato").
2. MERGE VARIANTS: "omelette"→"Omelette", "chilli con carne"/"Chilli Con Carne"→"Chilli Con Carne", "soups"→"Soup"
3. SINGULAR: "soups"→"Soup", "Vegetables"→stay as "Vegetables" (generic category is fine plural)
4. ONE dish per entry: Pick the main dish if multiple listed. "Rice, eggs, whatever is left" → "Rice Bowl" is wrong, just "Rice" or null if too vague. "couscous, peppers, feta, herbs" → "Couscous"
5. SIMPLIFY: "Lentil curry with spinach instead of chickpeas" → "Lentil Curry". "noodles with an egg, some greens and soy sauce" → "Noodle Bowl". Keep recognizable but trim excess.
6. REMOVE PARENTHETICAL: "Pea soup (only in winter)" → "Pea Soup"
7. FIX PUNCTUATION: "Soup." → "Soup", "Chicken curry." → "Chicken Curry"
8. MERGE SIMILAR: "Chicken curry" and "Curry chicken" are the SAME dish → normalize both to "Chicken Curry". "Chilli con carne" and "Chilli" → "Chilli Con Carne".
9. GENERIC OK: "Pasta", "Rice", "Soup", "Salad", "Chicken" are valid — these are everyday staples.
10. JUNK → null: gibberish, meta-commentary, single letters.

Respond ONLY with a JSON object: { "raw_value": "Normalized Dish" or null }"""

USER_PROMPT = """Normalize these raw regularly-eaten dish survey responses:

{items_json}"""


def fetch_survey_data():
    req = urllib.request.Request(API_URL)
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode('utf-8'))


def extract_raw(data):
    raw_counts = {}
    for r in data:
        for k in ['dish_1', 'dish_2', 'dish_3']:
            v = r.get(k)
            if not v or not isinstance(v, str) or not v.strip():
                continue
            t = v.strip()
            raw_counts[t] = raw_counts.get(t, 0) + 1
    return raw_counts


def normalize_batch(client, batch_items):
    items_json = json.dumps(batch_items, ensure_ascii=False, indent=1)
    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": USER_PROMPT.format(items_json=items_json)}]
    )
    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]
    return json.loads(raw)


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY env var")
        sys.exit(1)

    client = Anthropic(api_key=api_key)

    print("Fetching survey data...")
    data = fetch_survey_data()
    raw_counts = extract_raw(data)
    unique_values = sorted(raw_counts.keys(), key=lambda k: raw_counts[k], reverse=True)

    print(f"Total unique raw values: {len(unique_values)}")
    print(f"Total mentions: {sum(raw_counts.values())}")
    print()

    mapping = {}
    errors = []

    for batch_start in range(0, len(unique_values), BATCH_SIZE):
        batch = unique_values[batch_start:batch_start + BATCH_SIZE]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (len(unique_values) + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"[Batch {batch_num}/{total_batches}] Normalizing {len(batch)} values...", end=" ", flush=True)

        try:
            result = normalize_batch(client, batch)
            mapped = 0
            for raw_val in batch:
                if raw_val in result:
                    val = result[raw_val]
                    if isinstance(val, list):
                        val = val[0] if val else None
                    mapping[raw_val] = val
                    mapped += 1
                else:
                    mapping[raw_val] = raw_val.strip()
            print(f"done ({mapped}/{len(batch)} mapped)")

            if batch_start + BATCH_SIZE < len(unique_values):
                time.sleep(0.5)

        except json.JSONDecodeError as e:
            print(f"JSON error: {e}")
            errors.append(f"Batch {batch_num}: JSON error")
            for raw_val in batch:
                mapping[raw_val] = raw_val.strip()
        except Exception as e:
            print(f"Error: {e}")
            errors.append(f"Batch {batch_num}: {e}")
            for raw_val in batch:
                mapping[raw_val] = raw_val.strip()
            if "rate" in str(e).lower():
                print("  Rate limited — waiting 30s...")
                time.sleep(30)

    counts = {}
    for raw_val, normalized in mapping.items():
        if normalized is None:
            continue
        counts[normalized] = counts.get(normalized, 0) + raw_counts[raw_val]

    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump({"mapping": mapping, "counts": counts, "top": top}, f, indent=2, ensure_ascii=False)

    print(f"\n{'═' * 50}")
    print(f"Raw unique values: {len(unique_values)}")
    print(f"Normalized unique dishes: {len(counts)}")
    print(f"Excluded (null): {sum(1 for v in mapping.values() if v is None)}")
    print(f"Errors: {len(errors)}")
    print(f"Output: {OUTPUT_PATH}")
    print(f"\nTop 20:")
    for name, count in top[:20]:
        print(f"  {count:3d}x  {name}")


if __name__ == "__main__":
    main()
