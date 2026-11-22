#!/usr/bin/env python3
"""Verify local archaeology detail pages and preview copies from the static build."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: verify_local_pages.py <catalog-pages-out-dir>")
    out = Path(sys.argv[1]).resolve()
    index = json.loads((ROOT / "catalog/index.json").read_text())
    rows = [row for row in index["assets"] if row["kit"] == "archaeology-fieldwork"]
    issues = []
    hub = (out / "catalog/index.html")
    if not hub.is_file():
        issues.append("local catalog hub is missing")
    else:
        html = hub.read_text()
        if "Archaeology fieldwork" not in html or "archaeologist-trowel" not in html:
            issues.append("local hub is missing archaeology kit/cards")
    page_count = 0
    for row in rows:
        page = out / "catalog" / row["kit"] / row["id"] / "index.html"
        preview = out / "catalog" / row["kit"] / row["id"] / "preview.png"
        if not page.is_file() or not preview.is_file():
            issues.append(row["id"] + ": local page or copied preview is missing")
            continue
        page_count += 1
        html = page.read_text()
        names = [p["name"] for p in row["params"]]
        for name in names:
            if name not in html:
                issues.append(row["id"] + ": local page omits parameter " + name)
        for name in row.get("presets", {}):
            if name not in html:
                issues.append(row["id"] + ": local page omits preset " + name)
        source_preview = ROOT / "catalog/kits/archaeology-fieldwork/previews" / (row["id"] + ".png")
        if hashlib.sha256(preview.read_bytes()).digest() != hashlib.sha256(source_preview.read_bytes()).digest():
            issues.append(row["id"] + ": local page preview differs from source preview")
    result = {
        "status": "passed" if not issues and page_count == 50 else "failed",
        "kit": "archaeology-fieldwork",
        "pagesBuilt": page_count,
        "pagesExpected": 50,
        "hubPresent": hub.is_file(),
        "previewCopiesMatched": not any("preview differs" in issue for issue in issues),
        "issues": issues,
    }
    (BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if result["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
