#!/usr/bin/env python3
"""Summarize local quality, index, lint, page and test evidence for the demo."""

import json
import re
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
index = json.loads((BUNDLE / "index-verification.json").read_text(encoding="utf-8"))
page = json.loads((BUNDLE / "local-page-check.json").read_text(encoding="utf-8"))
kit_output = (BUNDLE / "quality-kit-output.txt").read_text(encoding="utf-8")
global_output = (BUNDLE / "quality-global-output.txt").read_text(encoding="utf-8")
target_output = (BUNDLE / "focused-test-output.txt").read_text(encoding="utf-8")
integration_output = (BUNDLE / "integration-output.txt").read_text(encoding="utf-8")
eslint_output = (BUNDLE / "eslint-output.txt").read_text(encoding="utf-8")


def count(output):
    match = re.search(r"(\d+)/(\d+) assets pass \(100\.00%", output)
    if match is None:
        raise SystemExit("quality gate output is missing a 100% count")
    return {"kitPassing": int(match.group(1)), "kitTotal": int(match.group(2))}


kit = count(kit_output)
catalog_count = count(global_output)
target_summary = re.search(r"Test Files\s+1 passed[\s\S]*?Tests\s+1 passed", target_output)
integration_summary = re.search(r"Test Files\s+6 passed[\s\S]*?Tests\s+18 passed", integration_output)
eslint_pass = not eslint_output.strip()
targeted_pass = target_summary is not None
integration_pass = integration_summary is not None
checks_pass = index["pass"] and page["studioLinkPresent"] is True and eslint_pass and targeted_pass and integration_pass
record = {
    "pass": checks_pass,
    "asset": {
        "id": index["changedAsset"]["id"],
        "triangles": index["changedAsset"]["triangles"],
        "budget": index["changedAsset"]["triangleBudget"],
    },
    "quality": {**kit, "catalogPassing": catalog_count["kitPassing"], "catalogTotal": catalog_count["kitTotal"]},
    "index": {"result": f"{index['assetCount']} source hashes and preview paths pass"},
    "checks": {
        "targetedTest": "1 test passed" if targeted_pass else "failed or incomplete",
        "eslint": "passed" if eslint_pass else "failed",
        "integration": "6 files / 18 tests passed" if integration_pass else "failed or incomplete",
        "localPage": "passed" if page["pass"] else "failed",
    },
}
(BUNDLE / "verification.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
if not checks_pass:
    raise SystemExit("one or more local checks failed")
print(json.dumps(record, indent=2))
