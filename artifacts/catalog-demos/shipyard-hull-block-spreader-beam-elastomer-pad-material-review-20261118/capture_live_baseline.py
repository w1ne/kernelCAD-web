#!/usr/bin/env python3
"""Capture current public catalog pages, source files, and previews for review."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / "live-baseline"
ASSETS = [
    "hull-block-spreader-beam",
    "plate-pack-transfer-cart",
    "pipe-rack-fork-pocket",
    "weld-consumable-issue-cage",
    "shipfitter-tool-cabinet",
]


def fetch(url: str, path: Path) -> dict[str, object]:
    request = Request(url, headers={"User-Agent": "kernelCAD-catalog-review/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            content = response.read()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            return {
                "url": url,
                "status": response.status,
                "bytes": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            }
    except Exception as error:  # retain failed checks instead of hiding them
        return {"url": url, "status": None, "error": f"{type(error).__name__}: {error}"}


def main() -> None:
    report: dict[str, object] = {"checkedAtUtc": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(), "assets": []}
    for asset_id in ASSETS:
        slug = f"shipyard/{asset_id}"
        page_url = f"https://kernelcad.com/catalog/{slug}/"
        preview_url = f"https://kernelcad.com/assets/shipyard-{asset_id}.png"
        source_url = f"https://kernelcad.com/assets/shipyard-{asset_id}.kcad.ts"
        item: dict[str, object] = {"id": asset_id, "page": None, "preview": None, "source": None}
        page_path = OUT / "pages" / f"{asset_id}.html"
        page_result = fetch(page_url, page_path)
        if page_result.get("status"):
            html = page_path.read_text(errors="replace")
            title = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
            page_result["title"] = re.sub(r"\s+", " ", title.group(1)).strip() if title else None
        item["page"] = page_result
        item["preview"] = fetch(preview_url, OUT / "previews" / f"{asset_id}.png")
        item["source"] = fetch(source_url, OUT / "sources" / f"{asset_id}.kcad.ts")
        report["assets"].append(item)  # type: ignore[union-attr]

    target = ROOT / "catalog" / "index.json"
    index = json.loads(target.read_text())
    rows = [row for row in index["assets"] if row["kit"] == "shipyard" and row["id"] in ASSETS]
    report["indexRows"] = rows
    report["indexPath"] = "catalog/index.json"
    (OUT / "live-site-check.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
