"""normalize_social_accounts.py with a fake model and the synthetic answers.
No network; the output goes to a temporary folder and is compared with the
format of dummy-data/static/data/social_accounts_normalized.json."""
import json
import os
import re
import tempfile
import types
import unittest

from helpers import DUMMY, feed, load_script

EXISTING = os.path.join(DUMMY, "static", "data", "social_accounts_normalized.json")


def load_module():
    return load_script("normalization/normalize_social_accounts.py")


def compact(v):
    return re.sub(r"[._\s-]", "", v.lower())


# Synthetic answers: the dummy-data youth feed (fictional creators) plus a few
# edge cases written for this test.
def synthetic_feed():
    rows = feed("youth")
    extra = [
        "@greenpotdiaries, TikTok: @onepanstudio",
        "Instagram, cooking videos",
        "five.euro.feasts,, Spice Atlas on YouTube",
        "https://www.youtube.com/@seatotable",
        "Unheard Of Kitchen",                 # unknown account: kept
        "Market Mornings and Spice Atlas",    # two in one entry: first one kept
    ]
    for text in extra:
        rows.append({"Index": len(rows) + 1, "follow_social_media": "Yes", "list_social_accounts": text})
    return rows


KNOWN = ["Weeknight Kitchen", "Green Pot Diaries", "Nonna's Notebook", "Five Euro Feasts",
         "Plant Plate Lab", "One Pan Studio", "Market Mornings", "Spice Atlas",
         "Bread and Butter Club", "Sea to Table"]
JUNK = {"instagram", "cooking videos", "tiktok"}


def fake_normalize(raw):
    """Stands in for the model, following the prompt's rules."""
    v = raw.strip()
    if v.lower() in JUNK:
        return None
    v = re.sub(r"^https?://\S*/@", "", v)
    v = re.sub(r"^(tiktok|instagram|youtube)\s*:\s*", "", v, flags=re.I)
    v = re.sub(r"\s+on\s+(youtube|instagram|tiktok)$", "", v, flags=re.I)
    v = v.split(" and ")[0] if " and " in v and not v.lower().startswith("bread and") else v
    v = v.lstrip("@")
    for name in KNOWN:
        if compact(name).replace("'", "") == compact(v).replace("'", ""):
            return name
    return v.title()


class FakeMessages:
    def __init__(self):
        self.calls = 0

    def create(self, model, max_tokens, system, messages):
        self.calls += 1
        assert model == "claude-haiku-4-5"
        assert "social media" in system
        items = json.loads(messages[0]["content"].split("\n\n", 1)[1])
        answer = {raw: fake_normalize(raw) for raw in items}
        if "Unheard Of Kitchen" in answer:     # one value left out: script falls back to raw
            answer.pop("Unheard Of Kitchen")
            FakeMessages.omitted = True
        if self.calls == 2:                    # a stray list: script keeps the first item
            answer[items[0]] = [answer[items[0]] or "X", "Other"]
        text = json.dumps(answer, ensure_ascii=False)
        if self.calls == 3:                    # fenced answer
            text = "```json\n" + text + "\n```"
        return types.SimpleNamespace(content=[types.SimpleNamespace(text=text)])


class FakeAnthropic:
    instances = []

    def __init__(self, api_key):
        assert api_key == "test-key-not-real"
        self.messages = FakeMessages()
        FakeAnthropic.instances.append(self)


def dashboard_count(rows, mapping):
    """Python port of the social-accounts branch of processFrequencyData
    (SurveyDashboard.jsx): split on commas, three lookups, null = discarded."""
    counts, discarded = {}, 0
    for r in rows:
        value = r.get("list_social_accounts")
        if value in (None, ""):
            continue
        for part in [p.strip() for p in str(value).strip().split(",")]:
            if not part:
                continue
            v = part
            mapped = mapping.get(v, mapping.get(v.lower(), mapping.get(compact(v), "<missing>")))
            if mapped is None:
                discarded += 1
                continue
            if isinstance(mapped, str) and mapped != "<missing>":
                v = mapped
            counts[v] = counts.get(v, 0) + 1
    return counts, discarded


def schema(doc):
    return {
        "top_keys": sorted(doc),
        "mapping_value_types": sorted({type(v).__name__ for v in doc["mapping"].values()}),
        "counts_type": type(doc["counts"]).__name__,
        "top_type": type(doc["top"]).__name__,
    }


def lookup_form_violations(mapping):
    """Counts (never prints) keys whose lowercase/compact form is missing or
    maps elsewhere, split by non-null / null keys, plus normalized names that
    do not map to themselves in their three forms."""
    v_nonnull = v_null = v_names = 0
    for k, v in mapping.items():
        if not k:
            continue
        if any(f and mapping.get(f, "<missing>") != v for f in (k.lower(), compact(k))):
            if v is None:
                v_null += 1
            else:
                v_nonnull += 1
    for name in {v for v in mapping.values() if isinstance(v, str)}:
        if any(f and mapping.get(f) != name for f in (name, name.lower(), compact(name))):
            v_names += 1
    return {"non_null": v_nonnull, "null": v_null, "names": v_names}


