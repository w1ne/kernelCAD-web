#!/usr/bin/env python3
"""Re-render the 50 EV charging previews in fresh OCCT batches."""

from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/ev-charging-infrastructure"
BATCH_SIZE = 10


def main() -> None:
    ids = [path.name.removesuffix(".kcad.ts") for path in sorted(KIT.glob("*.kcad.ts"))]
    if len(ids) != 50:
        raise SystemExit(f"expected 50 existing sources, found {len(ids)}")
    for start in range(0, len(ids), BATCH_SIZE):
        batch = ids[start : start + BATCH_SIZE]
        print(f"render batch {start // BATCH_SIZE + 1}/5 ({len(batch)} assets)", flush=True)
        subprocess.run(
            ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *batch],
            cwd=ROOT,
            check=True,
        )
    print(f"rendered {len(ids)} existing previews")


if __name__ == "__main__":
    main()
