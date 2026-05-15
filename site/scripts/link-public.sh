#!/usr/bin/env bash
# Wires site/public/* into site/ as relative symlinks for `python3 -m http.server`
# dev preview. If site/<name> already exists as a real directory (e.g. site/gallery/
# holds the curated source entries.json), recurses into site/public/<name>/ and
# symlinks each child individually so per-slug build artifacts are reachable
# without clobbering committed files.
#
# Idempotent. Safe to re-run after every site:build.

set -euo pipefail

cd "$(dirname "$0")/.."

for f in public/*; do
  [ -e "$f" ] || continue
  base="$(basename "$f")"

  if [ -d "$f" ] && [ -d "$base" ] && [ ! -L "$base" ]; then
    # site/$base is a real directory we shouldn't overwrite (e.g. site/gallery
    # holds the curated entries.json source). Recurse into public/$base and
    # symlink each child into site/$base.
    for sub in "$f"/*; do
      [ -e "$sub" ] || continue
      subname="$(basename "$sub")"
      ln -sfn "../public/$base/$subname" "$base/$subname"
    done
  else
    ln -sfn "$f" "$base"
  fi
done
