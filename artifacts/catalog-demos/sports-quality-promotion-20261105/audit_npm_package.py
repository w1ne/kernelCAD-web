#!/usr/bin/env python3
"""Audit the built npm tarball boundary for this catalog-only change."""

import hashlib
import json
import re
import subprocess
import tarfile
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix="kernelcad-sports-pack-") as temp_dir:
    pack = json.loads(subprocess.check_output(
        ["npm", "pack", "--ignore-scripts", "--pack-destination", temp_dir, "--json"],
        cwd=ROOT,
        text=True,
        stderr=subprocess.DEVNULL,
    ))[0]
    archive = Path(temp_dir) / pack["filename"]
    archive_sha256 = hashlib.sha256(archive.read_bytes()).hexdigest()
    with tarfile.open(archive, "r:gz") as built_package:
        members = [member for member in built_package.getmembers() if member.isfile()]
        paths = {member.name.removeprefix("package/") for member in members}
        package_member = built_package.extractfile("package/package.json")
        if package_member is None:
            raise SystemExit("built archive has no package/package.json")
        package_json = json.load(package_member)

sources = sorted((ROOT / "catalog/kits/sports").glob("*.kcad.ts"))
previews = sorted((ROOT / "catalog/kits/sports/previews").glob("*.png"))
missing = [str(path.relative_to(ROOT)) for path in sources + previews if str(path.relative_to(ROOT)) not in paths]
if "catalog/index.json" not in paths:
    missing.append("catalog/index.json")

head_package = json.loads(subprocess.check_output(["git", "show", "HEAD:package.json"], cwd=ROOT, text=True))
exports_unchanged = package_json.get("exports") == head_package.get("exports")
changed_paths = subprocess.check_output(["git", "diff", "--name-only", "HEAD"], cwd=ROOT, text=True).splitlines()
forbidden_changes = [path for path in changed_paths if path.startswith(("src/checkout/", "src/billing/", "src/entitlements/", "src/suppliers/", "src/commissions/", "workers/"))]
product_terms = re.compile(r"(?:billing|checkout|entitlement|supplier|commission|commercial-orchestration)", re.I)
product_implementation = [path for path in sorted(paths) if path.startswith(("src/", "site/", "workers/")) and product_terms.search(path)]
result = {
    "command": "npm pack --ignore-scripts --pack-destination <temporary directory> --json",
    "packageName": pack["name"],
    "packageVersion": pack["version"],
    "fileCount": len(paths),
    "sportsSourcesIncluded": sum(str(path.relative_to(ROOT)) in paths for path in sources),
    "sportsSourcesExpected": len(sources),
    "sportsPreviewsIncluded": sum(str(path.relative_to(ROOT)) in paths for path in previews),
    "sportsPreviewsExpected": len(previews),
    "catalogIndexIncluded": "catalog/index.json" in paths,
    "archiveSha256": archive_sha256,
    "archiveRetained": False,
    "packageExportsUnchanged": exports_unchanged,
    "forbiddenChangedProductPaths": forbidden_changes,
    "productImplementationPaths": product_implementation,
    "missing": missing,
    "passed": not missing and exports_unchanged and not forbidden_changes and not product_implementation,
}
(BUNDLE / "package-boundary-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
