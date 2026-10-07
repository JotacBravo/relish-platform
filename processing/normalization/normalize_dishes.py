#!/usr/bin/env python3
"""Normalise the iconic dish answers (one name, or null, per value).

Usage: ANTHROPIC_API_KEY=... python3 processing/normalization/normalize_dishes.py
"""

import json
import os
import sys
import time
import urllib.request
from anthropic import Anthropic

API_URL = (os.environ.get("RELISH_API_URL") or "http://127.0.0.1:5000") + "/api/survey/filtered?surveyType=youth"
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
OUTPUT_PATH = os.path.join(DATA_DIR, "dishes_normalized.json")
MODEL = "claude-haiku-4-5"
BATCH_SIZE = 80

SYSTEM_PROMPT = """You are a food/dish normalization expert. You will receive a list of raw survey responses where people were asked to name "iconic dishes from their food culture."

Your job is to normalize each response into a single clean, standardized dish name.

RULES:
1. CASE: Title Case for common names ("Shepherd's Pie", "Roast Dinner"). Preserve original casing for proper nouns and foreign names ("Arroz de Pato", "Coq au Vin", "Pastel de Nata").
2. MERGE VARIANTS: case differences ("moussaka"→"Moussaka"), minor spelling ("tiramisù"/"tiramisu"→"Tiramisu")
3. DO NOT SPLIT: Each response maps to exactly ONE dish name (string), not a list. If someone wrote "moussaka, or my aunt's version with lentils" → "Moussaka". Pick the main dish.
4. SIMPLIFY DESCRIPTIONS: "Roast Chicken with Potatoes, Carrots and Gravy" → "Roast Chicken with Potatoes". Keep it recognizable but remove excessive detail.
5. KEEP PARENTHETICAL NAMES: "Pierogi (dumplings)" → "Pierogi". "kartoffelsalat - potato salad" → "Kartoffelsalat". Keep the specific/local name, drop the translation.
6. REGIONAL DISHES: Keep them with proper casing. "arroz de pato" → "Arroz de Pato", "coq au vin" → "Coq au Vin", "pastel de nata" → "Pastel de Nata".
7. JUNK → null: If it's not a real dish (gibberish, meta-commentary, single ingredients like just "potato"), return null.
8. GENERIC → keep: "Stew", "Curry", "Roast Dinner" are valid dish names, keep them.
9. TYPOS: Fix obvious typos ("Spagetti Bolognese" → "Spaghetti Bolognese").
10. ONE dish per entry: The output for each raw value is either a single string or null. NEVER return an array.

Respond ONLY with a JSON object mapping each raw input to either:
- A single normalized dish name string: "Dish Name"
- null if it should be excluded

No markdown, no commentary, just the JSON object."""

USER_PROMPT = """Normalize these raw iconic dish survey responses:

{items_json}"""


def fetch_survey_data():
    req = urllib.request.Request(API_URL)
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode('utf-8'))


def extract_raw_dishes(data):
    raw_counts = {}
    for r in data:
        for k in ['iconic_dish_1', 'iconic_dish_2', 'iconic_dish_3']:
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
    raw_counts = extract_raw_dishes(data)
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
                    # Ensure it's a string or null, never an array
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

    # Aggregate counts
    counts = {}
    for raw_val, normalized in mapping.items():
        if normalized is None:
            continue
        raw_count = raw_counts[raw_val]
        counts[normalized] = counts.get(normalized, 0) + raw_count

    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)

    output = {
        "mapping": mapping,
        "counts": counts,
        "top": top,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

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
