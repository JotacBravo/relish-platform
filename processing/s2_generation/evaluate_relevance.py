#!/usr/bin/env python3
"""Add the `relevant` flag (is the story about food?) to cards that lack it.

Usage: ANTHROPIC_API_KEY=... python3 processing/s2_generation/evaluate_relevance.py [--force]
"""

import json
import os
import sys
import time
from anthropic import Anthropic

DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
CARDS_PATH = os.path.join(DATA_DIR, "story_cards.json")
MODEL = "claude-haiku-4-5"

PROMPT = """A survey asked European youth to describe "a day in my food life in 2050".
Does the response below belong in a storytelling deck about food?

Answer YES for almost everything: any sincere answer that mentions meals, cooking,
ingredients, eating or a food routine is relevant — EVEN IF it never says "2050",
is mundane, ordinary or short. A plain description of what someone cooks and eats
in a day is YES.

Answer NO only in the rare case it has nothing to do with food at all: blank or
nonsense, spam or a test entry ("asdf", "test", "idk"), a refusal, or clearly
about something else entirely (e.g. describing a photo, an unrelated topic with no
food in it). If food appears anywhere in a genuine way, answer YES. When unsure, YES.

Reply with exactly one word: YES or NO.

RESPONSE:
{text}"""


def main():
    force = "--force" in sys.argv[1:]
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY env var")
        sys.exit(1)

    client = Anthropic(api_key=api_key)
    with open(CARDS_PATH, encoding="utf-8") as f:
        cards = json.load(f)

    todo = [c for c in cards if force or "relevant" not in c]
    print(f"{len(cards)} cards, {len(todo)} to evaluate"
          f"{' (forced re-check)' if force else ''}")
    if not todo:
        print("Nothing to do — every card already has `relevant`.")
        return

    flagged = 0
    for i, c in enumerate(todo):
        text = (c.get("story_text") or "").strip()
        if not text:
            c["relevant"] = False
            flagged += 1
            continue
        try:
            m = client.messages.create(
                model=MODEL, max_tokens=4,
                messages=[{"role": "user", "content": PROMPT.format(text=text[:4000])}],
            )
            ans = m.content[0].text.strip().upper()
            c["relevant"] = not ans.startswith("NO")
        except Exception as e:
            print(f"  #{c.get('story_index')}: error ({str(e)[:80]}) — leaving as relevant")
            c["relevant"] = True
        if not c["relevant"]:
            flagged += 1
            print(f"  #{c.get('story_index')} flagged NOT relevant: \"{c.get('title', '?')}\"")
        if (i + 1) % 25 == 0:
            print(f"  … {i + 1}/{len(todo)}")
        time.sleep(0.2)

    with open(CARDS_PATH, "w", encoding="utf-8") as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)
    print(f"Done. {flagged} card(s) marked not relevant. Wrote {CARDS_PATH}")


if __name__ == "__main__":
    main()
