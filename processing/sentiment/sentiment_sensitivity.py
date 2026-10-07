#!/usr/bin/env python3
"""Print how much of the NRC emotion profile comes from food words (writes nothing).

Usage: NRC_LEXICON_PATH=... python3 processing/sentiment/sentiment_sensitivity.py
"""

import json
import os
import re
import statistics as st
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(HERE, "..", "output"))
CARDS_PATH = os.path.join(DATA_DIR, "story_cards.json")
# The NRC Emotion Lexicon is not distributed with this repository (see processing/README.md).
NRC_PATH = (os.environ.get("NRC_LEXICON_PATH") or "")

PLUTCHIK = ["anticipation", "joy", "trust", "surprise", "fear", "sadness", "disgust", "anger"]
PT = {"anticipation": "Antecipação", "joy": "Alegria", "trust": "Confiança",
      "surprise": "Surpresa", "fear": "Medo", "sadness": "Tristeza",
      "disgust": "Repulsa", "anger": "Raiva"}

# Kept identical to sentiment_analysis.py so both run on the same documents.
EN_STOP = set(
    "the a an and or but if of to in on at for with from by as is are was were be been "
    "being have has had do does did i you he she it we they my your our their this that "
    "these those not no so then than when while because about into over under".split()
)
WORD_RE = re.compile(r"[a-zA-Z']+")

# Food-domain candidates; only those the lexicon actually ties to trust are used.
FOOD_CANDIDATES = [
    "food", "meal", "eat", "eating", "kitchen", "cook", "cooking", "bread", "meat",
    "fruit", "vegetable", "dinner", "lunch", "breakfast", "chocolate", "milk", "cheese",
    "fish", "rice", "soup", "salad", "harvest", "farm", "garden", "grow", "nutrition",
    "nutritious", "diet", "feed", "serve", "taste", "recipe",
]


def load_nrc():
    if not NRC_PATH or not os.path.exists(NRC_PATH):
        raise SystemExit("ERROR: set NRC_LEXICON_PATH to NRC-Emotion-Lexicon-Wordlevel-v0.92.txt "
                         "(the lexicon is not included; see processing/README.md)")
    lex = defaultdict(set)
    with open(NRC_PATH, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) == 3 and parts[2] == "1" and parts[1] in PLUTCHIK:
                lex[parts[0]].add(parts[1])
    return dict(lex)


def tokens(text):
    return [t.lower() for t in WORD_RE.findall(text or "")]


def is_english(text):
    toks = tokens(text)
    return len(toks) >= 5 and sum(1 for t in toks if t in EN_STOP) / len(toks) > 0.06


def profile(docs, lex, drop=(), scope="trust"):
    """Mean per-document share of emotion-bearing tokens, as in sentiment_analysis.py."""
    working = {w: set(e) for w, e in lex.items()}
    for w in drop:
        if w not in working:
            continue
        if scope == "trust":
            working[w].discard("trust")
        else:
            working[w] = set()
        if not working[w]:
            working.pop(w)

    shares = defaultdict(list)
    for text in docs:
        counts, total = Counter(), 0
        for tok in tokens(text):
            ems = working.get(tok)
            if ems:
                total += 1
                for e in ems:
                    counts[e] += 1
        for e in PLUTCHIK:
            shares[e].append(counts.get(e, 0) / total if total else 0.0)
    return {e: 100 * st.mean(v) for e, v in shares.items()}


# Dominant emotion per visible story, as the S2 page computes it (ties go to
# the earlier emotion in this order).
PAGE_ORDER = ["joy", "trust", "anticipation", "surprise", "fear", "sadness", "disgust", "anger"]
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def working_lexicon(lex, drop=(), scope="trust"):
    working = {w: set(e) for w, e in lex.items()}
    for w in drop:
        if w in working:
            if scope == "trust":
                working[w].discard("trust")
            else:
                working[w] = set()
            if not working[w]:
                working.pop(w)
    return working


def doc_shares(text, lex, unit):
    """Per-emotion share for one story: of emotion-bearing tokens ('tokens'),
    or of sentences carrying at least one word of the emotion ('sentences')."""
    counts, total = Counter(), 0
    if unit == "tokens":
        for tok in tokens(text):
            ems = lex.get(tok)
            if ems:
                total += 1
                counts.update(ems)
    else:
        sents = [x.strip() for x in SENT_SPLIT.split(text or "") if len(x.strip()) > 3] or [text]
        for sent in sents:
            total += 1
            counts.update(set().union(*[lex.get(t, set()) for t in tokens(sent)]))
    return {e: (counts[e] / total if total else 0.0) for e in PLUTCHIK}


