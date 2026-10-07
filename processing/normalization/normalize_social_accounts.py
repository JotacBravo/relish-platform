#!/usr/bin/env python3
"""Normalise the social media accounts named in the Youth survey (comma-separated).

Usage: ANTHROPIC_API_KEY=... python3 processing/normalization/normalize_social_accounts.py
"""

import json
import os
import re
import sys
import time
import urllib.request
from anthropic import Anthropic

API_URL = (os.environ.get("RELISH_API_URL") or "http://127.0.0.1:5000") + "/api/survey/filtered?surveyType=youth"
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
OUTPUT_PATH = os.path.join(DATA_DIR, "social_accounts_normalized.json")
MODEL = "claude-haiku-4-5"
BATCH_SIZE = 80

SYSTEM_PROMPT = """You are a social media normalization expert. You will receive a list of raw survey responses where people named "food/cooking/nutrition accounts they follow on social media". Each entry is ONE account (the answers were already split on commas).

Your job is to normalize each entry into the account's display name.

RULES:
1. DISPLAY NAME: Return the creator's or channel's name as they brand themselves, not the handle ("@greenpotdiaries" → "Green Pot Diaries", "nonnas_notebook" → "Nonna's Notebook").
2. MERGE VARIANTS: case, spaces, dots, underscores, a leading "@" and spelling all fold onto one name ("five.euro.feasts", "Five Euro Feasts", "fiveeurofeasts" → "Five Euro Feasts").
3. DROP PLATFORM WRAPPERS: platform prefixes, suffixes and URLs are not part of the name ("TikTok: @onepanstudio" → "One Pan Studio", "spice atlas on youtube" → "Spice Atlas", "https://www.youtube.com/@seatotable" → "Sea to Table").
4. ONE account per entry: the output for each raw value is a single string or null. NEVER return an array. If an entry still names two accounts, keep the first.
5. UNKNOWN ACCOUNTS: if you do not recognise an account but it plausibly names one, keep it as written without the "@" or platform wrapper, tidying only obvious case. Never return null just because you do not know the account.
6. JUNK → null: entries that name no account: a platform alone ("Instagram", "TikTok"), a kind of content ("cooking videos", "random recipe reels"), a hashtag ("#mealprep"), refusals or "I don't remember", gibberish.
7. Never invent an account that is not in the answer, and never swap it for a better-known one with a similar name.

Respond ONLY with a JSON object mapping each raw input to either:
- A single normalized account name string: "Account Name"
- null if it should be excluded

No markdown, no commentary, just the JSON object."""

USER_PROMPT = """Normalize these raw social media account survey responses:

{items_json}"""


def fetch_survey_data():
    req = urllib.request.Request(API_URL)
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode('utf-8'))


def extract_raw_accounts(data):
    raw_counts = {}
    for r in data:
        v = r.get('list_social_accounts')
        if not v or not isinstance(v, str) or not v.strip():
            continue
        for part in v.split(','):
            t = part.strip()
            if not t:
                continue
            raw_counts[t] = raw_counts.get(t, 0) + 1
    return raw_counts


def compact(value):
    """The dashboard's third lookup: lowercase, without . _ - and spaces."""
    return re.sub(r'[._\s-]', '', value.lower())


def add_lookup_forms(mapping):
    """Add the lowercase and compact form of every raw value and every
    normalized name, so the dashboard's lookups find them. Values the model
    answered for are never overwritten."""
    for raw_val, normalized in list(mapping.items()):
        for form in (raw_val.lower(), compact(raw_val)):
            if form:
                mapping.setdefault(form, normalized)
    for name in {v for v in mapping.values() if isinstance(v, str)}:
        for form in (name, name.lower(), compact(name)):
            if form:
                mapping.setdefault(form, name)
    return mapping


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
    raw_counts = extract_raw_accounts(data)
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

    # Counts over the raw answers, for the summary below only
    counts = {}
    for raw_val, normalized in mapping.items():
        if normalized is None:
            continue
        raw_count = raw_counts[raw_val]
        counts[normalized] = counts.get(normalized, 0) + raw_count

    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)

    add_lookup_forms(mapping)

    output = {
        "mapping": mapping,
        "counts": {},
        "top": [],
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'═' * 50}")
    print(f"Raw unique values: {len(unique_values)}")
    print(f"Normalized unique accounts: {len(counts)}")
    print(f"Excluded (null): {sum(1 for v in raw_counts if mapping.get(v) is None)}")
    print(f"Mapping entries (with lookup forms): {len(mapping)}")
    print(f"Errors: {len(errors)}")
    print(f"Output: {OUTPUT_PATH}")
    print(f"\nTop 20:")
    for name, count in top[:20]:
        print(f"  {count:3d}x  {name}")


if __name__ == "__main__":
    main()
