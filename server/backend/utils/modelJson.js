// Reads the JSON object a model returned as text, with or without a ``` block.

// The text inside the first fenced block, or the text itself when there is none.
// An opening fence with no closing one (an answer cut off at max_tokens) is
// stripped too, so the caller gets the real parse error, not a fence error.
export function stripCodeFence(text) {
  const s = String(text ?? '').trim();
  const closed = s.match(/```[a-zA-Z0-9_-]*[ \t]*\r?\n?([\s\S]*?)```/);
  if (closed) return closed[1].trim();
  return s.replace(/^```[a-zA-Z0-9_-]*[ \t]*\r?\n?/, '').trim();
}

// Parse the model's answer into a plain object. Throws when there is none.
export function parseModelJson(text) {
  const body = stripCodeFence(text);
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (err) {
    // prose around a bare object: take the outermost braces
    const a = body.indexOf('{');
    const b = body.lastIndexOf('}');
    if (a < 0 || b <= a) throw err;
    parsed = JSON.parse(body.slice(a, b + 1));
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('model answer is not a JSON object');
  }
  return parsed;
}
