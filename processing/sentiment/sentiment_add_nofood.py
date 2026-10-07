#!/usr/bin/env python3
"""Add the "without 'food'" variant to sentiment.json; the main numbers stay unchanged.

Usage: NRC_LEXICON_PATH=... python3 processing/sentiment/sentiment_add_nofood.py [--write]
"""

import json
import os
import sys

import sentiment_sensitivity as ss

SENT_PATH = os.path.join(ss.DATA_DIR, "sentiment.json")
TOL = 1e-3


def main(write):
    lex = ss.load_nrc()
    lex_nofood = ss.working_lexicon(lex, ["food"], "trust")
    with open(SENT_PATH, encoding="utf-8") as f:
        sent = json.load(f)
    with open(ss.CARDS_PATH, encoding="utf-8") as f:
        cards = {c["story_index"]: c for c in json.load(f)}

    problems, changed = [], 0
    for d in sent["per_doc"]:
        card = cards.get(d["i"])
        if card is None:
            problems.append(f"story {d['i']}: no card")
            continue
        text = card.get("story_text") or ""
        base = ss.doc_shares(text, lex, "tokens")
        if any(abs(base[e] - d["emotions"][e]) > TOL for e in ss.PLUTCHIK):
            problems.append(f"story {d['i']}: cannot reproduce the stored emotions")
            continue
        nf = ss.doc_shares(text, lex_nofood, "tokens")
        d["emotions_nofood"] = {e: round(nf[e], 4) for e in ss.PLUTCHIK}
        d["food_n"] = sum(1 for t in ss.tokens(text) if t == "food")
        changed += 1

    if problems:
        print("NOT writing; problems:", *problems, sep="\n  ")
        return 1

    sent["nofood_variant"] = ("emotions_nofood = the same NRC token shares as `emotions`, with the word "
                              "'food' removed from the trust list only (NRC tags it trust and joy); "
                              "food_n = occurrences of 'food'. See processing/sentiment/sentiment_sensitivity.py.")
    counts, counts_nf = {}, {}
    for d in sent["per_doc"]:
        for key, store in (("emotions", counts), ("emotions_nofood", counts_nf)):
            best, bv = None, 0.0
            for e in ss.PAGE_ORDER:           # same tie-break as the page
                if d[key].get(e, 0) > bv:
                    best, bv = e, d[key][e]
            if best:
                store[best] = store.get(best, 0) + 1
    print(f"{changed} stories reproduced and extended")
    print("dominant emotion, as the page counts it:  ", dict(sorted(counts.items(), key=lambda x: -x[1])))
    print("dominant emotion, without 'food' (trust): ", dict(sorted(counts_nf.items(), key=lambda x: -x[1])))
    if write:
        with open(SENT_PATH, "w", encoding="utf-8") as f:
            json.dump(sent, f, ensure_ascii=False, indent=2)
        print("written", SENT_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main("--write" in sys.argv))
