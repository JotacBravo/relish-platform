"""Shared test helpers: model APIs and the network are faked, output goes to a temp folder."""
import base64
import importlib.util
import io
import json
import os
import sys
import types
import urllib.request

sys.dont_write_bytecode = True

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PROCESSING = os.path.join(ROOT, "processing")
DUMMY = os.path.join(ROOT, "dummy-data")


def load_script(relpath, name=None):
    """Import a processing script by path (e.g. 'normalization/normalize_dishes.py')."""
    path = os.path.join(PROCESSING, relpath)
    folder = os.path.dirname(path)
    if folder not in sys.path:            # sibling imports (sentiment_add_nofood -> sentiment_sensitivity)
        sys.path.insert(0, folder)
    spec = importlib.util.spec_from_file_location(name or os.path.splitext(os.path.basename(path))[0], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def feed(survey):
    """The public feed of one survey, as GET /api/survey/filtered returns it."""
    with open(os.path.join(DUMMY, "responses", f"{survey}_responses.json"), encoding="utf-8") as f:
        docs = json.load(f)
    return [{"Index": i + 1, "createdAt": d["createdAt"], **d["responses"]} for i, d in enumerate(docs)]


def story_cards():
    with open(os.path.join(DUMMY, "static", "data", "story_cards.json"), encoding="utf-8") as f:
        return json.load(f)


def message(text):
    """An Anthropic Messages API answer with one text block."""
    return types.SimpleNamespace(content=[types.SimpleNamespace(type="text", text=text)], stop_reason="end_turn")


class FakeAnthropic:
    """Stands in for anthropic.Anthropic: `respond(system, user_text)` returns the answer text."""
    respond = None
    calls = []

    def __init__(self, api_key=None):
        assert api_key, "the scripts must pass the key from the environment"
        self.messages = self

    def create(self, model, max_tokens, messages, system=None, **_):
        user = messages[0]["content"]
        FakeAnthropic.calls.append({"model": model, "system": system, "user": user})
        return message(FakeAnthropic.respond(system, user))


def items_in(user_text):
    """The JSON list of raw values a normalisation prompt sends."""
    return json.loads(user_text[user_text.index("["):user_text.rindex("]") + 1])


def png_bytes(size=(64, 64), color=(200, 80, 40, 255)):
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGBA", size, color).save(buf, "PNG")
    return buf.getvalue()


class FakeHTTPResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def gemini_image_response():
    data = base64.b64encode(png_bytes()).decode()
    return {"candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "image/png", "data": data}}]}}]}


def imagen_response():
    return {"predictions": [{"bytesBase64Encoded": base64.b64encode(png_bytes((48, 64))).decode()}]}


class NoNetwork:
    """Context manager: any urllib call that is not routed by `route(url, req)` fails the test."""

    def __init__(self, route=None):
        self.route = route
        self.urls = []

    def __enter__(self):
        self._orig = urllib.request.urlopen

        def fake(req, *a, **k):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            self.urls.append(url)
            if self.route:
                body = self.route(url, req)
                if body is not None:
                    return FakeHTTPResponse(json.dumps(body).encode())
            raise AssertionError(f"unexpected network call: {url}")

        urllib.request.urlopen = fake
        return self

    def __exit__(self, *a):
        urllib.request.urlopen = self._orig
        return False
