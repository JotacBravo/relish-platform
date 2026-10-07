# RELISH: surveys, dashboards and data stories

Source code of the web platform built for **RELISH** (*Reframing European Gastronomy Legacy
through Innovation, Sustainability and Heritage*, Horizon Europe grant 101177427) and described
in the MSc dissertation *Recolher e Visualizar o Património Alimentar Europeu* (Instituto Superior
Técnico, 2026). One React app and one Express/MongoDB API serve:

- **Three surveys** (SurveyJS): *Youth* (food culture of young adults), *Futures* (ordinal
  ratings of the future) and *Futures Narratives* (a written day in 2050), each with a Prolific
  variant.
- **Three dashboards**, one per survey, built on a shared engine: one card per question, CSV
  export and an individual-response viewer.
- **Two scrollytellings**: *The Borrowed Plate* (S1, food culture today) and *RELISH Futures*
  (S2, a deck of cards made from the 2050 narratives, followed by a ratings game).
- **Free-text normalisation**: a language model folds free-text answers into inspectable lookup
  tables, in batch and incrementally after each submission, outside the request path.
- **Processing scripts** (Python) for the normalisation tables, the S2 cards and illustrations,
  the food icons and the sentiment of the narratives.

This repository runs on **generated demo data** (`dummy-data/`): no real answers and no personal
data. Model APIs are called only when you provide a key.

## Quick start

