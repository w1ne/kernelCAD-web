#!/usr/bin/env python3
"""Audit public source scope and the built npm package inventory."""

import json
import re
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
result = subprocess.run(
    ["npm", "pack", "--dry-run", "--ignore-scripts", "--json"],
    cwd=ROOT, capture_output=True, text=True, check=False,
)
(BUNDLE / "npm-pack-dry-run-stderr.txt").write_text(result.stderr, encoding="utf-8")
(BUNDLE / "npm-pack-dry-run-stdout.txt").write_text(result.stdout, encoding="utf-8")
if result.returncode:
    raise SystemExit(f"npm pack dry run failed: {result.stderr}")
parsed_pack = json.loads(result.stdout)
pack = parsed_pack[0] if isinstance(parsed_pack, list) else next(iter(parsed_pack.values()))
paths = [entry["path"] for entry in pack["files"]]
(BUNDLE / "npm-pack-file-list.txt").write_text("\n".join(paths) + "\n", encoding="utf-8")

status = subprocess.run(
    ["git", "status", "--porcelain", "--untracked-files=all"],
    cwd=ROOT, text=True, capture_output=True, check=True,
).stdout.splitlines()
changed_paths = [line[3:] for line in status]
protected_change_paths = [
    path for path in changed_paths
    if path in {"package.json", "package-lock.json"}
    or path.startswith(("src/", ".github/workflows/"))
    or "deploy" in path.lower()
]
sources = sorted((ROOT / "catalog/kits/grid-substation").glob("*.kcad.ts"))
source_text = "\n".join(path.read_text(encoding="utf-8") for path in sources)
commercial_terms = sorted(set(re.findall(
    r"\b(?:billing|checkout|entitlements?|commissions?|supplier[- ]routing|quote[- ]routing|commercial orchestration)\b",
    source_text, re.IGNORECASE,
)))
kit_sources = [path for path in paths if re.fullmatch(r"catalog/kits/grid-substation/[^/]+\.kcad\.ts", path)]
kit_previews = [path for path in paths if re.fullmatch(r"catalog/kits/grid-substation/previews/[^/]+\.png", path)]
kit_readme = "catalog/kits/grid-substation/README.md" in paths
kit_metadata = "catalog/kits/grid-substation/kit.json" in paths
package_artifact_paths = [path for path in paths if path.startswith("artifacts/")]
package_private_research_paths = [
    path for path in paths
    if re.search(r"(^|/)(?:private|private-research|comparison|comparisons)(/|$)", path, re.I)
]
forbidden_paths = [path for path in paths if re.search(r"(^|/)(billing|checkout|entitlements?|commissions?|supplier-routing|commercial-policy)(/|$)", path, re.I)]
commercial_pattern = re.compile(r"\b(?:billing|checkouts?|entitlements?|commissions?)\b|\bsupplier[- ]routing\b|\bquote[- ]routing\b|\bcommercial orchestration\b", re.I)
dist_javascript = [path for path in paths if path.startswith("dist/") and path.endswith(".js")]
built_terms = sorted({
    match.group(0) for path in dist_javascript
    for match in commercial_pattern.finditer((ROOT / path).read_text(encoding="utf-8", errors="ignore"))
})
package_exports = json.loads((ROOT / "package.json").read_text(encoding="utf-8")).get("exports")
baseline = json.loads(subprocess.run(
    ["git", "show", "HEAD:package.json"], cwd=ROOT, text=True,
    capture_output=True, check=True,
).stdout)

audit = {
    "packageName": pack.get("name"),
    "packageVersion": pack.get("version"),
    "packageFileCount": len(paths),
    "newCatalogSources": len(sources),
    "catalogSourcesInNpmArtifact": len(kit_sources),
    "catalogPreviewsInNpmArtifact": len(kit_previews),
    "catalogKitReadmeInNpmArtifact": kit_readme,
    "catalogKitMetadataInNpmArtifact": kit_metadata,
    "npmArtifactExcludesDemoArtifacts": not package_artifact_paths,
    "npmArtifactExcludesPrivateResearch": not package_private_research_paths,
    "npmArtifactHasNoForbiddenCommercialPaths": not forbidden_paths,
    "sourceHasNoCommercialWorkflowTerms": not commercial_terms,
    "builtJavaScriptFilesScanned": len(dist_javascript),
    "builtCommercialWorkflowTerms": built_terms,
    "builtNpmJavaScriptHasNoCommercialWorkflows": not built_terms and len(dist_javascript) > 0,
    "packageExportsUnchanged": package_exports == baseline.get("exports"),
    "noPackageOrImplementationOrDeploymentWorkflowChanges": not protected_change_paths,
    "commercialTerms": commercial_terms,
    "forbiddenPackagePaths": forbidden_paths,
    "unexpectedProtectedPaths": protected_change_paths,
}
audit["passed"] = all(audit[key] for key in (
    "sourceHasNoCommercialWorkflowTerms", "npmArtifactHasNoForbiddenCommercialPaths",
    "npmArtifactExcludesDemoArtifacts", "npmArtifactExcludesPrivateResearch",
    "builtNpmJavaScriptHasNoCommercialWorkflows", "packageExportsUnchanged",
    "noPackageOrImplementationOrDeploymentWorkflowChanges",
)) and len(sources) == len(kit_sources) == len(kit_previews) == 80 and kit_readme and kit_metadata
(BUNDLE / "npm-pack-audit.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
print(json.dumps(audit, indent=2))
if not audit["passed"]:
    raise SystemExit(f"source/npm boundary audit failed; see {BUNDLE / 'npm-pack-audit.json'}")
