#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Re-render every standard-components preview through the catalog pipeline."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/standard-components"


def main() -> None:
    ids = sorted(path.name.removesuffix(".kcad.ts") for path in KIT.glob("*.kcad.ts"))
    if len(ids) != 50:
        raise SystemExit(f"expected 50 standard-components assets, found {len(ids)}")
    output_path = BUNDLE / "preview-render-output.txt"
    with output_path.open("w", encoding="utf-8") as output:
        subprocess.run(
            ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *ids],
            cwd=ROOT,
            stdout=output,
            stderr=subprocess.STDOUT,
            check=True,
        )
    log = output_path.read_text(encoding="utf-8")
    rendered = {
        match.group(1)
        for line in log.splitlines()
        if (match := re.match(r"standard-components/([^:]+):\s+\d+ tris$", line)) is not None
    }
    if rendered != set(ids):
        raise SystemExit(f"preview output mismatch; missing={sorted(set(ids)-rendered)}, extra={sorted(rendered-set(ids))}")
    print(f"Rendered all {len(ids)} standard-components previews; output: {output_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
