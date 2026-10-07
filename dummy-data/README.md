# Demo data

All files here are invented. No file contains a real survey answer.

| Path | Content |
|---|---|
| `responses/youth_responses.json` | 240 answers to the youth food-culture survey |
| `responses/futures_responses.json` | 150 answers to the future perspectives survey |
| `responses/visions_responses.json` | 24 fictional stories about a day in 2050 |
| `static/data/*_normalized.json` | Tables that fold free-text answers into one spelling |
| `static/data/story_cards.json` | One card per story (title, caption, summary, themes, tone) |
| `static/data/sentiment.json` | Sentence polarity and emotion profile of each story |
| `static/data/social_channels.json` | Fictional food creators named in the youth answers |
| `static/images/story_cards_web/manifest.json` | Which cards have an illustration (none here) |

## Regenerating

```bash
node dummy-data/generate.js
```

The generator draws answers from the options in `relish/src/getsurvey/*.js` with a fixed seed, so
it always produces the same files. The stories and their cards are written in the generator itself.

`static/data/sentiment.json` is not produced by the generator. It was computed once for these 24
stories with the method used in the platform (VADER per sentence and the NRC Emotion Lexicon), and
can be recomputed with the scripts in `processing/sentiment/` (see
[`processing/README.md`](../processing/README.md)). The lexicon is not included in this repository
because of its license. For each story the file also holds the emotion shares with the word "food"
not counted as trust (`emotions_nofood`, `food_n`), which the page uses in a note on the emotion
results. If you change the stories, update or remove that file; the cards still work without it.

## Using your own data

Keep the same formats:

- **Responses**: an array of `{ "surveyType": "youth", "createdAt": "<ISO date>", "responses": { ... } }`,
  where `responses` holds the SurveyJS answer object. Load it with `npm run seed` in `server/backend`.
- **Normalisation tables**: `{ "mapping": { "<raw answer>": "<canonical name>" }, "counts": {}, "top": [] }`.
  For ingredients the value is a list of names. A `null` value hides that answer. The social media
  table also holds, for every raw answer and every name, its lowercase form and its lowercase form
  without dots, underscores, hyphens and spaces, because the dashboard looks accounts up in those
  three forms.
- **Story cards**: one object per story with `story_index` equal to the `Index` the API gives the
  matching visions answer (1 for the oldest).

Point `STATIC_DATA_DIR` in `server/backend/.env` to another folder to serve different static files.
