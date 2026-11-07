#!/usr/bin/env python3
"""Run and retain the photo/video round's required local checks."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PAGE_DIR = Path("/tmp/kernelcad-photo-video-studio-pages")
checks = [
    ("kitQuality", ["python3", "scripts/checkCatalogQuality.py", "--kit", "photo-video-studio"], 0),
    ("catalogQuality", ["python3", "scripts/checkCatalogQuality.py"], 1),
    ("eslint", ["npx", "eslint", "catalog/kits/photo-video-studio/"], 0),
    ("integration", ["npx", "vitest", "run", "tests/integration/catalog/"], 0),
    ("indexCheck", ["npx", "tsx", "scripts/buildAssetCatalog.ts", "--check"], 0),
    ("catalogPages", ["npx", "tsx", "scripts/buildCatalogPages.ts", str(PAGE_DIR)], 0),
]

results = []
for name, command, expected in checks:
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    output = result.stdout + result.stderr
    (BUNDLE / f"{name.lower()}-output.txt").write_text(output, encoding="utf-8")
    results.append({
        "name": name,
        "command": command,
        "exitCode": result.returncode,
        "expectedExitCode": expected,
        "passed": result.returncode == expected,
        "output": f"{name.lower()}-output.txt",
    })
    print(f"{name}: exit {result.returncode} (expected {expected})")
    if output:
        print(output[-3500:])

    if name == "catalogPages" and result.returncode == 0:
        index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
        rows = [row for row in index["assets"] if row["kit"] == "photo-video-studio"]
        missing = []
        pages = []
        for row in rows:
            page_path = PAGE_DIR / "catalog" / row["kit"] / row["id"]
            if not (page_path / "index.html").is_file() or not (page_path / "preview.png").is_file():
                missing.append(row["id"])
            pages.append({"id": row["id"], "page": str(page_path / "index.html"), "preview": str(page_path / "preview.png")})
        page_check = {
            "kit": "photo-video-studio",
            "expectedAssets": 40,
            "foundAssets": len(rows),
            "checkedPages": len(pages),
            "missing": missing,
            "allPagesAndPreviewsPresent": len(rows) == 40 and not missing,
            "pages": pages,
        }
        (BUNDLE / "catalog-pages-check.json").write_text(json.dumps(page_check, indent=2) + "\n", encoding="utf-8")
        print(f"catalogPages: checked {len(rows)} kit pages, missing {len(missing)}")

kit_output = (BUNDLE / "kitquality-output.txt").read_text(encoding="utf-8") if (BUNDLE / "kitquality-output.txt").exists() else ""
full_output = (BUNDLE / "catalogquality-output.txt").read_text(encoding="utf-8") if (BUNDLE / "catalogquality-output.txt").exists() else ""
integration_output = (BUNDLE / "integration-output.txt").read_text(encoding="utf-8") if (BUNDLE / "integration-output.txt").exists() else ""
kit_match = re.search(r"(\d+)/(\d+) assets pass", kit_output)
catalog_match = re.search(r"(\d+)/(\d+) assets pass", full_output)
test_match = re.search(r"Test Files\s+(\d+) passed.*?Tests\s+(\d+) passed", integration_output, re.S)
if not kit_match or not catalog_match:
    raise SystemExit("quality gate summary missing from retained output")

passing, total = map(int, catalog_match.groups())
full_expected_thin = 100 * (total - passing) / total
summary = {
    "checks": results,
    "kitPassing": int(kit_match.group(1)),
    "kitTotal": int(kit_match.group(2)),
    "catalogPassing": passing,
    "catalogTotal": total,
    "catalogPassRate": f"{100 * passing / total:.1f}%",
    "catalogThinRemaining": total - passing,
    "catalogThinRate": f"{full_expected_thin:.1f}%",
    "eslint": "passed" if next(row for row in results if row["name"] == "eslint")["passed"] else "failed",
    "integrationFiles": int(test_match.group(1)) if test_match else None,
    "integrationTests": int(test_match.group(2)) if test_match else None,
    "localPagesPresent": (BUNDLE / "catalog-pages-check.json").is_file() and json.loads((BUNDLE / "catalog-pages-check.json").read_text())["allPagesAndPreviewsPresent"],
}
(BUNDLE / "check-results.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
failures = [row for row in results if not row["passed"] and row["name"] != "catalogQuality"]
if not summary["localPagesPresent"]:
    failures.append({"name": "catalogPages", "reason": "one or more kit pages/previews are missing"})
if failures:
    raise SystemExit(1)
