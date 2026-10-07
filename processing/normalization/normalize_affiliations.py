#!/usr/bin/env python3
"""Normalise the free-text institution and nationality answers (Futures and Visions).

Usage: ANTHROPIC_API_KEY=... python3 processing/normalization/normalize_affiliations.py [--force]
"""

import argparse
import json
import os
import sys
import time
import urllib.request

from anthropic import Anthropic

SURVEYS = ("futures", "visions")
API_TEMPLATE = (os.environ.get("RELISH_API_URL") or "http://127.0.0.1:5000") + "/api/survey/filtered?surveyType={}"
OUT_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
MODEL = "claude-haiku-4-5"
BATCH_SIZE = 60

# Kept identical in spirit to the live normalizer's prompts so a back-filled
# value and a value normalized on arrival agree.
INSTITUTION_SYSTEM = """You are a university/higher-education normalization expert. Normalize raw survey responses naming the "home or host institution" a student attends.

RULES:
1. CANONICAL NAME: return the institution's official English name when it has one ("Universidad de Montesol" -> "University of Montesol", "Universita degli Studi di Lagobello" -> "University of Lagobello"). Otherwise keep the official local name ("Instituto Politecnico do Vale").
2. MERGE VARIANTS: spelling, case, accents, word order and language all fold onto that one canonical name.
3. FIX TYPOS: "Univeristy" -> "University", "Techincal" -> "Technical".
4. CASE: never return ALL CAPS for a full name ("RIVERBEND COLLEGE" -> "Riverbend College").
5. ACRONYMS: expand when you are confident which institution is meant ("MIT" -> "Massachusetts Institute of Technology", "LSE" -> "London School of Economics and Political Science", "KTH" -> "KTH Royal Institute of Technology"). If you are NOT confident, KEEP THE ACRONYM exactly as written. Never return null just because an acronym is unfamiliar or could mean several things.
6. ROLL UP FACULTIES to the parent institution ("Faculty of Law, University of Montesol" -> "University of Montesol").
7. WORLDWIDE: institutions from any country are valid, not only European ones. Respondents include exchange students, so "University of Melbourne", "National University of Singapore" and "University of Buenos Aires" are all real institutions and must be kept.
8. JUNK -> null ONLY when the answer names no institution at all: blanks, gibberish ("asdf", "what do you mean?"), refusals ("N/A", "No", "None", "Nothing"), bare generic words ("University", "College", "Student", "Home", "Exchange program", "studying"), a field of study ("Mechanical Engineering"), or a bare country/city ("France").
9. NEVER return null merely because you do not recognise the name. An unfamiliar but plausible institution name is kept, only tidied for case and typos. Losing a real respondent is far worse than an unmerged label.
10. Never invent an institution that is not in the answer.

Respond ONLY with a single JSON object. Each KEY must be one of the raw input strings, copied EXACTLY as given (same spelling, case, accents, punctuation). Each VALUE is the canonical name, or null.
Example input: ["universidad de montesol", "N/A", "RIVERBEND COLLEGE"]
Example output: {"universidad de montesol": "University of Montesol", "N/A": null, "RIVERBEND COLLEGE": "Riverbend College"}"""

NATIONALITY_SYSTEM = """You are a nationality normalization expert. Normalize raw survey responses to "nationality".

RULES:
1. ENGLISH DEMONYM ADJECTIVE, Title Case: "Portugal" -> "Portuguese", "Italiana" -> "Italian", "polaco" -> "Polish", "japan" -> "Japanese".
2. MULTIPLE NATIONALITIES -> an array in the order written: "Greek/Canadian" -> ["Greek", "Canadian"].
3. REGIONAL AND STATELESS IDENTITIES ARE PRESERVED, NOT folded into the state: "Galician" stays "Galician", "Scottish" stays "Scottish", "Welsh" stays "Welsh". A respondent who chose a regional identity over the national one is data, not an error.
4. JUNK -> null: gibberish ("qwerty"), blanks, refusals, answers naming no nationality.
5. A language is not a nationality; drop it unless it is also the demonym the person clearly means.
6. Never guess a nationality that is not in the answer.

Respond ONLY with a single JSON object. Each KEY must be one of the raw input strings, copied EXACTLY as given (same spelling, case, accents, punctuation). Each VALUE is the demonym, a list of demonyms, or null.
Example input: ["Japan", "qwerty", "Greek/Canadian"]
Example output: {"Japan": "Japanese", "qwerty": null, "Greek/Canadian": ["Greek", "Canadian"]}"""

FIELDS = {
    "institution": {
        "system": INSTITUTION_SYSTEM,
        "out": os.path.join(OUT_DIR, "institutions_normalized.json"),
        "label": "institution",
    },
    "nationality": {
        "system": NATIONALITY_SYSTEM,
        "out": os.path.join(OUT_DIR, "nationalities_normalized.json"),
        "label": "nationality",
    },
}


