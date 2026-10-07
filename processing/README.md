# Processing scripts

Offline scripts that turn the survey answers into the pre-computed files the
dashboards and stories read from `/data` and `/images`: the normalisation tables
of the free-text answers, the story cards of the Food Visions 2050 deck and their
illustrations, the food icons, and the sentiment profile of the stories.

They read the answers from the public feed of the API (`RELISH_API_URL`, by
default the local API at `http://127.0.0.1:5000`), never from the database, and
write to `RELISH_DATA_DIR` (by default `processing/output/`, which git ignores).
To update what the API serves, point `RELISH_DATA_DIR` at the folder the API
reads (`STATIC_DATA_DIR/data`; with the defaults, `dummy-data/static/data`).

Every script that calls a model skips the values, cards or images it has already
produced, so re-running one only pays for what is new.

## Setup

Tested with Python 3.12.

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r processing/requirements.txt
```

The scripts read their settings from the environment; `processing/.env.example`
lists every variable with its default. They do not load a `.env` file by
themselves:

```bash
cp processing/.env.example processing/.env      # then fill in what you need
set -a; . processing/.env; set +a
```

Start the API first (`cd server/backend && npm run demo` serves the dummy data).

## Free-text normalisation

Several survey questions are free text, so the same dish, ingredient, institution
or account arrives in many spellings. Each script sends the distinct values to
the model (`claude-haiku-4-5`, Anthropic API) in batches and writes a table that
maps every raw value to a canonical name, or to `null` when it names nothing.

| Script | Survey field(s) | Output |
|---|---|---|
| `normalization/normalize_ingredients.py` | youth: iconic ingredients (one value can name several) | `ingredients_normalized.json` |
| `normalization/normalize_dishes.py` | youth: iconic dish | `dishes_normalized.json` |
| `normalization/normalize_regular_dishes.py` | youth: dishes eaten regularly | `regular_dishes_normalized.json` |
| `normalization/normalize_desert_island.py` | youth: desert island menu | `desert_island_normalized.json` |
| `normalization/normalize_social_accounts.py` | youth: social media accounts | `social_accounts_normalized.json` |
| `normalization/normalize_affiliations.py` | futures and visions: institution, nationality | `institutions_normalized.json`, `nationalities_normalized.json` |

```bash
ANTHROPIC_API_KEY=... python3 processing/normalization/normalize_dishes.py
```

These scripts build the tables in batch. New answers are normalised as they
arrive by the backend (`server/backend/controllers/ingredientNormalizer.js`,
with the same instructions and the same tables) when the API has an
`ANTHROPIC_API_KEY`. Answers that arrived while it had none are caught up with
`npm run normalize:backfill` in `server/backend` (a dry run; add `-- --apply` to
normalise them).

## Story cards of Food Visions 2050 (S2)

`s2_generation/process_new_stories.sh` runs the whole pipeline for the
"A Day in My Food Life in 2050" answers that do not have a card yet:

1. `generate_story_cards.py` creates the card of each new story and its
   `relevant` flag (cards about something other than food are hidden). Its own
   card copy is superseded by step 2.
2. `rewrite_story_cards.py` writes the card copy (title, hook, summary, bio,
   tone, themes, image prompt) with the v2 instructions (`claude-sonnet-4-6`).
   The author is described by an age band, not by the year of birth.
3. `generate_story_images.py` paints the illustration with Imagen 3 on Vertex AI.
4. `optimize_card_images.py` writes the web-sized WebP copies and their manifest.

```bash
export ANTHROPIC_API_KEY=... GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
bash processing/s2_generation/process_new_stories.sh
```

Each step can also run on its own (usage at the top of each file).
Two maintenance scripts complete the set: `evaluate_relevance.py` adds the
`relevant` flag to older cards without it, and `regenerate_image_prompts.py`
rewrites only the image prompts and marks those cards for a new illustration.

Story images go to `STORY_IMAGES_DIR` and `STORY_IMAGES_WEB_DIR`. The page reads
the web copies from `/images/story_cards_web/`, which the API serves from
`STATIC_DATA_DIR/images/story_cards_web`.

## Food icons

| Script | Model | Writes to |
|---|---|---|
| `icons/generate_menu_icons.py` | Imagen 3 (Vertex AI) | `relish/public/icons/dishes_v2` (the icons the pages show) |
| `icons/generate_ingredient_icons.py` | Gemini 2.5 Flash Image | `relish/public/icons/ingredients` |
| `icons/generate_dish_icons.py` | Gemini 2.5 Flash Image | `relish/public/icons/dishes` |
| `icons/compress_icons.py` | none | shrinks the icons in `dishes_v2` and `ingredients` in place |

The ingredient and dish icons are drawn only for the names that appear often
enough in the normalisation tables. `GEMINI_API_KEY` is needed for the Gemini
scripts and `GOOGLE_APPLICATION_CREDENTIALS` for the Imagen one.

## Sentiment of the stories

`sentiment/sentiment_analysis.py` scores the stories with VADER (sentence-level
polarity) and with the NRC Emotion Lexicon (share of emotion words for the eight
Plutchik emotions), and writes `sentiment.json`.
`sentiment/sentiment_sensitivity.py` prints how much of the emotion profile comes
from food vocabulary, and `sentiment/sentiment_add_nofood.py --write` adds the
"without food" variant the S2 page quotes.

### The NRC Emotion Lexicon is not included

The lexicon (NRC Word-Emotion Association Lexicon, also called EmoLex, by Saif M.
Mohammad and Peter D. Turney) is distributed by its authors under their own terms
of use, so it is not part of this repository. To run the sentiment scripts:

1. Download it from the authors' page, <https://saifmohammad.com/WebPages/NRC-Emotion-Lexicon.htm>,
   and accept its terms.
2. Find the word-level file, `NRC-Emotion-Lexicon-Wordlevel-v0.92.txt`.
3. Point `NRC_LEXICON_PATH` at it:

```bash
NRC_LEXICON_PATH=/path/to/NRC-Emotion-Lexicon-Wordlevel-v0.92.txt \
  python3 processing/sentiment/sentiment_analysis.py
```

Without it the scripts stop with a message that says what is missing. Git
ignores any file named `NRC-Emotion-Lexicon*`.

## Tests

The tests run every script on the dummy data with the model APIs replaced by
fakes, so they need no API key and no network:

```bash
python3 -m unittest discover -s processing/tests
```

The sentiment tests use a tiny made-up lexicon in the NRC format, written to a
temporary folder.
