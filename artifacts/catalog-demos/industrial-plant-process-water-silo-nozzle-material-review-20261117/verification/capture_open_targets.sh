#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
BUNDLE="$ROOT/artifacts/catalog-demos/industrial-plant-process-water-silo-nozzle-material-review-20261117/verification"

gh issue list --state open --limit 100 --json number,title,body,url > "$BUNDLE/open-issues-before.json"
gh pr list --state open --limit 100 --json number,title,body,url,headRefName > "$BUNDLE/open-prs-before.json"
: > "$BUNDLE/open-pr-catalog-targets.txt"
while read -r number; do
  gh api --paginate "repos/w1ne/kernelCAD-web/pulls/$number/files" --jq '.[].filename' \
    | rg '^catalog/kits/' \
    | sed "s#^#PR #$number #" >> "$BUNDLE/open-pr-catalog-targets.txt" || true
done < <(jq -r '.[].number' "$BUNDLE/open-prs-before.json")

python3 "$BUNDLE/check_open_targets.py"
