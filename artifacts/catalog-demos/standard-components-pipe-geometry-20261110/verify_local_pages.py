#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Check the generated static catalog pages for the three edited assets."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PAGES = ROOT / "site-build/catalog/standard-components"
ASSETS = {
    "pipe-reducer": ("reduction", "barrel", "collars", "gasket", "stainless"),
    "retaining-ring": ("gap", "springSteel", "stainless", "bluePhosphate"),
    "tubular-spacer": ("length", "steel", "polymer", "endRims", "insulated"),
}


def main() -> None:
    checks = {}
    for asset, expected in ASSETS.items():
        page = PAGES / asset / "index.html"
        preview = PAGES / asset / "preview.png"
        if not page.is_file() or not preview.is_file():
            raise SystemExit(f"missing local catalog page or preview for {asset}")
        markup = page.read_text(encoding="utf-8")
        missing = [token for token in expected if token not in markup]
        if missing:
            raise SystemExit(f"{asset} page is missing controls/preset tokens: {missing}")
        source_preview = ROOT / f"catalog/kits/standard-components/previews/{asset}.png"
        digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
        if digest(preview) != digest(source_preview):
            raise SystemExit(f"local page preview does not match the current kit preview for {asset}")
        checks[asset] = {
            "page": str(page.relative_to(ROOT)),
            "previewSha256": digest(preview),
            "controlsAndPresetTokens": list(expected),
            "localStudioLink": "https://app.kernelcad.com/studio" in markup,
        }
    result = {
        "invocation": "python3 artifacts/catalog-demos/standard-components-pipe-geometry-20261110/verify_local_pages.py",
        "scope": "local static page build only; not deployed behavior",
        "assets": checks,
    }
    (BUNDLE / "local-page-check.json").write_text(f"{json.dumps(result, indent=2)}\n", encoding="utf-8")
    print("Verified local static pages, parameter/preset entries, and copied preview hashes for all three assets.")


if __name__ == "__main__":
    main()