def dominant(shares):
    best, bv = None, 0.0
    for e in PAGE_ORDER:
        if shares.get(e, 0) > bv:
            best, bv = e, shares[e]
    return best


def dominant_counts(texts, lex, unit):
    c = Counter(dominant(doc_shares(t, lex, unit)) for t in texts)
    c.pop(None, None)
    return c


def page_counts():
    """The counts the page shows today, straight from its own input files."""
    with open(os.path.join(DATA_DIR, "sentiment.json"), encoding="utf-8") as f:
        per_doc = {d["i"]: d for d in json.load(f)["per_doc"]}
    with open(CARDS_PATH, encoding="utf-8") as f:
        cards = json.load(f)
    deck = [c for c in cards if c.get("hidden") is not True and c.get("relevant") is not False]
    c = Counter(dominant(per_doc[x["story_index"]]["emotions"]) for x in deck if x["story_index"] in per_doc)
    c.pop(None, None)
    return c, deck, per_doc


def main_dominant():
    lex = load_nrc()
    shown, deck, per_doc = page_counts()
    # same stories as the page: deck cards that have an entry in sentiment.json
    texts = [x.get("story_text") or "" for x in deck if x["story_index"] in per_doc]
    food = [w for w in FOOD_CANDIDATES if "trust" in lex.get(w, ())]
    runs = [
        ("Página (sentiment.json)", shown),
        ("Recalculado, palavras", dominant_counts(texts, lex, "tokens")),
        ("sem food (trust)", dominant_counts(texts, working_lexicon(lex, ["food"]), "tokens")),
        ("sem food/chocolate/grow/serve (trust)", dominant_counts(texts, working_lexicon(lex, food), "tokens")),
        ("sem campo alim. (todas)", dominant_counts(texts, working_lexicon(lex, food, "all"), "tokens")),
        ("Recalculado, frases", dominant_counts(texts, lex, "sentences")),
        ("frases, sem food (trust)", dominant_counts(texts, working_lexicon(lex, ["food"]), "sentences")),
        ("frases, sem campo alim. (trust)", dominant_counts(texts, working_lexicon(lex, food), "sentences")),
    ]
    print(f"\nEmoção dominante por narrativa (n = {len(texts)} narrativas do baralho com perfil)")
    print(f"{'Emoção':14}" + "".join(f"{name[:22]:>24}" for name, _ in runs))
    for e in PAGE_ORDER:
        print(f"{PT[e]:14}" + "".join(f"{r.get(e, 0):>24}" for _, r in runs))
    print(f"{'Total':14}" + "".join(f"{sum(r.values()):>24}" for _, r in runs))
    return runs, len(texts)


def main():
    lex = load_nrc()
    with open(CARDS_PATH, encoding="utf-8") as f:
        cards = json.load(f)
    docs = [c.get("story_text") or "" for c in cards if is_english(c.get("story_text") or "")]

    food = [w for w in FOOD_CANDIDATES if "trust" in lex.get(w, ())]
    trust_hits = Counter(t for d in docs for t in tokens(d) if "trust" in lex.get(t, ()))
    total_trust = sum(trust_hits.values())
    with_food = sum(1 for d in docs if "food" in tokens(d))

    print(f"corpus: {len(cards)} cards, {len(docs)} English responses analysed")
    print(f'"food" appears in {with_food} responses ({100 * with_food / len(docs):.0f}%)'
          f' and carries {trust_hits["food"]} of {total_trust} trust hits'
          f' ({100 * trust_hits["food"] / total_trust:.0f}%)')
    print(f"food-domain words the lexicon ties to trust: {', '.join(food)}"
          f" — {sum(trust_hits[w] for w in food)} hits"
          f" ({100 * sum(trust_hits[w] for w in food) / total_trust:.0f}%)\n")

    runs = [
        ("Original", profile(docs, lex)),
        ("sem food (trust)", profile(docs, lex, ["food"], "trust")),
        ("sem campo alim. (trust)", profile(docs, lex, food, "trust")),
        ("sem campo alim. (todas)", profile(docs, lex, food, "all")),
    ]

    print(f"{'Emoção':14}" + "".join(f"{name:>26}" for name, _ in runs))
    for e in sorted(PLUTCHIK, key=lambda x: -runs[0][1][x]):
        print(f"{PT[e]:14}" + "".join(f"{r[e]:>25.1f}%" for _, r in runs))

    print("\nordem por cenário:")
    for name, r in runs:
        print(f"  {name:24} " + " > ".join(PT[e] for e in sorted(PLUTCHIK, key=lambda x: -r[x])))


if __name__ == "__main__":
    main()
    main_dominant()
