#!/usr/bin/env python3
"""Audit the dry-run npm file list for this catalog-only source change."""

import json
import hashlib
import re
import subprocess
import tarfile
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix="kernelcad-vet-clinic-pack-") as temp_dir:
    pack = json.loads(
        subprocess.check_output(
            ["npm", "pack", "--ignore-scripts", "--pack-destination", temp_dir, "--json"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        )
    )[0]
    archive = Path(temp_dir) / pack["filename"]
    archive_sha256 = hashlib.sha256(archive.read_bytes()).hexdigest()
    with tarfile.open(archive, "r:gz") as built_package:
        members = [member for member in built_package.getmembers() if member.isfile()]
        paths = {member.name.removeprefix("package/") for member in members}
        package_json_member = built_package.extractfile("package/package.json")
        if package_json_member is None:
            raise SystemExit("built archive has no package/package.json")
        built_package_json = json.load(package_json_member)
kit_sources = sorted((ROOT / "catalog/kits/vet-clinic").glob("*.kcad.ts"))
kit_previews = sorted((ROOT / "catalog/kits/vet-clinic/previews").glob("*.png"))
missing = [str(path.relative_to(ROOT)) for path in kit_sources + kit_previews if str(path.relative_to(ROOT)) not in paths]
if "catalog/index.json" not in paths:
    missing.append("catalog/index.json")

head_package = json.loads(subprocess.check_output(["git", "show", "HEAD:package.json"], cwd=ROOT, text=True))
built_exports_unchanged = built_package_json.get("exports") == head_package.get("exports")
changed_paths = subprocess.check_output(["git", "diff", "--name-only", "HEAD"], cwd=ROOT, text=True).splitlines()
forbidden_changed = [path for path in changed_paths if path.startswith(("src/checkout/", "src/billing/", "src/entitlements/", "src/suppliers/", "src/commissions/", "workers/"))]

# Retail-scene assets may contain words such as checkout in their IDs. They are
# reusable visualization props, so only product-layer code paths are flagged.
product_layer_terms = re.compile(r"(?:billing|checkout|entitlement|supplier|commission|commercial-orchestration)", re.I)
product_implementation_paths = [
    path for path in sorted(paths)
    if path.startswith(("src/", "site/", "workers/")) and product_layer_terms.search(path)
]
catalog_name_collisions = [
    path for path in sorted(paths)
    if path.startswith("catalog/kits/") and product_layer_terms.search(path)
]

result = {
    "command": "npm pack --ignore-scripts --pack-destination <temporary directory> --json",
    "packageName": pack["name"],
    "packageVersion": pack["version"],
    "fileCount": len(paths),
    "includedKitSources": sum(str(path.relative_to(ROOT)) in paths for path in kit_sources),
    "expectedKitSources": len(kit_sources),
    "includedKitPreviews": sum(str(path.relative_to(ROOT)) in paths for path in kit_previews),
    "expectedKitPreviews": len(kit_previews),
    "catalogIndexIncluded": "catalog/index.json" in paths,
    "builtTarballCreated": True,
    "archiveSha256": archive_sha256,
    "archiveRetained": False,
    "packageExportsUnchanged": built_exports_unchanged,
    "forbiddenChangedProductPaths": forbidden_changed,
    "productImplementationPaths": product_implementation_paths,
    "catalogAssetNameCollisionsExcludedAsReusableAssets": catalog_name_collisions,
    "missing": missing,
    "passed": not missing and built_exports_unchanged and not forbidden_changed and not product_implementation_paths,
}
(BUNDLE / "package-boundary-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
