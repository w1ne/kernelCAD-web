#!/usr/bin/env bash
set -euo pipefail

repo='w1ne/kernelCAD-web'
base="https://github.com/$repo"
mapfile -t prs < <(
  curl -L -sS --max-time 30 "$base/pulls?q=is%3Apr+is%3Aopen" \
    | rg -o "/$repo/pull/[0-9]+" \
    | sed -E 's#^.*/##' \
    | sort -nu
)

assets='lamella-clarifier|belt-filter-press|grit-classifier|rapid-sand-filter|uv-disinfection-channel'
found=0
printf 'Inspected %s currently listed open PRs.\n' "${#prs[@]}"
for pr in "${prs[@]}"; do
  matches="$(curl -L -sS --max-time 30 "$base/pull/$pr.diff" \
    | rg "^diff --git a/catalog/kits/water-treatment/($assets)(\\.kcad\\.ts|/previews/[^/]+\\.png)\$" || true)"
  if [[ -n "$matches" ]]; then
    printf 'PR #%s\n%s\n' "$pr" "$matches"
    found=1
  fi
done

if [[ "$found" -eq 0 ]]; then
  printf 'No exact sampled source or preview path matches in the open PR diffs.\n'
fi
