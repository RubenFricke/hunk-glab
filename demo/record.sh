#!/usr/bin/env bash
# Records the README demo: makes an isolated Hunk config with a fixed theme,
# runs demo/hero.tape with this checkout as the extension, checks the GIF, and
# puts it in demo/hero.gif.
# Needs vhs (which brings ttyd and ffmpeg), hunk and network access to
# gitlab.com, because the demo opens a public merge request and commit.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEMO=${HUNK_GLAB_DEMO:-/tmp/hunk-glab-demo}
OUT="$ROOT/demo/out/hero.gif"
FINAL="$ROOT/demo/hero.gif"
MAX_BYTES=$((1500 * 1024))

for tool in vhs ffmpeg hunk; do
  command -v "$tool" >/dev/null || { echo "$tool is not on PATH." >&2; exit 1; }
done

# An empty config of its own: no installed extensions, and the same theme and
# layout on every run.
rm -rf "$DEMO"
mkdir -p "$DEMO/config/hunk" "$DEMO/state"
cat > "$DEMO/config/hunk/config.toml" <<'TOML'
theme = "github-dark"
mode = "unified"
TOML

cd "$ROOT"
mkdir -p demo/out
HUNK_GLAB_DEMO="$DEMO" HUNK_GLAB_ROOT="$ROOT" vhs demo/hero.tape

# The checks: a recording that would slow the README down, or one where
# nothing happened on screen, must not land in it.
bytes=$(( $(wc -c < "$OUT") ))
if [ "$bytes" -gt "$MAX_BYTES" ]; then
  echo "hero.gif is $bytes bytes; the limit is $MAX_BYTES." >&2
  exit 1
fi
frames=$(mktemp -d)
ffmpeg -v error -i "$OUT" -vf "select=eq(n\,0)" -vframes 1 "$frames/first.png"
ffmpeg -v error -sseof -0.5 -i "$OUT" -update 1 -vframes 1 "$frames/last.png"
if cmp -s "$frames/first.png" "$frames/last.png"; then
  echo "The first and last frame are the same: nothing happened on screen." >&2
  exit 1
fi
rm -rf "$frames"

# Only a recording that passed the checks replaces the one in the repository.
mv "$OUT" "$FINAL"
echo "Recorded $FINAL: $bytes bytes, on Hunk $(hunk --version)."
