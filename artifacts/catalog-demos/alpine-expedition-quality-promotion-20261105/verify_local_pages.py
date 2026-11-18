#!/usr/bin/env python3
"""Check the generated Alpine pages and copied preview assets."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: verify_local_pages.py <catalog-pages-output>")
    output = Path(sys.argv[1]).resolve()
    index = json.loads((ROOT / "catalog/index.json").read_text())
    rows = [row for row in index["assets"] if row["kit"] == "alpine-expedition"]
    issues = []
    hub = output / "catalog/index.html"
    if not hub.is_file() or "Alpine expedition" not in hub.read_text():
        issues.append("local catalog hub is missing Alpine Expedition")
    count = 0
    for row in rows:
        page = output / "catalog" / row["kit"] / row["id"] / "index.html"
        preview = output / "catalog" / row["kit"] / row["id"] / "preview.png"
        if not page.is_file() or not preview.is_file():
            issues.append(row["id"] + ": page or copied preview missing")
            continue
        count += 1
        html = page.read_text()
        for param in row["params"]:
            if param["name"] not in html:
                issues.append(row["id"] + ": parameter missing from page: " + param["name"])
        for preset in row.get("presets", {}):
            if preset not in html:
                issues.append(row["id"] + ": preset missing from page: " + preset)
        original = ROOT / "catalog/kits/alpine-expedition/previews" / (row["id"] + ".png")
        if hashlib.sha256(preview.read_bytes()).digest() != hashlib.sha256(original.read_bytes()).digest():
            issues.append(row["id"] + ": copied preview differs from kit preview")
    result = {
        "status": "passed" if count == 50 and not issues else "failed",
        "kit": "alpine-expedition",
        "pagesBuilt": count,
        "pagesExpected": 50,
        "hubPresent": hub.is_file(),
        "previewCopiesMatched": not any("differs" in issue for issue in issues),
        "issues": issues,
    }
    (BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if result["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
