#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Run and retain the required catalog quality, lint, integration and index checks."""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
COMMANDS = {
    "qualityKit": (["python3", "scripts/checkCatalogQuality.py", "--kit", "standard-components"], "quality-kit-output.txt"),
    "qualityGlobal": (["python3", "scripts/checkCatalogQuality.py"], "quality-global-output.txt"),
    "eslint": (["npx", "eslint", "catalog/kits/standard-components/"], "eslint-output.txt"),
    "catalogIntegration": (["npx", "vitest", "run", "tests/integration/catalog/"], "integration-output.txt"),
}


def main() -> None:
    status = {"checkedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    for key, (command, output_name) in COMMANDS.items():
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        output = result.stdout + result.stderr
        (OUT / output_name).write_text(output, encoding="utf-8")
        status[key] = result.returncode
        print(f"{key}: exit {result.returncode}")
        if result.returncode != 0:
            print(output[-4000:])
    (OUT / "command-status.json").write_text(f"{json.dumps(status, indent=2)}\n", encoding="utf-8")
    if any(status[key] != 0 for key in COMMANDS):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
