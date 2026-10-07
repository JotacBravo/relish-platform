"""RELISH Futures card pipeline (processing/s2_generation/) on the dummy stories,
with a fake language model and a fake Imagen. Nothing leaves the machine."""
import json
import os
import re
import shutil
import stat
import subprocess
import tempfile
import unittest
from unittest import mock

from helpers import PROCESSING, FakeAnthropic, NoNetwork, feed, imagen_response, load_script, png_bytes, story_cards

ENV = {"ANTHROPIC_API_KEY": "test-key-not-real"}


def card_v1(system, user):
    return json.dumps({
        "title": "A Synthetic Title", "swipe_hook": "I cook, therefore I am.",
        "image_prompt": "A kitchen table with a pot of soup", "bio": "Soup person.",
        "emotional_tone": "quiet joy", "themes": ["#homecooking", "#nostalgia", "#localfood"],
        "relevant": True,
    })


class TestGenerateStoryCards(unittest.TestCase):
    def test_creates_one_card_per_story(self):
        tmp = tempfile.mkdtemp(prefix="s2-cards-")
        mod = load_script("s2_generation/generate_story_cards.py")
        mod.OUTPUT_PATH = os.path.join(tmp, "story_cards.json")
        stories = feed("visions")
        mod.fetch_stories = lambda: [s for s in stories if s.get("day_in_life_2050", "").strip()]
        mod.Anthropic = FakeAnthropic
        FakeAnthropic.respond = staticmethod(card_v1)
        with mock.patch.dict(os.environ, ENV), mock.patch.object(mod.time, "sleep", lambda s: None):
            mod.main()
        with open(mod.OUTPUT_PATH, encoding="utf-8") as f:
            cards = json.load(f)
        self.assertEqual(len(cards), len(stories))
        for c, s in zip(cards, stories):
            self.assertEqual(c["story_index"], s["Index"])
            self.assertEqual(c["responded_at"], s["createdAt"])
            self.assertTrue(c["relevant"])
        # a second run processes nothing new
        FakeAnthropic.calls = []
        with mock.patch.dict(os.environ, ENV):
            mod.main()
        self.assertEqual(FakeAnthropic.calls, [])


class TestRewriteStoryCards(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="s2-rewrite-")
        self.mod = load_script("s2_generation/rewrite_story_cards.py")
        self.mod.CARDS_PATH = os.path.join(self.tmp, "story_cards.json")
        self.mod.BACKUP_PATH = os.path.join(self.tmp, "story_cards_pre_v2_backup.json")
        cards = story_cards()
        for c in cards:
            c.pop("card_version", None)
        with open(self.mod.CARDS_PATH, "w", encoding="utf-8") as f:
            json.dump(cards, f)
        self.cards = cards

    def test_v2_copy_with_age_band_not_birth_year(self):
        mod = self.mod
        mod.Anthropic = FakeAnthropic
        FakeAnthropic.calls = []
        vocab, tones = mod.HASHTAG_VOCAB, mod.TONE_OPTIONS

        def respond(system, user):
            return "Here it is:\n```json\n" + json.dumps({
                "title": "Rooftop Beans", "swipe_hook": "We grow beans upstairs.",
                "summary": "A synthetic summary.", "bio": "Bean grower.",
                "emotional_tone": "Quiet Joy", "themes": [vocab[0], "#notinthevocabulary", vocab[3], vocab[5]],
                "image_prompt": "Beans on a rooftop at dawn",
            }) + "\n```"
        FakeAnthropic.respond = staticmethod(respond)
        with mock.patch.dict(os.environ, ENV), mock.patch("sys.argv", ["rewrite_story_cards.py"]), \
                mock.patch.object(mod.time, "sleep", lambda s: None):
            mod.main()
        with open(mod.CARDS_PATH, encoding="utf-8") as f:
            cards = json.load(f)
        self.assertTrue(os.path.exists(mod.BACKUP_PATH))
        self.assertTrue(all(c["card_version"] == 2 for c in cards))
        for c in cards:
            self.assertTrue(set(c["themes"]) <= set(vocab))
            self.assertEqual(c["emotional_tone"], "quiet joy")
        self.assertEqual(len(FakeAnthropic.calls), len(cards))
        self.assertTrue(all(call["model"] == "claude-sonnet-4-6" for call in FakeAnthropic.calls))
        for call, card in zip(FakeAnthropic.calls, self.cards):
            self.assertNotIn(str(card["birth_year"]), call["user"])
            self.assertRegex(call["user"], r"aged (under 18|18–24|25–34|35\+|unknown age),")

    def test_age_band(self):
        band = self.mod.age_band
        self.assertEqual(band({"birth_year": 2004, "responded_at": "2026-03-01T00:00:00Z"}), "18–24")
        self.assertEqual(band({"birth_year": 1995, "responded_at": "2026-03-01"}), "25–34")
        self.assertEqual(band({"birth_year": 1980, "responded_at": "2026-03-01"}), "35+")
        self.assertEqual(band({"birth_year": 2010, "responded_at": "2026-03-01"}), "under 18")
        self.assertEqual(band({"birth_year": ""}), "unknown age")


