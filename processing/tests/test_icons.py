"""Icon scripts (processing/icons/) with a fake Gemini and a fake Imagen; all
files go to temporary folders, never to relish/public/icons."""
import json
import os
import shutil
import tempfile
import unittest
from unittest import mock

from helpers import ROOT, NoNetwork, feed, gemini_image_response, imagen_response, load_script, png_bytes

ENV = {"GEMINI_API_KEY": "test-key-not-real"}


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)


def gemini_route(url, req):
    if "generativelanguage.googleapis.com" in url and "gemini-2.5-flash-image" in url:
        return gemini_image_response()
    return None


class TestGeminiIcons(unittest.TestCase):
    def test_dish_icons(self):
        tmp = tempfile.mkdtemp(prefix="icons-dish-")
        mod = load_script("icons/generate_dish_icons.py")
        mod.NORMALIZED_PATH = os.path.join(tmp, "regular_dishes_normalized.json")
        write_json(mod.NORMALIZED_PATH, {"mapping": {}, "counts": {"Lentil Soup": 9, "Pasta": 7, "Rare Dish": 1}, "top": []})
        mod.ICONS_DIR = os.path.join(tmp, "dishes")
        with NoNetwork(gemini_route) as net, mock.patch.dict(os.environ, ENV), mock.patch.object(mod.time, "sleep", lambda s: None):
            mod.main()
        with open(os.path.join(mod.ICONS_DIR, "manifest.json")) as f:
            manifest = json.load(f)
        self.assertEqual(manifest, {"Lentil Soup": "lentil_soup.png", "Pasta": "pasta.png"})
        self.assertEqual(len(net.urls), 2)

    def test_ingredient_icons_only_with_footprint_data(self):
        tmp = tempfile.mkdtemp(prefix="icons-ing-")
        mod = load_script("icons/generate_ingredient_icons.py")
        with open(mod.SUST_PATH, encoding="utf-8") as f:
            with_footprint = [i["name"] for i in json.load(f)["ingredients"]]
        mod.NORMALIZED_PATH = os.path.join(tmp, "ingredients_normalized.json")
        write_json(mod.NORMALIZED_PATH, {"mapping": {}, "top": [], "counts": {
            with_footprint[0]: 20, with_footprint[1]: 10, "Unlisted Ingredient": 30, with_footprint[2]: 2}})
        mod.ICONS_DIR = os.path.join(tmp, "ingredients")
        with NoNetwork(gemini_route), mock.patch.dict(os.environ, ENV), mock.patch.object(mod.time, "sleep", lambda s: None):
            mod.main()
        with open(os.path.join(mod.ICONS_DIR, "manifest.json")) as f:
            manifest = json.load(f)
        self.assertEqual(sorted(manifest), sorted([with_footprint[0], with_footprint[1]]))


class TestMenuIcons(unittest.TestCase):
    def test_menu_icons_with_imagen(self):
        tmp = tempfile.mkdtemp(prefix="icons-menu-")
        mod = load_script("icons/generate_menu_icons.py")
        mod.ICONS_DIR = tmp
        mod.MANIFEST = os.path.join(tmp, "manifest.json")
        write_json(mod.MANIFEST, {"Pasta": "pasta.png"})
        mod.get_access_token = lambda: ("fake-token", "fake-project")

        def route(url, req):
            if url.startswith(mod.API):
                return feed("youth")
            if "aiplatform.googleapis.com" in url:
                return imagen_response()
            return None
        with NoNetwork(route), mock.patch("sys.argv", ["generate_menu_icons.py", "--sleep", "0"]):
            mod.main()
        with open(mod.MANIFEST) as f:
            manifest = json.load(f)
        self.assertIn("Pasta", manifest)
        self.assertGreater(len(manifest), 1)
        for name in manifest.values():
            self.assertTrue(os.path.exists(os.path.join(tmp, name)) or name == "pasta.png")


class TestCompressIcons(unittest.TestCase):
    def test_resizes_and_flattens_in_place(self):
        from PIL import Image
        tmp = tempfile.mkdtemp(prefix="icons-compress-")
        path = os.path.join(tmp, "big.png")
        with open(path, "wb") as f:
            f.write(png_bytes((1024, 1024), (10, 120, 60, 128)))
        mod = load_script("icons/compress_icons.py")
        mod.DIRS = [tmp]
        with mock.patch("sys.argv", ["compress_icons.py"]):
            mod.main()
        with Image.open(path) as im:
            self.assertEqual(im.size, (256, 256))
            self.assertEqual(im.mode, "P")

    def test_default_folders_are_the_ones_the_app_reads(self):
        mod = load_script("icons/compress_icons.py")
        self.assertEqual([os.path.relpath(d, ROOT) for d in mod.DIRS],
                         [os.path.join("relish", "public", "icons", "dishes_v2"),
                          os.path.join("relish", "public", "icons", "ingredients")])


if __name__ == "__main__":
    unittest.main()
