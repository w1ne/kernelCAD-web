#!/usr/bin/env python3
"""Check the generated local catalog hub and ground test well detail page."""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUTPUT = Path(sys.argv[1]).resolve()
ASSET = "substation-ground-grid-test-well"
KIT = "grid-substation"


def main() -> None:
    hub = OUTPUT / "catalog" / "index.html"
    page = OUTPUT / "catalog" / KIT / ASSET / "index.html"
    page_preview = OUTPUT / "catalog" / KIT / ASSET / "preview.png"
    if not hub.is_file() or not page.is_file() or not page_preview.is_file():
        raise SystemExit("missing local catalog hub, asset page, or copied preview")
    hub_html = hub.read_text(encoding="utf-8")
    content = page.read_text(encoding="utf-8")
    if KIT not in hub_html or ASSET not in hub_html:
        raise SystemExit("local catalog hub does not link to the grid-substation well")
    if "Ground grid test well" not in content or "Open in Studio" not in content:
        raise SystemExit("local detail page is missing its title or Studio link")
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    row = next(asset for asset in index["assets"] if asset["id"] == ASSET)
    missing = [name for name in ["wellDepth", "concrete", "stainlessSteel", "copper", *row["presets"]] if name not in content]
    if missing:
        raise SystemExit("local page is missing parameters or presets: " + ", ".join(missing))
    source_hash = hashlib.sha256((ROOT / row["source"]).read_bytes()).hexdigest()
    if source_hash != row["sourceSha256"]:
        raise SystemExit("index hash does not match the model source")
    result = {
        "checkedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scope": "Generated local static catalog page; the feature branch has not deployed.",
        "hub": str(hub),
        "assetPage": str(page),
        "pagePreview": str(page_preview),
        "pagePreviewBytes": page_preview.stat().st_size,
        "sourceSha256MatchesIndex": True,
        "triangleCount": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
        "params": [entry["name"] for entry in row["params"]],
        "presets": sorted(row["presets"]),
        "hasStudioLink": True,
    }
    (BUNDLE / "local-page-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("checked local catalog hub and ground test well page; source hash and parameter/preset links match")


if __name__ == "__main__":
    main()
