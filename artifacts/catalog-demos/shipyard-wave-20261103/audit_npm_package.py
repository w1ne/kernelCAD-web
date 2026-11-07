#!/usr/bin/env python3
"""Audit the dry-run npm package and source/built public-private boundary."""
import json
import re
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
pack = json.loads((BUNDLE / "npm-pack-dry-run.json").read_text(encoding="utf-8"))[0]
paths = [entry["path"] for entry in pack["files"]]
kit_sources = [path for path in paths if re.fullmatch(r"catalog/kits/shipyard/[^/]+\.kcad\.ts", path)]
kit_previews = [path for path in paths if re.fullmatch(r"catalog/kits/shipyard/previews/[^/]+\.png", path)]
kit_readmes = [path for path in paths if path == "catalog/kits/shipyard/README.md"]
kit_metadata = [path for path in paths if path == "catalog/kits/shipyard/kit.json"]
forbidden_paths = [path for path in paths if re.search(r"(^|/)(billing|checkout|entitlements?|commissions?|supplier-routing|commercial-policy)(/|$)", path, re.I)]
changed = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, text=True, capture_output=True, check=True).stdout.splitlines()
changed_paths = [line[3:] for line in changed]
exports = json.loads((ROOT / "package.json").read_text(encoding="utf-8")).get("exports")
baseline_package = json.loads(subprocess.run(["git", "show", "HEAD:package.json"], cwd=ROOT, text=True, capture_output=True, check=True).stdout)
baseline_exports = baseline_package.get("exports")
source_text = "\n".join(path.read_text(encoding="utf-8") for path in sorted((ROOT / "catalog" / "kits" / "shipyard").glob("*.kcad.ts")))
private_logic_terms = sorted(set(re.findall(r"\b(?:billing|checkout|entitlement|commission|supplier|quote[- ]routing|commercial orchestration)\b", source_text, re.I)))
commercial_workflow_pattern = re.compile(r"\b(?:billing|checkouts?|entitlements?|commissions?)\b|\bsupplier[- ]routing\b|\bquote[- ]routing\b|\bcommercial orchestration\b", re.I)
dist_javascript = [path for path in paths if path.startswith("dist/") and path.endswith(".js")]
built_logic_terms = sorted({
    match.group(0) for path in dist_javascript
    for match in commercial_workflow_pattern.finditer((ROOT / path).read_text(encoding="utf-8", errors="ignore"))
})
protected_change_paths = [
    path for path in changed_paths if path in {"package.json", "package-lock.json"}
    or path.startswith("src/") or path.startswith(".github/workflows/") or "deploy" in path.lower()
]
audit = {
    "packageName": pack.get("name"), "packageVersion": pack.get("version"),
    "shipyardSources": len(kit_sources), "shipyardPreviews": len(kit_previews),
    "shipyardReadme": len(kit_readmes) == 1, "shipyardKitMetadata": len(kit_metadata) == 1,
    "noCommercialImplementationPathsInPackage": not forbidden_paths,
    "noCommercialLogicTermsInNewAssets": not private_logic_terms,
    "builtJavaScriptFilesScanned": len(dist_javascript), "builtCommercialWorkflowTerms": built_logic_terms,
    "noCommercialWorkflowTermsInBuiltJavaScript": not built_logic_terms,
    "packageExportsUnchanged": exports == baseline_exports,
    "noPackageOrDeploymentWorkflowChanges": not protected_change_paths,
    "unexpectedProtectedPaths": protected_change_paths, "forbiddenPackagePaths": forbidden_paths,
    "commercialLogicTerms": private_logic_terms,
}
audit["passed"] = (
    audit["shipyardSources"] == 70 and audit["shipyardPreviews"] == 70
    and audit["shipyardReadme"] and audit["shipyardKitMetadata"]
    and audit["noCommercialImplementationPathsInPackage"] and audit["noCommercialLogicTermsInNewAssets"]
    and audit["noCommercialWorkflowTermsInBuiltJavaScript"] and audit["builtJavaScriptFilesScanned"] > 0
    and audit["packageExportsUnchanged"] and audit["noPackageOrDeploymentWorkflowChanges"]
)
target = BUNDLE / "npm-package-boundary-audit.json"
target.write_text(json.dumps(audit, indent=2) + "\n")
print(json.dumps(audit, indent=2))
if not audit["passed"]:
    raise SystemExit(f"npm/source-boundary audit failed; see {target}")
