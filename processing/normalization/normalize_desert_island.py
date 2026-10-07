#!/usr/bin/env python3
"""Normalise the desert island dish answers (one name, or null, per value).

Usage: ANTHROPIC_API_KEY=... python3 processing/normalization/normalize_desert_island.py
"""

import json
import os
import sys
import time
import urllib.request
from anthropic import Anthropic

API_URL = (os.environ.get("RELISH_API_URL") or "http://127.0.0.1:5000") + "/api/survey/filtered?surveyType=youth"
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
OUTPUT_PATH = os.path.join(DATA_DIR, "desert_island_normalized.json")
MODEL = "claude-haiku-4-5"
BATCH_SIZE = 80

SYSTEM_PROMPT = """You are a food/dish normalization expert. You will receive raw survey responses to: "You're stuck on a desert island and can only eat one dish, what would it be?"

Normalize each response into a single clean dish name.

RULES:
1. CASE: Title Case ("Pasta", "Margherita Pizza"). Preserve foreign names ("Bibimbap").
2. MERGE VARIANTS: "pasta"→"Pasta", "risotto."→"Risotto", "ramen"/"Ramen"→"Ramen", "gnocchi"/"Gnocchi"→"Gnocchi"
3. ONE dish: "Ramen or pizza" → "Ramen". "Rice , beans , plantain" → "Rice". Pick the FIRST/main dish.
4. SIMPLIFY: "Pasta with pesto" → "Pasta". "grilled salmon with potatoes" → "Salmon". "margherita pizza" → "Margherita Pizza" (keep if it adds meaningful specificity).
5. REMOVE COMMENTARY: "Hard one, probably ramen with an egg" → "Ramen". "Rice - it goes with everything" → "Rice".
6. REMOVE PARENTHETICAL: "burritos (beans, rice, cheese)" → "Burritos". "pho (noodle soup)" → "Pho".
7. FIX PUNCTUATION: "Sushi." → "Sushi", "curry." → "Curry"
8. LONG DESCRIPTIONS → simplify: "A big bowl of greens with chicken, nuts and seeds" → "Salad". "Crispy Tofu with Rice and Greens" → "Crispy Tofu with Rice".
9. JUNK → null: gibberish, empty answers, non-food.
10. GENERIC OK: "Pasta", "Rice", "Fish", "Chicken" are valid answers.

Respond ONLY with a JSON object: { "raw_value": "Normalized Dish" or null }"""

USER_PROMPT = """Normalize these desert island food responses:

{items_json}"""


def fetch_survey_data():
    req = urllib.request.Request(API_URL)
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode('utf-8'))


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY env var")
        sys.exit(1)

    client = Anthropic(api_key=api_key)

    print("Fetching survey data...")
    data = fetch_survey_data()
    raw_counts = {}
    for r in data:
        v = r.get('desert_island_food')
        if not v or not isinstance(v, str) or not v.strip():
            continue
        t = v.strip()
        raw_counts[t] = raw_counts.get(t, 0) + 1

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
            items_json = json.dumps(batch, ensure_ascii=False, indent=1)
            message = client.messages.create(
                model=MODEL, max_tokens=4096, system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": USER_PROMPT.format(items_json=items_json)}]
            )
            raw = message.content[0].text.strip()
            if raw.startswith("```"): raw = raw.split("\n", 1)[1]
            if raw.endswith("```"): raw = raw.rsplit("```", 1)[0]
            result = json.loads(raw)

            mapped = 0
            for raw_val in batch:
                if raw_val in result:
                    val = result[raw_val]
                    if isinstance(val, list): val = val[0] if val else None
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
                time.sleep(30)

    counts = {}
    for raw_val, normalized in mapping.items():
        if normalized is None: continue
        counts[normalized] = counts.get(normalized, 0) + raw_counts[raw_val]

    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump({"mapping": mapping, "counts": counts, "top": top}, f, indent=2, ensure_ascii=False)

    print(f"\n{'═' * 50}")
    print(f"Raw unique: {len(unique_values)}")
    print(f"Normalized unique: {len(counts)}")
    print(f"Excluded: {sum(1 for v in mapping.values() if v is None)}")
    print(f"Errors: {len(errors)}")
    print(f"Output: {OUTPUT_PATH}")
    print(f"\nTop 15:")
    for name, count in top[:15]:
        print(f"  {count:3d}x  {name}")


if __name__ == "__main__":
    main()
