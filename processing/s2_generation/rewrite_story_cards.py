#!/usr/bin/env python3
"""Write the card copy (v2): title, hook, summary, bio, tone, themes and image prompt.

Backs up the cards first; cards already at v2 are skipped unless --force.
Usage: ANTHROPIC_API_KEY=... python3 processing/s2_generation/rewrite_story_cards.py [--limit N] [--indices 1,11] [--force]
"""

import argparse
import json
import os
import re
import shutil
import sys
import time
from datetime import datetime

from anthropic import Anthropic

DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
CARDS_PATH = os.path.join(DATA_DIR, "story_cards.json")
BACKUP_PATH = os.path.join(DATA_DIR, "story_cards_pre_v2_backup.json")
MODEL = "claude-sonnet-4-6"

# Controlled vocabularies
HASHTAG_VOCAB = [
    # technology & automation
    "#foodtech", "#robotcooks", "#smartkitchen", "#labgrownmeat", "#printedfood",
    "#foodpills", "#mealkits", "#fooddelivery",
    # pace & convenience
    "#convenience", "#fastlife", "#slowfood",
    # sustainability & environment
    "#plantbased", "#sustainability", "#zerowaste", "#climateanxiety", "#scarcity",
    "#localfood", "#urbanfarming", "#homegrown",
    # tradition & memory
    "#homecooking", "#traditionalfood", "#grandmasrecipes", "#nostalgia", "#lostskills",
    # social life
    "#familytable", "#communitymeals", "#eatingalone", "#eatingout",
    # health & body
    "#healthyeating", "#personalizednutrition", "#foodasfuel", "#foodasjoy",
    # outlook
    "#optimistic2050", "#worried2050",
]

TONE_OPTIONS = [
    "hopeful optimism",
    "quiet joy",
    "warm nostalgia",
    "serene acceptance",
    "pragmatic ambivalence",
    "mixed feelings",
    "anxious unease",
    "dystopian dread",
    "defiant resilience",
]

SYSTEM_PROMPT = """You are an editor for a swipe-based storytelling app that shows \
real first-person narratives about food life in 2050, written by young survey \
respondents. Your job is to write card copy that is CLEAR FIRST, clever second: \
a reader who sees only the card must immediately understand what this particular \
future looks like. You never sacrifice meaning for poetry, you ground every word \
in the story's actual content, and you never invent details that are not in the text."""

USER_PROMPT_TEMPLATE = """Read this personal narrative about "A Day in My Food Life in 2050".

Write the card copy. Respond ONLY with valid JSON, no markdown, no commentary.

PUNCTUATION: never use em dashes or en dashes (the "—" or "–" characters) anywhere
in the copy. Use commas, colons or full stops instead.

NOTE: some respondents ignored the brief — they wrote about the present, gave a
one-line joke answer, or wrote something surreal with little or no food in it.
These are real survey answers and the app must still show them. NEVER refuse and
NEVER return an error: write card copy that honestly describes what the text
actually contains (e.g. a title like "One-Line Answer: Just Soup Every Day" or
"Same Lunch, Same Desk, in 2050"). If food is absent, say so in the
summary and pick the closest-fitting themes anyway.

1. "title" (max 7 words): A concrete, specific title that states the central
   idea of THIS story's future. Someone reading only the title must understand
   what kind of food future this is. Plain words over poetry. Good: "Rooftop Beans,
   Shared on Fridays" / "Dinner Comes Out of a Printer". Bad: "Waiting for
   Tomorrow" (says nothing), "A Feast of Dreams" (cliché, vague).

2. "swipe_hook" (max 14 words): ONE first-person sentence stating the story's
   defining habit, tension or hope — clear enough to stand alone. It must refer
   to something that actually happens in the story.

3. "summary" (max 32 words): 1-2 factual third-person sentences summarizing how
   this person eats and cooks in 2050 and what they feel about it. Written so a
   reader gets the story without opening it.

4. "bio" (max 22 words): First-person dating-app style line describing their
   2050 food identity — what/how they actually eat in the story (who cooks,
   what technology or tradition is involved, alone or together). Concrete, warm.

5. "emotional_tone": pick EXACTLY ONE from this list (the closest match):
{tones}

6. "themes" (3 to 5 hashtags): choose ONLY from this fixed vocabulary — pick the
   tags that genuinely apply to this story (these power tag-based browsing, so
   accuracy matters more than flair):
{vocab}

7. "image_prompt" (25-45 words): One vivid illustratable scene taken from THIS
   story — its most distinctive moment. To keep the gallery varied:
   - Choose the setting the story actually implies (kitchen, rooftop garden,
     street market, lab canteen, communal table, balcony, field, train...) —
     do NOT default to a kitchen counter.
   - Pick a viewpoint and time of day that fit the mood (close-up / wide shot /
     overhead; dawn, noon, dusk, night).
   - You may suggest light and color mood (e.g. "cold blue evening light",
     "golden morning sun"), but NO art-style or artist names.
   - Food must be visible and central. People may appear.
   - NO text, words, labels, screens with writing, logos.
   - NO brand names (write "a meal-kit box", never a company name).

{{
  "title": "...",
  "swipe_hook": "...",
  "summary": "...",
  "bio": "...",
  "emotional_tone": "...",
  "themes": ["#...", "#...", "#..."],
  "image_prompt": "..."
}}

STORY (by a {gender} respondent aged {age_band}, {nationality}, living in {residence_country}):
{story_text}"""


