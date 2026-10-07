#!/usr/bin/env python3
"""Create a card for each new 2050 story (profile, answer date, `relevant` flag).

The copy is then rewritten by rewrite_story_cards.py. Only new stories are processed.
Usage: ANTHROPIC_API_KEY=... python3 processing/s2_generation/generate_story_cards.py
"""

import json
import os
import sys
import time
import urllib.request
from anthropic import Anthropic

# Config
API_URL = (os.environ.get("RELISH_API_URL") or "http://127.0.0.1:5000") + "/api/survey/filtered?surveyType=visions"
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"))
OUTPUT_PATH = os.path.join(DATA_DIR, "story_cards.json")
MODEL = "claude-haiku-4-5"

SYSTEM_PROMPT = """You are a creative analyst who turns personal food narratives into \
engaging card content for a swipe-based storytelling experience. \
You find the emotional core of each story and translate it into \
punchy, visual, scroll-stopping content."""

USER_PROMPT_TEMPLATE = """Analyze this personal narrative about "A Day in My Food Life in 2050"
written by a European youth survey respondent.

Extract the following and respond ONLY with valid JSON, no markdown, no commentary.

1. **title** (max 5 words): A poetic, evocative title for this food future.
   Should intrigue, not describe. Think book title, not headline. No clichés.

2. **swipe_hook** (max 8 words): One punchy sentence in FIRST PERSON that
   makes someone stop scrolling. Urgent or intriguing. Captures the author's
   defining tension or desire.

3. **image_prompt** (max 30 words): the ONE image that captures what makes THIS
   story different from every other. Find the single most distinctive, specific
   or surprising thing the person describes — the lab-grown chicken, the algae
   dish, the 3D food printer, the insect snack, the vertical farm, the wood-fired
   oven, the smart kitchen cooking a grandparent's recipe — and put THAT at the
   centre of the scene. Prefer that concrete, unusual detail over a generic
   "people eating at a table"; only show a plain meal or a lone diner if that
   ordinariness is genuinely the point of the story. Food or the food-making must
   be visible, but let the story's signature element lead.
   - Describe only WHAT is in the scene, not HOW to render it
   - NO style instructions (no "gouache", "earth tones", "soft light", etc.)
   - NO text/words/labels/signs in the image

4. **bio** (max 15 words): A punchy, warm tagline in FIRST PERSON capturing
   this person's food identity, as if for a dating app profile.

5. **emotional_tone**: A precise, free-text label capturing how the author
   feels about this future (e.g. "hopeful anxiety", "defiant optimism",
   "serene acceptance"). Be specific, not generic.

6. **themes** (3-5 hashtags): Short, human, relatable tags that capture
   the essence of this food future. Written in plain language, not academic.
   Think Instagram or TikTok hashtags — what would THIS person use?
   Examples: "#localfood", "#nostalgia", "#backtoroots", "#eatbetter",
   "#climateanxiety", "#communitymatters"

7. **relevant** (boolean): almost always TRUE. This is a food survey, so any
   sincere answer that mentions meals, cooking, ingredients, eating or a food
   routine is relevant — EVEN IF it never says "2050", is mundane, ordinary, or
   short. A plain description of what someone cooks and eats in a day is relevant.
   Set it to FALSE only in the rare case the response has nothing to do with food
   at all: blank or nonsense, spam or a test entry ("asdf", "test", "idk"), a
   refusal, or clearly about something else entirely (e.g. describing a photo or
   an unrelated topic with no food in it). If food appears anywhere in a genuine
   way, it is relevant. When unsure, choose true.

{{
  "title": "...",
  "swipe_hook": "...",
  "image_prompt": "...",
  "bio": "...",
  "emotional_tone": "...",
  "themes": ["#...", "#...", "#..."],
  "relevant": true
}}

STORY:
{story_text}"""


def load_existing():
    """Load already-processed stories from output file."""
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, "r") as f:
            return json.load(f)
    return []


def save_results(results):
    """Save results to output file."""
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)


def get_processed_indices(existing):
    """Get set of already-processed story indices."""
    return {item["story_index"] for item in existing}


def fetch_stories():
    """Fetch all visions stories from the API."""
    req = urllib.request.Request(API_URL)
    with urllib.request.urlopen(req, timeout=30) as resp:
        stories = json.loads(resp.read().decode("utf-8"))
    # Filter out stories with empty/missing narratives
    return [s for s in stories if s.get("day_in_life_2050", "").strip()]


def analyze_story(client, story_text):
    """Ask the model about one story; returns the parsed JSON."""
    message = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": USER_PROMPT_TEMPLATE.format(story_text=story_text)
        }]
    )
    raw = message.content[0].text.strip()
    # drop ``` fences if the model adds them
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]
    return json.loads(raw)


def main():
    # API Key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY env var")
        sys.exit(1)

    client = Anthropic(api_key=api_key)

    # Load existing results
    existing = load_existing()
    processed = get_processed_indices(existing)
    print(f"Already processed: {len(processed)} stories")

    # Fetch stories
    stories = fetch_stories()
    print(f"Total stories from API: {len(stories)}")

    # Find new stories only
    new_stories = [s for s in stories if s["Index"] not in processed]
    if not new_stories:
        print("✓ All stories already processed. Nothing to do.")
        return

    print(f"New stories to process: {len(new_stories)}")
    print()

    # Process new stories
    results = list(existing)  # Start with existing results
    errors = []

    for i, story in enumerate(new_stories):
        idx = story["Index"]
        text = story["day_in_life_2050"]
        print(f"[{i+1}/{len(new_stories)}] Processing story #{idx}...", end=" ", flush=True)

        try:
            analysis = analyze_story(client, text)
            result = {
                "story_index": idx,
                "story_text": text,
                "nationality": story.get("nationality", ""),
                "residence_country": story.get("residence_country", ""),
                "gender": story.get("gender", ""),
                "birth_year": story.get("birth_year", ""),
                "responded_at": story.get("createdAt", ""),
                **analysis
            }
            results.append(result)
            print(f"✓ \"{analysis.get('title', '?')}\"")

            # Save after each story — never lose progress
            save_results(results)

            # Small delay to respect rate limits
            if i < len(new_stories) - 1:
                time.sleep(0.5)

        except json.JSONDecodeError as e:
            print(f"✗ JSON parse error: {e}")
            errors.append({"index": idx, "error": f"JSON parse: {e}"})
        except Exception as e:
            print(f"✗ Error: {e}")
            errors.append({"index": idx, "error": str(e)})
            # Save progress so far
            save_results(results)
            # If rate limited, wait longer
            if "rate" in str(e).lower():
                print("  Rate limited — waiting 30s...")
                time.sleep(30)

    # Summary
    print()
    print(f"═══ Done ═══")
    print(f"  Processed: {len(new_stories) - len(errors)}/{len(new_stories)} new stories")
    print(f"  Total in output: {len(results)}")
    print(f"  Errors: {len(errors)}")
    if errors:
        print(f"  Failed indices: {[e['index'] for e in errors]}")
    print(f"  Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