class TestNormalizeSocialAccounts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_module()
        cls.tmp = tempfile.mkdtemp(prefix="social-norm-")
        cls.out = os.path.join(cls.tmp, "social_accounts_normalized.json")
        cls.feed = synthetic_feed()
        cls.mod.OUTPUT_PATH = cls.out                      # never the real file
        cls.mod.fetch_survey_data = lambda: cls.feed       # never the API
        cls.mod.Anthropic = FakeAnthropic                  # never the model
        cls._sleep = cls.mod.time.sleep
        cls.mod.time.sleep = lambda s: None
        cls.mod.BATCH_SIZE = 10                            # several batches
        os.environ["ANTHROPIC_API_KEY"] = "test-key-not-real"
        cls.mod.main()
        with open(cls.out, encoding="utf-8") as f:
            cls.doc = json.load(f)
        with open(EXISTING, encoding="utf-8") as f:
            cls.existing = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls.mod.time.sleep = cls._sleep

    def test_same_schema_as_existing_file(self):
        self.assertEqual(schema(self.doc)["top_keys"], schema(self.existing)["top_keys"])
        self.assertEqual(schema(self.doc)["counts_type"], "dict")
        self.assertEqual(schema(self.doc)["top_type"], "list")
        self.assertTrue(set(schema(self.doc)["mapping_value_types"]) <= {"str", "NoneType"})
        self.assertTrue(set(schema(self.existing)["mapping_value_types"]) <= {"str", "NoneType"})

    def test_lookup_forms_like_existing_file(self):
        self.assertEqual(lookup_form_violations(self.existing["mapping"]), {"non_null": 0, "null": 0, "names": 0})
        self.assertEqual(lookup_form_violations(self.doc["mapping"]), {"non_null": 0, "null": 0, "names": 0})

    def test_keys_are_single_trimmed_accounts(self):
        for k in self.doc["mapping"]:
            self.assertNotIn(",", k)
            self.assertEqual(k, k.strip())
            self.assertTrue(k)

    def test_counts_and_top_empty_like_existing_file(self):
        self.assertEqual(self.existing["counts"], {})
        self.assertEqual(self.existing["top"], [])
        self.assertEqual(self.doc["counts"], {})
        self.assertEqual(self.doc["top"], [])

    def test_normalization_rules_on_edge_cases(self):
        m = self.doc["mapping"]
        self.assertEqual(m["@greenpotdiaries"], "Green Pot Diaries")
        self.assertEqual(m["TikTok: @onepanstudio"], "One Pan Studio")
        self.assertEqual(m["five.euro.feasts"], "Five Euro Feasts")
        self.assertEqual(m["Spice Atlas on YouTube"], "Spice Atlas")
        self.assertEqual(m["https://www.youtube.com/@seatotable"], "Sea to Table")
        self.assertIsNone(m["Instagram"])
        self.assertIsNone(m["cooking videos"])
        self.assertEqual(m["Unheard Of Kitchen"], "Unheard Of Kitchen")

    def test_dashboard_resolves_every_account(self):
        counts, discarded = dashboard_count(self.feed, self.doc["mapping"])
        self.assertNotIn("<missing>", counts)
        names = {v for v in self.doc["mapping"].values() if isinstance(v, str)}
        self.assertTrue(set(counts) <= names, set(counts) - names)
        self.assertEqual(discarded, 2)          # "Instagram" and "cooking videos"

    def test_model_failures_handled_like_other_scripts(self):
        calls = FakeAnthropic.instances[-1].messages.calls
        self.assertGreaterEqual(calls, 3)       # stray list and fenced answer exercised
        self.assertTrue(getattr(FakeMessages, "omitted", False))
        self.assertEqual(self.doc["mapping"]["Unheard Of Kitchen"], "Unheard Of Kitchen")   # raw fallback

    def test_lookup_forms_never_overwrite_model_answers(self):
        m = self.mod.add_lookup_forms({"Spice Atlas": "Spice Atlas", "spice atlas": None, "SPICE.ATLAS": "Spice Atlas"})
        self.assertIsNone(m["spice atlas"])               # explicit answer kept
        self.assertEqual(m["spiceatlas"], "Spice Atlas")  # compact form added

    def test_no_key_exits(self):
        os.environ.pop("ANTHROPIC_API_KEY")
        with self.assertRaises(SystemExit):
            self.mod.main()
        os.environ["ANTHROPIC_API_KEY"] = "test-key-not-real"


if __name__ == "__main__":
    unittest.main(verbosity=2)
