"""Batch normalisers on the dummy data with a fake model; checks {mapping, counts, top}."""
import json
import os
import tempfile
import unittest
from unittest import mock

from helpers import FakeAnthropic, feed, items_in, load_script

LIST_FIELDS = {"ingredients"}


def fake_normalise(system, user):
    values = items_in(user)
    if "ingredient" in system:
        return json.dumps({v: [v.strip().title()] for v in values})
    return json.dumps({v: v.strip().title() for v in values})


class BatchNormaliser:
    script = None
    output = None
    fields = ()

    def run_script(self):
        self.tmp = tempfile.mkdtemp(prefix="norm-")
        mod = load_script(self.script)
        mod.OUTPUT_PATH = os.path.join(self.tmp, self.output)
        mod.fetch_survey_data = lambda: feed("youth")
        mod.Anthropic = FakeAnthropic
        FakeAnthropic.respond = staticmethod(fake_normalise)
        FakeAnthropic.calls = []
        with mock.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key-not-real"}), \
                mock.patch.object(mod.time, "sleep", lambda s: None):
            mod.main()
        with open(mod.OUTPUT_PATH, encoding="utf-8") as f:
            return mod, json.load(f)

    def raw_counts(self):
        counts = {}
        for r in feed("youth"):
            for k in self.fields:
                v = r.get(k)
                if isinstance(v, str) and v.strip():
                    counts[v.strip()] = counts.get(v.strip(), 0) + 1
        return counts

    def test_output_format(self):
        mod, doc = self.run_script()
        self.assertEqual(sorted(doc), ["counts", "mapping", "top"])
        raw = self.raw_counts()
        self.assertEqual(set(doc["mapping"]), set(raw))
        mentions = sum(n for v, n in raw.items() if doc["mapping"][v] is not None)
        if self.output.startswith("ingredients"):
            mentions = sum(n * len(doc["mapping"][v]) for v, n in raw.items() if doc["mapping"][v])
        self.assertEqual(sum(doc["counts"].values()), mentions)
        self.assertEqual([list(t) for t in doc["top"]],
                         [list(t) for t in sorted(doc["counts"].items(), key=lambda x: x[1], reverse=True)])
        self.assertTrue(FakeAnthropic.calls)
        self.assertTrue(all(c["model"] == "claude-haiku-4-5" for c in FakeAnthropic.calls))

    def test_needs_key(self):
        mod = load_script(self.script)
        with mock.patch.dict(os.environ, {"ANTHROPIC_API_KEY": ""}):
            with self.assertRaises(SystemExit):
                mod.main()


class TestDishes(BatchNormaliser, unittest.TestCase):
    script = "normalization/normalize_dishes.py"
    output = "dishes_normalized.json"
    fields = ("iconic_dish_1", "iconic_dish_2", "iconic_dish_3")


class TestRegularDishes(BatchNormaliser, unittest.TestCase):
    script = "normalization/normalize_regular_dishes.py"
    output = "regular_dishes_normalized.json"
    fields = ("dish_1", "dish_2", "dish_3")


class TestIngredients(BatchNormaliser, unittest.TestCase):
    script = "normalization/normalize_ingredients.py"
    output = "ingredients_normalized.json"
    fields = ("ingredient_1", "ingredient_2", "ingredient_3")


class TestDesertIsland(BatchNormaliser, unittest.TestCase):
    script = "normalization/normalize_desert_island.py"
    output = "desert_island_normalized.json"
    fields = ("desert_island_food",)


class TestAffiliations(unittest.TestCase):
    def test_institutions_and_nationalities(self):
        tmp = tempfile.mkdtemp(prefix="norm-aff-")
        mod = load_script("normalization/normalize_affiliations.py")
        mod.OUT_DIR = tmp
        for cfg, name in ((mod.FIELDS["institution"], "institutions_normalized.json"),
                          (mod.FIELDS["nationality"], "nationalities_normalized.json")):
            cfg["out"] = os.path.join(tmp, name)
        mod.fetch = lambda survey: feed(survey)
        mod.Anthropic = FakeAnthropic
        FakeAnthropic.calls = []

        def respond(system, user):
            if "duplicate" in user:                     # consolidation pass
                return "{}"
            values = items_in(user)
            if "nationality" in system:
                return json.dumps({v: v.strip().title() for v in values})
            return "```json\n" + json.dumps({v: v.strip() for v in values}) + "\n```"
        FakeAnthropic.respond = staticmethod(respond)

        with mock.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key-not-real"}), \
                mock.patch.object(mod.time, "sleep", lambda s: None), \
                mock.patch("sys.argv", ["normalize_affiliations.py"]):
            mod.main()
        for name, field in (("institutions_normalized.json", "institution"), ("nationalities_normalized.json", "nationality")):
            with open(os.path.join(tmp, name), encoding="utf-8") as f:
                doc = json.load(f)
            self.assertEqual(sorted(doc), ["counts", "mapping", "top"])
            raw = {r[field].strip() for s in ("futures", "visions") for r in feed(s) if r.get(field)}
            self.assertTrue(raw <= set(doc["mapping"]))
        self.assertTrue(any("duplicate" in c["user"] for c in FakeAnthropic.calls))


if __name__ == "__main__":
    unittest.main()
