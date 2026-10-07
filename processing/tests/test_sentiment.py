"""Sentiment scripts (processing/sentiment/) on the dummy stories. VADER is the
real library; the NRC lexicon is not distributed, so the tests use a tiny
lexicon file in the same format, written to a temporary folder."""
import json
import os
import tempfile
import unittest
from unittest import mock

from helpers import DUMMY, load_script

CARDS = os.path.join(DUMMY, "static", "data", "story_cards.json")
EMOTIONS = ["anger", "anticipation", "disgust", "fear", "joy", "negative", "positive", "sadness", "surprise", "trust"]
TINY_LEXICON = {   # word -> emotions flagged 1 (NRC word-level format)
    "food": ["trust", "joy", "positive"],
    "share": ["trust", "joy"],
    "slowly": ["anticipation"],
    "worry": ["fear", "sadness", "negative"],
    "expensive": ["anger", "negative"],
    "fun": ["joy", "anticipation"],
    "lost": ["sadness", "negative"],
    "surprise": ["surprise"],
}


def write_lexicon(folder):
    path = os.path.join(folder, "NRC-Emotion-Lexicon-Wordlevel-v0.92.txt")
    with open(path, "w", encoding="utf-8") as f:
        for word, flagged in TINY_LEXICON.items():
            for e in EMOTIONS:
                f.write(f"{word}\t{e}\t{1 if e in flagged else 0}\n")
    return path


class TestSentiment(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="sentiment-")
        cls.lexicon = write_lexicon(cls.tmp)
        cls.out = os.path.join(cls.tmp, "sentiment.json")
        mod = load_script("sentiment/sentiment_analysis.py")
        mod.CARDS_PATH, mod.NRC_PATH, mod.OUT_PATH = CARDS, cls.lexicon, cls.out
        mod.main()
        with open(cls.out, encoding="utf-8") as f:
            cls.doc = json.load(f)

    def test_same_structure_as_the_demo_file(self):
        with open(os.path.join(DUMMY, "static", "data", "sentiment.json"), encoding="utf-8") as f:
            demo = json.load(f)
        self.assertEqual(set(self.doc) - {"nofood_variant"}, set(demo) - {"nofood_variant"})
        self.assertEqual(set(self.doc["per_doc"][0]), set(demo["per_doc"][0]) - {"emotions_nofood", "food_n"})
        self.assertEqual(self.doc["n_total"], 24)

    def test_polarity_counts_add_up(self):
        sp = self.doc["sentence_polarity"]
        self.assertEqual(sum(v["n"] for v in sp.values()), self.doc["n_sentences"])
        for d in self.doc["per_doc"]:
            self.assertEqual(d["sent_pos"] + d["sent_neu"] + d["sent_neg"], d["n_sentences"])

    def test_nofood_variant_and_sensitivity(self):
        ss = load_script("sentiment/sentiment_sensitivity.py", name="sentiment_sensitivity")
        ss.CARDS_PATH, ss.NRC_PATH, ss.DATA_DIR = CARDS, self.lexicon, self.tmp
        add = load_script("sentiment/sentiment_add_nofood.py")
        add.ss = ss
        add.SENT_PATH = self.out
        self.assertEqual(add.main(write=True), 0)
        with open(self.out, encoding="utf-8") as f:
            doc = json.load(f)
        for d in doc["per_doc"]:
            self.assertIn("emotions_nofood", d)
            self.assertEqual(d["emotions_nofood"]["trust"] <= d["emotions"]["trust"] + 1e-9, True)
        with mock.patch("builtins.print"):
            ss.main()
            if hasattr(ss, "main_dominant"):
                ss.main_dominant()

    def test_missing_lexicon_is_explained(self):
        mod = load_script("sentiment/sentiment_analysis.py")
        mod.NRC_PATH = ""
        with self.assertRaises(SystemExit) as ctx:
            mod.load_nrc()
        self.assertIn("NRC_LEXICON_PATH", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
