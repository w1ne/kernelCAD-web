#!/usr/bin/env bash
set -euo pipefail

repo='w1ne/kernelCAD-web'
assets=(lamella-clarifier belt-filter-press grit-classifier rapid-sand-filter uv-disinfection-channel)
for id in "${assets[@]}"; do
  printf '## %s — open issue title/body search\n' "$id"
  gh issue list --repo "$repo" --state open --search "$id" --json number,title,url
  printf '## %s — open PR title/body search\n' "$id"
  gh pr list --repo "$repo" --state open --search "$id" --json number,title,url
 done

printf '## Exact water-treatment source/preview paths changed by currently open PRs\n'
open_pr_numbers="$(gh pr list --repo "$repo" --state open --limit 100 --json number --jq '.[].number')"
for number in $open_pr_numbers; do
  matches="$(gh api "repos/$repo/pulls/$number/files" --paginate --jq '.[].filename' | rg '^catalog/kits/water-treatment/(lamella-clarifier|belt-filter-press|grit-classifier|rapid-sand-filter|uv-disinfection-channel)(\.kcad\.ts|/previews/[^/]+\.png)$' || true)"
  if [[ -n "$matches" ]]; then
    printf 'PR #%s\n%s\n' "$number" "$matches"
  fi
done
