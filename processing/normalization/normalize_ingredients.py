#!/usr/bin/env python3
"""Normalise the iconic ingredient answers (one value can name several ingredients).

Usage: ANTHROPIC_API_KEY=... python3 processing/normalization/normalize_ingredients.py
"""

import json
import os
import sys
import time
import urllib.request
from anthropic import Anthropic

API_URL = (os.environ.get("RELISH_API_URL") or "http://127.0.0.1:5000") + "/api/survey/filtered?surveyType=youth"
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
OUTPUT_PATH = os.path.join(DATA_DIR, "ingredients_normalized.json")
MODEL = "claude-haiku-4-5"
BATCH_SIZE = 80

SYSTEM_PROMPT = """You are a food/ingredient normalization expert. You will receive a list of raw survey responses where people were asked to name "iconic ingredients from their food culture."

Your job is to normalize each response into clean, standardized ingredient name(s).

RULES:
1. CASE: Title Case (e.g., "Olive Oil", "Black Pepper", "Soy Sauce")
2. SINGULAR: Always singular form ("Potato" not "Potatoes", "Tomato" not "Tomatoes", "Egg" not "Eggs", "Onion" not "Onions")
3. MERGE VARIANTS: "garlick"→"Garlic", "Blackpepper"→"Black Pepper", "black-pepper"→"Black Pepper", "chillie"→"Chilli"
4. SPLIT LISTS: If one response contains multiple ingredients separated by commas, slashes, "and", or similar, split into separate items. E.g., "Lentils, onion and cumin" → ["Lentil", "Onion", "Cumin"]
5. EXTRACT FROM DESCRIPTIONS: "greens such as kale or chard" → ["Kale", "Chard"]. "Herbs like dill, or blends like Herbes de Provence" → ["Dill", "Herbes de Provence"]
6. SIMPLIFY PARENTHETICAL: "gochujang (chilli paste)" → "Gochujang". "pimentón (smoked paprika)" → "Pimentón". Keep the specific/local name, drop the explanation.
7. SIMPLIFY QUALIFIERS: "Organic Free-Range Eggs" → "Egg". "Greek Mountain Oregano" → "Oregano". Drop unnecessary nationality/brand qualifiers but keep meaningful ones.
8. DISHES → null: If it's a dish not an ingredient (e.g., "Pizza", "Lasagna", "Paella", "creamy mushroom soup", "chicken with lemon sauce"), return null.
9. JUNK → null: If it's not a real answer (descriptions, complaints, meta-commentary like "honestly nothing special"), return null.
10. KEEP SPECIFICITY: "Parmesan" stays "Parmesan" (don't generalize to "Cheese"). "Lamb" stays "Lamb" (don't generalize to "Meat"). But "meat" → "Meat" is fine.
11. REGIONAL INGREDIENTS: Keep them as-is with proper casing. "za'atar" → "Za'atar", "Sauerkraut" → "Sauerkraut", "miso" → "Miso".

Respond ONLY with a JSON object mapping each raw input to either:
- A list of normalized ingredient strings: ["Ingredient1", "Ingredient2"]
- null if it should be excluded (junk/dishes)

No markdown, no commentary, just the JSON object."""

USER_PROMPT = """Normalize these raw ingredient survey responses:

{items_json}"""


def fetch_survey_data():
    req = urllib.request.Request(API_URL)
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode('utf-8'))


def extract_raw_ingredients(data):
    raw_counts = {}
    for r in data:
        for k in ['ingredient_1', 'ingredient_2', 'ingredient_3']:
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
    raw_counts = extract_raw_ingredients(data)
    unique_values = sorted(raw_counts.keys(), key=lambda k: raw_counts[k], reverse=True)

    print(f"Total unique raw values: {len(unique_values)}")
    print(f"Total mentions: {sum(raw_counts.values())}")
    print()

    # Process in batches
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
                    mapping[raw_val] = result[raw_val]
                    mapped += 1
                else:
                    mapping[raw_val] = [raw_val.strip().title()]
            print(f"done ({mapped}/{len(batch)} mapped)")

            if batch_start + BATCH_SIZE < len(unique_values):
                time.sleep(0.5)

        except json.JSONDecodeError as e:
            print(f"JSON error: {e}")
            errors.append(f"Batch {batch_num}: JSON error")
            for raw_val in batch:
                mapping[raw_val] = [raw_val.strip().title()]
        except Exception as e:
            print(f"Error: {e}")
            errors.append(f"Batch {batch_num}: {e}")
            for raw_val in batch:
                mapping[raw_val] = [raw_val.strip().title()]
            if "rate" in str(e).lower():
                print("  Rate limited — waiting 30s...")
                time.sleep(30)

    # Aggregate counts
    counts = {}
    for raw_val, normalized_list in mapping.items():
        if normalized_list is None:
            continue
        raw_count = raw_counts[raw_val]
        for norm in normalized_list:
            counts[norm] = counts.get(norm, 0) + raw_count

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
    print(f"Normalized unique ingredients: {len(counts)}")
    print(f"Excluded (null): {sum(1 for v in mapping.values() if v is None)}")
    print(f"Errors: {len(errors)}")
    print(f"Output: {OUTPUT_PATH}")
    print(f"\nTop 20:")
    for name, count in top[:20]:
        print(f"  {count:3d}x  {name}")


if __name__ == "__main__":
    main()