def fetch(survey):
    url = API_TEMPLATE.format(survey)
    with urllib.request.urlopen(urllib.request.Request(url), timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def collect_raw(records, field):
    counts = {}
    for r in records:
        v = r.get(field)
        if not v or not isinstance(v, str) or not v.strip():
            continue
        k = v.strip()
        counts[k] = counts.get(k, 0) + 1
    return counts


def load_existing(path):
    try:
        with open(path) as fh:
            return json.load(fh)
    except Exception:
        return {"mapping": {}, "counts": {}, "top": []}


CONSOLIDATE_SYSTEM = """You are a university/higher-education expert. You will receive a list of institution names that were normalized in separate batches, so the SAME institution sometimes ended up under two spellings ("Instituto Vale Verde" vs "Vale Verde Institute", "Lakeside University of Applied Sciences" vs "University of Applied Sciences Lakeside").

Find ONLY the groups of names that refer to the SAME institution, and pick the best canonical name for each group.

RULES:
1. Be conservative. Different institutions that merely share words are NOT the same: "Riverbend College" != "Riverbend University", "University of Montesol" != "Montesol Business School" != "IT University of Montesol".
2. Group only genuine duplicates: word order, case, language, abbreviation, or an added "Research Center"/campus suffix.
3. Prefer the institution's official English name as the canonical, else its official local name.
4. Names with no duplicate are simply left out of your answer.

Respond ONLY with a single JSON object mapping each duplicate name to its canonical name. Include every member of a group, including the one you chose as canonical.
Example output: {"Vale Verde Institute": "Instituto Vale Verde", "Instituto Vale Verde": "Instituto Vale Verde", "University of Applied Sciences Lakeside": "Lakeside University of Applied Sciences", "Lakeside University of Applied Sciences": "Lakeside University of Applied Sciences"}"""


def consolidate(client, mapping):
    """Second pass: merge canonical names that different batches spelled differently."""
    names = sorted({v for v in mapping.values() if isinstance(v, str) and v.strip()})
    if len(names) < 2:
        return mapping, 0
    print(f"consolidating {len(names)} canonical names...", end=" ", flush=True)
    try:
        msg = client.messages.create(
            model=MODEL, max_tokens=4096, system=CONSOLIDATE_SYSTEM,
            messages=[{"role": "user", "content":
                       "Find the duplicate institutions in this list:\n\n"
                       + json.dumps(names, ensure_ascii=False, indent=1)}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw.rsplit("```", 1)[0]
        groups = json.loads(raw)
    except Exception as e:
        print(f"skipped ({e})")
        return mapping, 0

    merged = 0
    for raw_val, normed in list(mapping.items()):
        if isinstance(normed, str) and normed in groups and groups[normed] != normed:
            mapping[raw_val] = groups[normed]
            merged += 1
    collapsed = len({n for n in groups if groups[n] != n})
    print(f"done ({collapsed} names folded, {merged} answers reassigned)")
    return mapping, collapsed


def normalize_field(client, field, raw_counts, force):
    cfg = FIELDS[field]
    existing = load_existing(cfg["out"])
    mapping = dict(existing.get("mapping") or {})

    todo = sorted(
        [v for v in raw_counts if force or v not in mapping],
        key=lambda k: raw_counts[k],
        reverse=True,
    )
    print(f"\n=== {cfg['label']} ===")
    print(f"raw unique: {len(raw_counts)}  |  already mapped: {len(raw_counts) - len(todo)}  |  to do: {len(todo)}")

    for start in range(0, len(todo), BATCH_SIZE):
        batch = todo[start:start + BATCH_SIZE]
        n = start // BATCH_SIZE + 1
        total = (len(todo) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"[batch {n}/{total}] {len(batch)} values...", end=" ", flush=True)
        try:
            msg = client.messages.create(
                model=MODEL, max_tokens=4096, system=cfg["system"],
                messages=[{"role": "user", "content":
                           f"Normalize these raw {cfg['label']} survey responses:\n\n"
                           + json.dumps(batch, ensure_ascii=False, indent=1)}],
            )
            raw = msg.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
            if raw.endswith("```"):
                raw = raw.rsplit("```", 1)[0]
            result = json.loads(raw)
            hit = 0
            for v in batch:
                if v in result:
                    mapping[v] = result[v]
                    hit += 1
                else:
                    # leave unmapped values as themselves rather than dropping data
                    mapping[v] = v
            print(f"done ({hit}/{len(batch)})")
            if start + BATCH_SIZE < len(todo):
                time.sleep(0.5)
        except Exception as e:
            print(f"ERROR: {e}")
            for v in batch:
                mapping.setdefault(v, v)
            if "rate" in str(e).lower():
                time.sleep(30)

    # institutions are free-form enough that two batches can canonicalise the
    # same place differently; fold those together before counting
    if field == "institution":
        mapping, _ = consolidate(client, mapping)

    # counts are over the *raw* answer frequencies, so a merged institution
    # carries the total of all its spellings
    counts = {}
    dropped = 0
    for raw_val, normed in mapping.items():
        if raw_val not in raw_counts:
            continue          # stale entry from an older corpus, keep but don't count
        if normed is None:
            dropped += raw_counts[raw_val]
            continue
        items = normed if isinstance(normed, list) else [normed]
        for it in items:
            if it:
                counts[it] = counts.get(it, 0) + raw_counts[raw_val]

    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(cfg["out"], "w") as fh:
        json.dump({"mapping": mapping, "counts": counts, "top": top}, fh,
                  indent=2, ensure_ascii=False)

    print(f"raw unique {len(raw_counts)} -> normalized unique {len(counts)}")
    print(f"answers dropped as junk: {dropped}")
    print(f"wrote {cfg['out']}")
    print("top 12:")
    for name, c in top[:12]:
        print(f"  {c:3d}x  {name}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true",
                    help="re-normalize values already present in the mapping")
    args = ap.parse_args()

    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        print("ERROR: set ANTHROPIC_API_KEY")
        sys.exit(1)
    client = Anthropic(api_key=key)

    records = []
    for s in SURVEYS:
        try:
            got = fetch(s)
            records.extend(got)
            print(f"fetched {len(got)} {s} responses")
        except Exception as e:
            print(f"WARNING: could not fetch {s}: {e}")
    if not records:
        print(f"ERROR: no responses fetched (is the API running at {API_TEMPLATE.split('/api/')[0]}?)")
        sys.exit(1)

    for field in FIELDS:
        normalize_field(client, field, collect_raw(records, field), args.force)


if __name__ == "__main__":
    main()