Requirements: [Node.js](https://nodejs.org/) 20 or newer.

```bash
cd server/backend
npm install
npm run demo          # API on 127.0.0.1:5000 with an in-memory MongoDB and the demo data
```

In a second terminal:

```bash
cd relish
npm install
npm start             # app on http://localhost:3000
```

The start page links to every survey, dashboard and story. The first `npm run demo` downloads a
MongoDB binary (about 100 MB); answers submitted in the demo are lost when the API stops.

On macOS, if port 5000 is taken by the AirPlay Receiver, set `PORT` in `server/backend/.env` and
`proxy` in `relish/package.json` to another port.

To use your own MongoDB instead:

```bash
cd server/backend
cp .env.example .env  # set MONGO_URL
npm run seed          # loads dummy-data/responses (replaces those collections)
npm start
```

## Pages

| Path | Page |
|---|---|
| `/survey_youth_food_culture` | Survey: Youth |
| `/survey_future_perspectives` | Survey: Futures |
| `/survey_food_visions_2050` | Survey: Futures Narratives |
| `/dashboard_youth_food_culture` | Dashboard: Youth |
| `/dashboard_future_perspectives` | Dashboard: Futures |
| `/dashboard_food_visions_2050` | Dashboard: Futures Narratives |
| `/the_borrowed_plate` | S1, *The Borrowed Plate* |
| `/food_visions_2050` | S2, *RELISH Futures* |
| `/youth_survey_prolific`, `/futures_survey_prolific`, `/futures_narratives_prolific` | Prolific variants |

- **Prolific variants** ask for the Prolific ID and, after a successful save, send the participant
  back with the completion code set in `relish/.env` (see `relish/.env.example`).
- **`?eval=1`** turns on reading telemetry in the stories and dashboards (evaluation sessions
  only); the page shows a session code. Without it nothing is recorded.
- **`/food_visions_2050?curate=1`** is the operator mode: with the admin token, each swipe records
  a verdict (keep, new image, hide) instead of a vote. `npm run curation -- apply` in
  `server/backend` writes the verdicts into `story_cards.json`.
- **Old addresses** (`/story`, `/youth_survey`, ...) redirect to the current ones
  (`relish/src/legacyRoutes.json`).

## Architecture

```
browser ──> relish (React) ──/api, /data, /images──> server/backend (Express) ──> MongoDB
                                                         │
                                                         ├── static files: normalisation tables, S2 cards
                                                         └── incremental normaliser (Anthropic API, async)

processing/ (Python, offline) ── reads /api/survey/filtered ──> writes the static files
```

- **Write path**: `POST /api/survey/complete` checks each submission against the fields of its
  survey (size, depth, number of fields) and stores it in `youth_responses`, `futures_responses`
  or `visions_responses`. The thank-you page appears only once the answers are saved; otherwise
  the participant sees an error and a retry button.
- **Read path**: `GET /api/survey/filtered` returns the answers of one survey without email
  addresses or Prolific IDs and without answers whose required free text is a single character.
  Dashboards and stories compute every chart in the browser, so new answers show up at once.
- **Normalisation**: after a submission is saved, values not yet in a table are sent to the model
  in the background, with the names already in use, and added to the table. A model failure never
  blocks a submission; failed values are retried with a growing delay.
- **Data-dependent text**: sentences in the stories that rely on an order or a share are chosen
  from the numbers at render time (`relish/src/dashboards/claims.js`).
- **Telemetry**: each survey logs, under a random session id, opening, page changes, answers
  (never the email or the Prolific ID), completion and abandonment (`surveylogs`). IP addresses
  are stored only as a truncated HMAC-SHA256.

## API

| Method and path | Access | Purpose |
|---|---|---|
| `POST /api/survey/complete` | public | Store a submission `{ surveyType, responses }` |
| `GET /api/survey/filtered?surveyType=` | public | Answers for the visualisations, without direct identifiers |
| `GET /api/survey/filtered-stats?surveyType=` | public | How many answers the feed leaves out |
| `POST /api/survey/log`, `POST /api/survey/log-batch` | public | Telemetry events (batches up to 500) |
| `GET /api/survey/story-interactions` | admin | Interactions recorded in S1 during `?eval=1` sessions |
| `GET /api/survey/export?surveyType=` | admin | Raw export of one survey |
| `GET /api/survey/normalizer-status` | admin | State of each normalisation table |
| `GET /api/tinder/config`, `GET /api/tinder/scores` | public | S2 settings and points per card |
| `POST /api/tinder/swipe` | public | Record a swipe `{ storyIndex, action }` |
| `POST /api/tinder/curate`, `GET /api/tinder/curation` | admin | Operator verdict per card |
| `GET /data/…`, `GET /images/…` | public | Static files from `STATIC_DATA_DIR` |

`surveyType` is `youth`, `futures` or `visions`. Admin routes need `Authorization: Bearer
<ADMIN_API_TOKEN>` and stay closed when no token is set.

## Processing

See [`processing/README.md`](processing/README.md). In short:

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r processing/requirements.txt
ANTHROPIC_API_KEY=... python3 processing/normalization/normalize_dishes.py
```

- `normalization/`: one script per free-text field (Claude Haiku 4.5 through the Anthropic API).
- `s2_generation/`: S2 cards (copy with Claude Sonnet 4.6, illustrations with Imagen 3).
- `icons/`: food icons (Gemini 2.5 Flash Image, Imagen 3).
- `sentiment/`: VADER and the NRC Emotion Lexicon, which is not included (download it from
  <https://saifmohammad.com/WebPages/NRC-Emotion-Lexicon.htm> and set `NRC_LEXICON_PATH`).

## Configuration

`server/backend/.env.example` lists every variable; all are optional.

| Variable | Default | Purpose |
|---|---|---|
| `MONGO_URL` | `mongodb://127.0.0.1:27017/relish` | MongoDB connection |
| `PORT`, `HOST` | `5000`, `127.0.0.1` | API address |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allow-list |
| `ADMIN_API_TOKEN` | empty (admin routes closed) | Token for the admin routes |
| `LIKES_ENABLED` | `true` | Store S2 swipes |
| `COLLECTION_START` | empty | Leave out answers before this date |
| `TRUST_PROXY` | empty | Number of reverse proxies in front of the API |
| `NODE_ENV` | empty | `production` on a public server |
| `STATIC_DATA_DIR` | `dummy-data/static` | Folder served under `/data` and `/images` |
| `LOG_IP_SALT` | random per start | Key of the IP hash |
| `ANTHROPIC_API_KEY` | empty (normaliser off) | Incremental normalisation |
| `NORMALIZER_ALERT_WEBHOOK` | empty | Webhook for normaliser alerts |
| `GEMINI_API_KEY` | empty | Icon for each new everyday dish |

## Tests

```bash
cd server/backend && npm test                      # API and normaliser (in-memory MongoDB)
cd relish && CI=true npm test -- --watchAll=false   # routes, surveys, dashboards, stories
python3 -m unittest discover -s processing/tests    # processing scripts
```

No test calls a model API or needs a key. The web app tests include a check that every
data-dependent sentence of the stories agrees with the numbers it quotes, on perturbed synthetic
data, and that every answer option the code looks for exists in the survey definitions.

## Production

```bash
cd relish && npm run build && npm run serve
```

`npm run serve` starts `relish/server.js` on `127.0.0.1:3000`: it serves the build, answers the
old addresses with a 301, forwards `/api`, `/data` and `/images` to the API (`API_URL`) and
returns the app for any other route. Run both servers under a process manager, put a reverse
proxy with TLS in front, and set `TRUST_PROXY`, `NODE_ENV=production`, `ALLOWED_ORIGINS`,
`ADMIN_API_TOKEN` and `LOG_IP_SALT` in the API.

## Not included

- Real survey answers and everything derived from them (tables, cards, images, telemetry).
- The evaluation studies: questionnaires, their routes, results and analysis scripts.
- The NRC Emotion Lexicon (distributed by its authors under their own terms).
- Deployment configuration of the project's server.
- `POST /api/images/generate`, an early image endpoint not used by S2.

## License

The code is released under the [MIT License](LICENSE). The RELISH logo
(`relish/public/Relish_Logo_Master_01.png`) and the EU emblem
(`relish/public/EN_FundedbytheEU_RGB_POS.png`) are not covered by it. The food icons were
generated with Gemini 2.5 Flash Image and Imagen 3. `relish/public/countries.json` lists country
names in the format of [REST Countries](https://restcountries.com). Food footprints come from
Clark et al. (2022) and Poore & Nemecek (2018).

## Funding

Funded by the European Union under the Horizon Europe programme (grant agreement 101177427).
Views and opinions expressed are those of the authors only and do not necessarily reflect those
of the European Union or the granting authority.