class TestRelevanceAndImagePrompts(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="s2-flags-")
        self.cards_path = os.path.join(self.tmp, "story_cards.json")
        cards = story_cards()
        for c in cards:
            c.pop("relevant", None)
        with open(self.cards_path, "w", encoding="utf-8") as f:
            json.dump(cards, f)

    def read(self):
        with open(self.cards_path, encoding="utf-8") as f:
            return json.load(f)

    def test_evaluate_relevance(self):
        mod = load_script("s2_generation/evaluate_relevance.py")
        mod.CARDS_PATH = self.cards_path
        mod.Anthropic = FakeAnthropic
        target = self.read()[1]["story_text"][:40]
        FakeAnthropic.respond = staticmethod(lambda system, user: "NO" if target in user else "YES")
        with mock.patch.dict(os.environ, ENV), mock.patch("sys.argv", ["evaluate_relevance.py"]), \
                mock.patch.object(mod.time, "sleep", lambda s: None):
            mod.main()
        flags = [c["relevant"] for c in self.read()]
        self.assertEqual(flags.count(False), 1)
        self.assertFalse(flags[1])

    def test_regenerate_image_prompts(self):
        mod = load_script("s2_generation/regenerate_image_prompts.py")
        mod.CARDS_PATH = self.cards_path
        mod.Anthropic = FakeAnthropic
        FakeAnthropic.respond = staticmethod(lambda system, user: '"A synthetic scene with a 3D food printer"')
        with mock.patch.dict(os.environ, ENV), mock.patch("sys.argv", ["regenerate_image_prompts.py", "--indices", "1,2"]), \
                mock.patch.object(mod.time, "sleep", lambda s: None):
            mod.main()
        cards = {c["story_index"]: c for c in self.read()}
        for i in (1, 2):
            self.assertEqual(cards[i]["image_prompt"], "A synthetic scene with a 3D food printer")
            self.assertTrue(cards[i]["needs_new_image"])
        self.assertNotIn("needs_new_image", cards[3])


class TestImages(unittest.TestCase):
    def test_imagen_then_web_derivatives(self):
        tmp = tempfile.mkdtemp(prefix="s2-images-")
        cards_path = os.path.join(tmp, "story_cards.json")
        with open(cards_path, "w", encoding="utf-8") as f:
            json.dump(story_cards(), f)

        gen = load_script("s2_generation/generate_story_images.py")
        gen.CARDS_PATH = cards_path
        gen.IMAGES_DIR = os.path.join(tmp, "story_cards")
        gen.get_access_token = lambda: ("fake-token", "fake-project")
        prompts = []

        def route(url, req):
            if "aiplatform.googleapis.com" in url and "fake-project" in url:
                prompts.append(json.loads(req.data)["instances"][0]["prompt"])
                return imagen_response()
            return None
        with NoNetwork(route), mock.patch("sys.argv", ["generate_story_images.py", "--limit", "3", "--sleep", "0"]):
            gen.main()
        made = sorted(f for f in os.listdir(gen.IMAGES_DIR) if f.endswith(".png"))
        self.assertEqual(made, ["story_1.png", "story_2.png", "story_3.png"])
        self.assertTrue(all(p.startswith("Gouache illustration, set in the year 2050") for p in prompts))

        opt = load_script("s2_generation/optimize_card_images.py")
        opt.SRC_DIR = gen.IMAGES_DIR
        opt.WEB_DIR = os.path.join(tmp, "story_cards_web")
        with mock.patch("sys.argv", ["optimize_card_images.py"]):
            opt.main()
        with open(os.path.join(opt.WEB_DIR, "manifest.json")) as f:
            manifest = json.load(f)
        self.assertEqual(manifest["indices"], [1, 2, 3])
        self.assertTrue(os.path.exists(os.path.join(opt.WEB_DIR, "story_2.webp")))

    def test_images_need_credentials(self):
        gen = load_script("s2_generation/generate_story_images.py")
        gen.CREDENTIALS_PATH = ""
        with self.assertRaises(SystemExit):
            gen.get_access_token()


class TestPipelineScript(unittest.TestCase):
    SCRIPT = os.path.join(PROCESSING, "s2_generation", "process_new_stories.sh")

    def run_pipeline(self, key):
        tmp = tempfile.mkdtemp(prefix="s2-pipeline-")
        calls = os.path.join(tmp, "calls.txt")
        stub = os.path.join(tmp, "python-stub")
        with open(stub, "w") as f:
            f.write(f'#!/bin/sh\necho "$(basename "$1")" >> "{calls}"\n')
        os.chmod(stub, os.stat(stub).st_mode | stat.S_IEXEC)
        env = {"PATH": os.environ["PATH"], "PYTHON": stub, "LOG_FILE": os.path.join(tmp, "pipeline.log"), "TMPDIR": tmp}
        if key:
            env["ANTHROPIC_API_KEY"] = key
        proc = subprocess.run(["bash", self.SCRIPT], env=env, capture_output=True, text=True)
        steps = open(calls).read().split() if os.path.exists(calls) else []
        return proc.returncode, steps

    def test_runs_the_v2_steps_in_order(self):
        code, steps = self.run_pipeline("test-key-not-real")
        self.assertEqual(code, 0)
        self.assertEqual(steps, ["generate_story_cards.py", "rewrite_story_cards.py",
                                 "generate_story_images.py", "optimize_card_images.py"])

    def test_stops_without_key(self):
        code, steps = self.run_pipeline(None)
        self.assertEqual(code, 1)
        self.assertEqual(steps, [])


if __name__ == "__main__":
    unittest.main()
