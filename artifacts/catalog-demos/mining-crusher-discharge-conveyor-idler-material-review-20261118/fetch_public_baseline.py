#!/usr/bin/env python3
"""Capture the current public catalog page, preview and source baseline."""

from __future__ import annotations

import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
KIT = "mining"
ASSETS = [
    "belt-magnet-separator",
    "crusher-discharge-conveyor",
    "flotation-cell-bank",
    "mine-sump-pump",
    "radial-stacker",
]
USER_AGENT = "kernelCAD-semantic-review/2026-11-18"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def curl(url: str, out: Path | None) -> tuple[int, int]:
    args = [
        "curl", "--silent", "--show-error", "--location", "--max-time", "30",
        "--user-agent", USER_AGENT, "--write-out", "%{http_code}",
    ]
    if out is None:
        args += ["--output", "/dev/null"]
    else:
        out.parent.mkdir(parents=True, exist_ok=True)
        args += ["--output", str(out)]
    args.append(url)
    result = subprocess.run(args, check=True, capture_output=True, text=True)
    status = int(result.stdout[-3:])
    return status, out.stat().st_size if out is not None else 0


def main() -> None:
    live = ROOT / "live-baseline"
    with TemporaryDirectory(prefix="kernelcad-public-baseline-") as temp_dir:
        manifest_path = Path(temp_dir) / "assets.json"
        manifest_status, _ = curl("https://kernelcad.com/assets.json", manifest_path)
        if manifest_status != 200:
            raise SystemExit(f"public assets.json returned HTTP {manifest_status}")
        manifest = json.loads(manifest_path.read_text())
        rows = [
            row for row in manifest.get("assets", [])
            if row.get("kit") == KIT and row.get("id") in ASSETS
        ]
    by_id = {row["id"]: row for row in rows}
    if set(by_id) != set(ASSETS):
        raise SystemExit(f"missing public manifest rows: {sorted(set(ASSETS) - set(by_id))}")

    result: dict[str, object] = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "mode": "public baseline before local branch change; no deployment performed",
        "manifestUrl": "https://kernelcad.com/assets.json",
        "manifestHttp": manifest_status,
        "selectedManifestRows": rows,
        "assets": {},
    }
    out_assets: dict[str, object] = {}
    for asset_id in ASSETS:
        row = by_id[asset_id]
        page_url = f"https://kernelcad.com/catalog/{KIT}/{asset_id}/"
        page_status, _ = curl(page_url, None)
        preview_url = "https://kernelcad.com" + row["preview"]
        preview_path = live / "public-previews" / f"{asset_id}.png"
        preview_status, preview_bytes = curl(preview_url, preview_path)
        local_path = REPO / "catalog" / "kits" / KIT / "previews" / f"{asset_id}.png"
        out_assets[asset_id] = {
            "pageUrl": page_url,
            "pageHttp": page_status,
            "previewUrl": preview_url,
            "previewHttp": preview_status,
            "previewBytes": preview_bytes,
            "publicPreviewSha256": sha256(preview_path),
            "checkedInPreviewSha256": sha256(local_path),
            "publicMatchesCheckedInPreview": sha256(preview_path) == sha256(local_path),
        }

    target = by_id["crusher-discharge-conveyor"]
    source_url = "https://kernelcad.com" + target["sourceUrl"]
    source_path = live / "crusher-discharge-conveyor-public-before.kcad.ts"
    source_status, source_bytes = curl(source_url, source_path)
    result["publicSource"] = {
        "url": source_url,
        "http": source_status,
        "bytes": source_bytes,
        "sha256": sha256(source_path) if source_status == 200 else None,
        "matchesLocalBefore": (
            source_status == 200
            and sha256(source_path) == sha256(ROOT / "sources/before/crusher-discharge-conveyor.kcad.ts")
        ),
    }
    result["assets"] = out_assets
    (live / "public-check.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
