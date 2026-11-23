#!/usr/bin/env python3
"""Build the five-item rendered-preview ledger and retain current index rows."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
ASSETS = [
    ("hull-block-spreader-beam", "Horizontal beam, four drop links and end pads read as a generic spreader. The pads now have a separate elastomer finish."),
    ("plate-pack-transfer-cart", "Low four-wheel carrier, deck rails and end stops read as a plate cart. The push bar appears disconnected from the cart frame; recorded, not changed."),
    ("pipe-rack-fork-pocket", "Base skids, repeated dividers, retaining rail and fork-pocket blocks read as an empty pipe rack."),
    ("weld-consumable-issue-cage", "Roof, posts, shelves and door read as a store, but no mesh infill is modeled despite the mesh-style description; recorded, not changed."),
    ("shipfitter-tool-cabinet", "Paired doors, drawer bank and side tool rail read as a shipfitter cabinet; painted panels and metal rail/feet are distinct."),
]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    index = json.loads((ROOT / "catalog/index.json").read_text())
    live = json.loads((BUNDLE / "live-baseline/live-site-check.json").read_text())
    live_by_id = {item["id"]: item for item in live["assets"]}
    ids = [asset_id for asset_id, _ in ASSETS]
    rows = [row for row in index["assets"] if row["kit"] == "shipyard" and row["id"] in ids]
    rows.sort(key=lambda row: ids.index(row["id"]))
    if len(rows) != len(ASSETS):
        raise SystemExit(f"expected {len(ASSETS)} index rows, found {len(rows)}")
    (BUNDLE / "samples/index-rows.json").write_text(json.dumps({"assetCount": len(rows), "rows": rows}, indent=2) + "\n")

    lines = [
        "# Five-preview review ledger — 18 November 2026",
        "",
        "The mesh envelopes below come from generated `catalog/index.json` and are visual-review context, not product specifications.",
        "The public pages/source/previews were captured before the target source edit; local source and preview hashes identify this worktree state.",
        "",
        "| Asset | Preview read and finding | Indexed envelope / triangles | Local source SHA-256 | Local preview SHA-256 | Live page / source / preview |",
        "|---|---|---:|---|---|---|",
    ]
    notes = dict(ASSETS)
    for row in rows:
        asset_id = row["id"]
        source = ROOT / row["source"]
        preview = ROOT / "catalog/kits/shipyard/previews" / f"{asset_id}.png"
        live_item = live_by_id[asset_id]
        dims = " × ".join(f"{axis:.3f}".rstrip("0").rstrip(".") for axis in row["stats"]["sizeM"])
        live_status = "/".join(str(live_item[key]["status"]) for key in ("page", "source", "preview"))
        lines.append(
            f"| `{asset_id}` | {notes[asset_id]} | {dims} m / {row['stats']['triangles']} tris | `{sha(source)}` | `{sha(preview)}` | HTTP {live_status} |"
        )
    lines.extend([
        "",
        "## Selected material correction",
        "",
        "`hull-block-spreader-beam/contact-shoe-0..3` were assigned `yardPaint` even though the source named them soft-contact shoes. They now use the editable `elastomer` control. The other sampled assets and their source files were not changed.",
        "",
        "The cart push-bar separation and missing cage mesh infill are recorded as separate geometry/description issues for later work. This round changes one material mapping only.",
        "",
    ])
    (BUNDLE / "preview-review.md").write_text("\n".join(lines))


if __name__ == "__main__":
    main()
