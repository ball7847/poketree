#!/usr/bin/env bash
set -euo pipefail

# A GitHub Pages deployment may take some time to become visible at the edge.
base="${PAGES_BASE_URL:-https://ball7847.github.io/poketree/}"
base="${base%/}/"
sha="${EXPECTED_SHA:?EXPECTED_SHA is required}"
paths=("" "game/index.html" "game/style.css" "game/data.js" "game/game.js" "게임/index.html" "deploy-revision.txt")

for i in $(seq 1 12); do
  ok=true
  for p in "${paths[@]}"; do
    url="${base}${p}"
    code="$(curl -L -sS -o /dev/null --max-time 15 -w '%{http_code}' --retry 1 "$url" || true)"
    if [[ "$code" != "200" ]]; then
      echo "Attempt ${i}: ${url} HTTP ${code}"
      ok=false
    fi
  done
  revision="$(curl -L -fsS --max-time 15 "${base}deploy-revision.txt" || true)"
  revision="${revision//$'\r'/}"
  revision="${revision//$'\n'/}"
  if [[ "$revision" != "$sha" ]]; then
    echo "Attempt ${i}: published revision ${revision:-missing} != expected ${sha}"
    ok=false
  fi
  if [[ "$ok" == true ]]; then
    echo "Live Pages URLs and deployed revision verified: ${sha}"
    exit 0
  fi
  if [[ "$i" -lt 12 ]]; then sleep 10; fi
done
echo "Public URL verification failed after 12 attempts" >&2
exit 1
