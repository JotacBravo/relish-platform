#!/usr/bin/env python3
"""Rewrite only the image prompt of existing cards and mark them for a new illustration.

Usage: ANTHROPIC_API_KEY=... python3 processing/s2_generation/regenerate_image_prompts.py [--indices 3,7]
"""

import json
import os
import sys
import time
from anthropic import Anthropic

DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
CARDS_PATH = os.path.join(DATA_DIR, "story_cards.json")
MODEL = "claude-haiku-4-5"

PROMPT = """From this "day in my food life in 2050" narrative, write ONE image_prompt (max 30 words)
for an illustrator.

Find the single most DISTINCTIVE, specific or surprising thing this person describes — the
lab-grown chicken, the algae dish, the 3D food printer, the insect snack, the vertical farm,
the wood-fired oven, the smart kitchen making a grandparent's recipe — and put THAT at the
centre of the scene. Prefer the concrete, unusual detail that makes THIS story different from
every other; only show a plain "people eating at a table" or a lone diner if that ordinariness
is genuinely the whole point. Food or the food-making must be visible, but let the story's
signature element lead.

Describe only WHAT is in the scene, not how to render it. No style words, no text or labels.
Respond with ONLY the prompt, nothing else.

STORY:
{text}"""


def main():
    args = list(sys.argv[1:])
    indices = None
    if "--indices" in args:
        i = args.index("--indices")
        indices = {int(x) for x in args[i + 1].split(",")}
        del args[i:i + 2]
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY env var")
        sys.exit(1)

    client = Anthropic(api_key=api_key)
    with open(CARDS_PATH, encoding="utf-8") as f:
        cards = json.load(f)

    def wants(c):
        if c.get("relevant") is False:        # off-topic / hidden — no image needed
            return False
        if indices is not None:
            return c.get("story_index") in indices
        return bool((c.get("story_text") or "").strip())

    todo = [c for c in cards if wants(c)]
    print(f"{len(cards)} cards, regenerating {len(todo)} image prompt(s)")
    if not todo:
        return

    for i, c in enumerate(todo):
        try:
            m = client.messages.create(
                model=MODEL, max_tokens=120,
                messages=[{"role": "user", "content": PROMPT.format(text=(c.get("story_text") or "")[:3500])}],
            )
            new = m.content[0].text.strip().strip('"')
            if new:
                c["image_prompt"] = new
                c["needs_new_image"] = True
        except Exception as e:
            print(f"  #{c.get('story_index')}: error ({str(e)[:80]}) — kept old prompt")
        if (i + 1) % 25 == 0:
            print(f"  … {i + 1}/{len(todo)}")
        time.sleep(0.2)

    with open(CARDS_PATH, "w", encoding="utf-8") as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)
    print(f"Done. Wrote {CARDS_PATH}. Now repaint: python3 processing/s2_generation/generate_story_images.py --force")


if __name__ == "__main__":
    main()
