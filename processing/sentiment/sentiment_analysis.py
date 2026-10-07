#!/usr/bin/env python3
"""Polarity (VADER, per sentence) and emotions (NRC lexicon) of the 2050 stories.

Reads story_cards.json and writes sentiment.json in $RELISH_DATA_DIR.
Usage: NRC_LEXICON_PATH=... python3 processing/sentiment/sentiment_analysis.py
"""

import json
import os
import re
import statistics as st
from collections import Counter

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = (os.environ.get("RELISH_DATA_DIR") or os.path.join(HERE, "..", "output"))
CARDS_PATH = os.path.join(DATA_DIR, "story_cards.json")
# The NRC Emotion Lexicon is not distributed with this repository (see processing/README.md).
NRC_PATH = (os.environ.get("NRC_LEXICON_PATH") or "")
OUT_PATH = os.path.join(DATA_DIR, "sentiment.json")

PLUTCHIK = ["anticipation", "joy", "trust", "surprise", "fear", "sadness", "disgust", "anger"]
POS_T, NEG_T = 0.05, -0.05  # VADER standard decision thresholds

EN_STOP = set(
    "the a an and or but if of to in on at for with from by as is are was were be been "
    "being have has had do does did i you he she it we they my your our their this that "
    "these those not no so then than when while because about into over under".split()
)
WORD_RE = re.compile(r"[a-zA-Z']+")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def load_cards():
    with open(CARDS_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_nrc():
    """word -> set(emotions), 8 Plutchik emotions only (tolerant of malformed lines)."""
    if not NRC_PATH or not os.path.exists(NRC_PATH):
        raise SystemExit("ERROR: set NRC_LEXICON_PATH to NRC-Emotion-Lexicon-Wordlevel-v0.92.txt "
                         "(the lexicon is not included; see processing/README.md)")
    lex = {}
    with open(NRC_PATH, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) != 3:
                continue
            word, emotion, flag = parts
            if flag == "1" and emotion in PLUTCHIK:
                lex.setdefault(word, set()).add(emotion)
    return lex


def tokens(text):
    return [t.lower() for t in WORD_RE.findall(text or "")]


def sentences(text):
    return [s.strip() for s in SENT_SPLIT.split(text or "") if len(s.strip()) > 3]


def is_english(text):
    toks = tokens(text)
    if len(toks) < 5:
        return False
    return sum(1 for t in toks if t in EN_STOP) / len(toks) > 0.06


def label(compound):
    if compound >= POS_T:
        return "positive"
    if compound <= NEG_T:
        return "negative"
    return "neutral"


def llm_tone_to_polarity(tone):
    t = (tone or "").lower()
    if re.search(r"joy|hope|optim|serene|accept|warm|nostalg", t):
        return "positive"
    if re.search(r"dread|anx|fear|grim|dystop", t):
        return "negative"
    return "neutral"


def cohens_kappa(a, b, classes):
    n = len(a)
    if not n:
        return 0.0, 0.0
    idx = {c: i for i, c in enumerate(classes)}
    k = len(classes)
    conf = [[0] * k for _ in range(k)]
    for x, y in zip(a, b):
        conf[idx[x]][idx[y]] += 1
    po = sum(conf[i][i] for i in range(k)) / n
    row = [sum(conf[i]) for i in range(k)]
    col = [sum(conf[i][j] for i in range(k)) for j in range(k)]
    pe = sum((row[i] / n) * (col[i] / n) for i in range(k))
    return ((po - pe) / (1 - pe) if (1 - pe) else 0.0), po


def kappa_strength(k):
    if k < 0: return "poor"
    if k < 0.20: return "slight"
    if k < 0.40: return "fair"
    if k < 0.60: return "moderate"
    if k < 0.80: return "substantial"
    return "almost perfect"


def histogram(values):
    bins = [(-1.0 + 0.2 * i, -1.0 + 0.2 * (i + 1)) for i in range(10)]
    out = []
    for lo, hi in bins:
        cnt = sum(1 for x in values if x >= lo and (x < hi or (hi == 1.0 and x <= hi)))
        out.append({"lo": round(lo, 1), "hi": round(hi, 1), "n": cnt})
    return out


def main():
    cards = load_cards()
    nrc = load_nrc()
    vader = SentimentIntensityAnalyzer()

    per_doc = []
    all_sentence_compounds = []
    sent_label_counts = Counter()
    doc_label_counts = Counter()          # document-level (whole text), for the saturation contrast
    kappa_sentence, kappa_llm = [], []

    for c in cards:
        text = c.get("story_text") or ""
        if not is_english(text):
            continue

        # --- Polarity at sentence level (removes document-length saturation) ---
        sents = sentences(text) or [text]
        s_comps = [vader.polarity_scores(s)["compound"] for s in sents]
        all_sentence_compounds.extend(s_comps)
        s_labels = [label(x) for x in s_comps]
        for sl in s_labels:
            sent_label_counts[sl] += 1
        mean_sc = st.mean(s_comps) if s_comps else 0.0
        doc_polarity = label(mean_sc)  # a document = the mean of its sentences

        # document-level score on the whole text, kept only to show the bias
        doc_compound = vader.polarity_scores(text)["compound"]
        doc_label_counts[label(doc_compound)] += 1

        # --- Emotion (NRC EmoLex): share of emotion-bearing tokens per emotion ---
        toks = tokens(text)
        emo_counts = Counter()
        emo_total = 0
        for tok in toks:
            ems = nrc.get(tok)
            if ems:
                emo_total += 1
                for e in ems:
                    emo_counts[e] += 1
        emo_share = {e: (emo_counts.get(e, 0) / emo_total if emo_total else 0.0) for e in PLUTCHIK}

        n_s = len(s_comps)
        per_doc.append({
            "i": c.get("story_index"),
            "polarity": doc_polarity,                     # by mean sentence compound
            "mean_sentence_compound": round(mean_sc, 4),
            "doc_compound": round(doc_compound, 4),       # whole-text score (saturates)
            "n_sentences": n_s,
            "sent_pos": s_labels.count("positive"),
            "sent_neu": s_labels.count("neutral"),
            "sent_neg": s_labels.count("negative"),
            "emotions": {e: round(v, 4) for e, v in emo_share.items()},
        })

        if c.get("emotional_tone"):
            kappa_sentence.append(doc_polarity)
            kappa_llm.append(llm_tone_to_polarity(c["emotional_tone"]))

    n = len(per_doc)
    n_sent = sum(sent_label_counts.values())

    def pct_block(counter, total):
        return {cls: {"n": counter.get(cls, 0),
                      "pct": round(100 * counter.get(cls, 0) / total, 1) if total else 0.0}
                for cls in ("positive", "neutral", "negative")}

    # per-document polarity (by mean sentence compound)
    doc_by_sentence = Counter(d["polarity"] for d in per_doc)

    # emotion aggregates
    emotions = []
    for e in PLUTCHIK:
        shares = [d["emotions"][e] for d in per_doc]
        docs_with = sum(1 for d in per_doc if d["emotions"][e] > 0)
        emotions.append({
            "key": e,
            "mean_share": round(100 * st.mean(shares), 1) if shares else 0.0,
            "docs_with_pct": round(100 * docs_with / n, 1) if n else 0.0,
        })
    emotions.sort(key=lambda x: x["mean_share"], reverse=True)

    kappa, po = cohens_kappa(kappa_sentence, kappa_llm, ["positive", "neutral", "negative"])

    out = {
        "method": {
            "unit": "sentence",
            "polarity": "VADER (Hutto & Gilbert, 2014), scored per sentence to avoid document-length saturation; thresholds +/-0.05",
            "emotion": "NRC EmoLex (Mohammad & Turney, 2013), 8 Plutchik emotions, mean token share (dominated by food vocabulary)",
            "agreement": "Cohen's kappa vs. a 3-class polarity projection of the prior LLM tone labels",
            "language_filter": "English subset via stopword-ratio heuristic (>6% function words)",
            "limitations": "Lexicon methods do not capture sarcasm, irony or broader context; English subset only.",
        },
        "n_total": len(cards),
        "n_analyzed": n,
        "n_sentences": n_sent,
        # PRIMARY, reported figure: sentence-level polarity
        "sentence_polarity": pct_block(sent_label_counts, n_sent),
        "sentence_compound_mean": round(st.mean(all_sentence_compounds), 3) if all_sentence_compounds else 0.0,
        "sentence_compound_histogram": histogram(all_sentence_compounds),
        # documents summarised by their mean sentence compound
        "doc_polarity_by_sentence": pct_block(doc_by_sentence, n),
        # the saturation contrast: whole-document scoring vs sentence-level
        "saturation": {
            "doc_level": pct_block(doc_label_counts, n),
            "sentence_level": pct_block(sent_label_counts, n_sent),
        },
        "emotions": emotions,
        "agreement": {
            "cohens_kappa": round(kappa, 3),
            "observed_agreement": round(po, 3),
            "strength": kappa_strength(kappa),
            "n": len(kappa_sentence),
        },
        "per_doc": per_doc,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    sp = out["sentence_polarity"]
    dl = out["saturation"]["doc_level"]
    print(f"Analyzed {n}/{len(cards)} responses ({n_sent} sentences), English subset")
    print(f"Sentence-level polarity : pos {sp['positive']['pct']}%  neu {sp['neutral']['pct']}%  neg {sp['negative']['pct']}%"
          f"  | mean sentence compound {out['sentence_compound_mean']}")
    print(f"Document-level (saturated): pos {dl['positive']['pct']}%  neu {dl['neutral']['pct']}%  neg {dl['negative']['pct']}%")
    print("Top emotions:", ", ".join(f"{e['key']} {e['mean_share']}%" for e in emotions[:4]))
    print(f"Agreement with prior LLM tones: kappa={out['agreement']['cohens_kappa']} ({out['agreement']['strength']}), n={out['agreement']['n']}")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