def load_api_key():
    return os.environ.get("ANTHROPIC_API_KEY")


def age_band(card):
    """The author's age band (as on the cards); the model never sees the birth year."""
    try:
        born = int(str(card.get("birth_year") or "")[:4])
    except ValueError:
        return "unknown age"
    answered = str(card.get("responded_at") or "")[:4]
    age = (int(answered) if answered.isdigit() else datetime.now().year) - born
    if not 10 <= age <= 100:
        return "unknown age"
    if age < 18:
        return "under 18"
    if age <= 24:
        return "18–24"
    if age <= 34:
        return "25–34"
    return "35+"


def normalize_themes(raw_themes):
    """Lowercase, prefix with #, and keep only vocabulary tags (dedup, order kept)."""
    vocab = set(HASHTAG_VOCAB)
    out = []
    for t in raw_themes or []:
        t = str(t).strip().lower()
        if not t:
            continue
        if not t.startswith("#"):
            t = "#" + t
        t = t.replace(" ", "")
        if t in vocab and t not in out:
            out.append(t)
    return out[:5]


def normalize_tone(raw):
    raw_l = str(raw or "").strip().lower()
    for t in TONE_OPTIONS:
        if t == raw_l:
            return t
    # closest match by shared words, else default
    raw_words = set(raw_l.split())
    best, best_n = "pragmatic ambivalence", 0
    for t in TONE_OPTIONS:
        n = len(raw_words & set(t.split()))
        if n > best_n:
            best, best_n = t, n
    return best


def analyze(client, card):
    prompt = USER_PROMPT_TEMPLATE.format(
        tones="\n".join(f'   - "{t}"' for t in TONE_OPTIONS),
        vocab="\n".join(f"   {t}" for t in HASHTAG_VOCAB),
        gender=card.get("gender") or "unknown gender",
        age_band=age_band(card),
        nationality=card.get("nationality") or "unknown nationality",
        residence_country=card.get("residence_country") or "unknown country",
        story_text=card["story_text"],
    )
    message = client.messages.create(
        model=MODEL,
        max_tokens=700,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    # The model occasionally prefixes commentary (e.g. for very sparse stories):
    # extract the fenced block, or fall back to the outermost braces.
    fenced = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
    if fenced:
        raw = fenced.group(1).strip()
    elif "{" in raw:
        raw = raw[raw.find("{"): raw.rfind("}") + 1]
    data = json.loads(raw)

    for key in ("title", "swipe_hook", "summary", "bio", "emotional_tone", "themes", "image_prompt"):
        if key not in data:
            raise ValueError(f"missing key: {key}")

    data["themes"] = normalize_themes(data["themes"])
    if len(data["themes"]) < 3:
        raise ValueError(f"only {len(data['themes'])} valid vocabulary tags")
    data["emotional_tone"] = normalize_tone(data["emotional_tone"])
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--indices", type=str, default=None)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    api_key = load_api_key()
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY env var")
        sys.exit(1)
    client = Anthropic(api_key=api_key)

    with open(CARDS_PATH) as f:
        cards = json.load(f)

    if not os.path.exists(BACKUP_PATH):
        shutil.copy(CARDS_PATH, BACKUP_PATH)
        print(f"Backup written: {BACKUP_PATH}")

    wanted = None
    if args.indices:
        wanted = {int(x) for x in args.indices.split(",")}

    todo = []
    for card in cards:
        if wanted is not None and card["story_index"] not in wanted:
            continue
        if not args.force and card.get("card_version") == 2:
            continue
        todo.append(card)
    if args.limit:
        todo = todo[: args.limit]

    print(f"Cards to rewrite: {len(todo)} of {len(cards)} (model: {MODEL})")

    errors = []
    for i, card in enumerate(todo):
        idx = card["story_index"]
        print(f"[{i+1}/{len(todo)}] story #{idx}...", end=" ", flush=True)
        try:
            analysis = analyze(client, card)
            card.update(analysis)
            card["card_version"] = 2
            print(f'✓ "{analysis["title"]}"  {" ".join(analysis["themes"])}')
            with open(CARDS_PATH, "w") as f:
                json.dump(cards, f, indent=2, ensure_ascii=False)
            if i < len(todo) - 1:
                time.sleep(0.4)
        except Exception as e:  # noqa: BLE001 — log & continue, file saved each step
            print(f"✗ {e}")
            errors.append({"index": idx, "error": str(e)})
            if "rate" in str(e).lower() or "overloaded" in str(e).lower():
                print("  waiting 30s...")
                time.sleep(30)

    print("\n═══ Done ═══")
    print(f"  Rewritten: {len(todo) - len(errors)}/{len(todo)}")
    if errors:
        print(f"  Failed indices: {[e['index'] for e in errors]} (rerun the script to retry)")
    done = sum(1 for c in cards if c.get("card_version") == 2)
    print(f"  Total v2 cards in file: {done}/{len(cards)}")


if __name__ == "__main__":
    main()
