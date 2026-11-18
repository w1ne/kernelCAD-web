#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Audit the dry-run npm package for the edited catalog asset and boundary."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
EXPECTED = {
    "catalog/index.json",
    "catalog/kits/interior/table-lamp.kcad.ts",
    "catalog/kits/interior/previews/table-lamp.png",
}
COMMERCIAL_PATH = re.compile(r"(^|/)(billing|checkout|entitlements?|supplier|commissions?|commercial|manufacturing-policy)(/|$)", re.IGNORECASE)


def main() -> None:
    result = subprocess.run(
        ["npm", "pack", "--dry-run", "--ignore-scripts", "--json"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    package = payload["kernelcad"] if isinstance(payload, dict) else payload[0]
    paths = {entry["path"] for entry in package["files"]}
    missing = sorted(EXPECTED - paths)
    if missing:
        raise SystemExit(f"package dry-run omitted expected files: {missing}")
    suspicious = sorted(path for path in paths if COMMERCIAL_PATH.search(path))
    if suspicious:
        raise SystemExit(f"package dry-run includes commercial-boundary paths: {suspicious}")
    exports = json.loads((ROOT / "package.json").read_text(encoding="utf-8")).get("exports", {})
    if exports != {"./package.json": "./package.json"}:
        raise SystemExit(f"unexpected package exports: {exports}")
    summary = [
        "Invocation: npm pack --dry-run --ignore-scripts --json",
        f"Package: {package['name']}@{package['version']}",
        f"Included files: {len(paths)}",
        "Generated catalog index, table-lamp source, and table-lamp preview included.",
        "No package paths matched billing/checkout/entitlement/supplier/commission/commercial policy patterns.",
        "Package exports unchanged: ./package.json only.",
        "No tarball was created and lifecycle scripts were skipped.",
    ]
    (BUNDLE / "package-boundary-audit.txt").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print("npm dry-run package includes the source, preview and index; no boundary paths or exports changed")


if __name__ == "__main__":
    main()
