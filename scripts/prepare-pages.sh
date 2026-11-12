#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf _site
mkdir -p _site/game _site/게임
cp index.html _site/index.html
cp -R game/. _site/game/
cp legacy/old-game-index.html _site/게임/index.html
printf '%s\n' "${GITHUB_SHA:-local}" > _site/deploy-revision.txt
touch _site/.nojekyll
