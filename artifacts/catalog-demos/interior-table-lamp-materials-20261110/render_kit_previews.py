#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Re-render every indexed interior asset preview, including table-lamp."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent


def main() -> None:
    ids = sorted(path.name.removesuffix(".kcad.ts") for path in (ROOT / "catalog/kits/interior").glob("*.kcad.ts"))
    if len(ids) != 72:
        raise SystemExit(f"expected 72 interior assets, found {len(ids)}")
    with (BUNDLE / "preview-render-output.txt").open("w", encoding="utf-8") as output:
        subprocess.run(
            ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *ids],
            cwd=ROOT,
            stdout=output,
            stderr=subprocess.STDOUT,
            check=True,
        )
    log = (BUNDLE / "preview-render-output.txt").read_text(encoding="utf-8")
    rendered = {
        match.group(1)
        for line in log.splitlines()
        if (match := re.match(r"interior/([^:]+):\s+\d+ tris$", line)) is not None
    }
    if rendered != set(ids):
        missing = sorted(set(ids) - rendered)
        extra = sorted(rendered - set(ids))
        raise SystemExit(f"preview output mismatch; missing={missing}, extra={extra}")
    print(f"Rendered {len(ids)} interior previews; output: preview-render-output.txt")


if __name__ == "__main__":
    main()
