#!/usr/bin/env python3
"""Check the wave source and npm dry-run artifact against the commercial boundary."""
import json
import re
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
PATTERN = re.compile(
    r"billing|checkout|entitlement|supplier|commission|quote|routing|"
    r"commercial[-_ ]orchestration|manufacturing[-_ ]policy",
    re.IGNORECASE,
)
PACKED_PRODUCT_PATTERN = re.compile(
    r"billing|entitlement|supplier[-_/]?quote|quote[-_/]?routing|"
    r"commission|commercial[-_ ]orchestration|manufacturing[-_ ]policy|"
    r"deploy[-_].*(?:marketing|kernelcad[.]com)",
    re.IGNORECASE,
)

source_paths = [
    *sorted((ROOT / "catalog" / "kits" / "fire-station").glob("*.kcad.ts")),
    ROOT / "catalog" / "kits" / "fire-station" / "README.md",
    ROOT / "docs" / "catalog-assets.md",
]
source_findings = []
for path in source_paths:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        if PATTERN.search(line):
            source_findings.append({"path": str(path.relative_to(ROOT)), "line": line_number, "text": line.strip()})

package = json.loads((ROOT / "package.json").read_text())
pack_report = json.loads((BUNDLE / "npm-pack-dry-run.json").read_text())
if isinstance(pack_report, list):
    pack_report = pack_report[0]
elif "files" not in pack_report and "kernelcad" in pack_report:
    pack_report = pack_report["kernelcad"]
packed_paths = [item["path"] for item in pack_report.get("files", [])]
packed_code_paths = [
    path for path in packed_paths
    if path.startswith(("dist/", ".github/workflows/"))
]
packed_findings = [path for path in packed_code_paths if PACKED_PRODUCT_PATTERN.search(path)]
station_packed = [
    path for path in packed_paths
    if path.startswith("catalog/kits/fire-station/")
    and (path.endswith(".kcad.ts") or path.endswith(".png") or path.endswith("README.md"))
]
exports = package.get("exports")
expected_exports = {"./package.json": "./package.json"}
result = {
    "sourceFilesScanned": len(source_paths),
    "sourceFindings": source_findings,
    "packageExports": exports,
    "packageExportsUnchanged": exports == expected_exports,
    "packedFileCount": len(packed_paths),
    "packedCodeAndWorkflowPathsScanned": len(packed_code_paths),
    "scopeNote": "Physical retail checkout fixtures in generic catalog kits are reusable scene assets; packed code/workflow paths are checked for product implementation details.",
    "packedCommercialPathFindings": packed_findings,
    "fireStationKitFilesInPack": len(station_packed),
    "expectedFireStationKitFilesInPack": 141,
    "failures": [],
}
if source_findings:
    result["failures"].append("commercial implementation detail found in wave source/docs")
if packed_findings:
    result["failures"].append("commercial implementation path found in npm dry-run package")
if exports != expected_exports:
    result["failures"].append("package export map changed")
if len(station_packed) < 141:
    result["failures"].append("npm dry-run package is missing fire-station sources, previews or README")
(BUNDLE / "package-boundary-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if result["failures"]:
    raise SystemExit(1)
