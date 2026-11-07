#!/usr/bin/env python3
"""Capture npm's dry-run package inventory without lifecycle scripts."""
import json
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
command = ["npm", "pack", "--dry-run", "--ignore-scripts", "--json"]
result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
if result.returncode:
    (BUNDLE / "npm-pack-audit.json").write_text(json.dumps({"passed": False, "exitCode": result.returncode, "stderr": result.stderr}, indent=2) + "\n")
    raise SystemExit(f"npm pack dry run failed with status {result.returncode}: {result.stderr}")
raw_inventory = json.loads(result.stdout)
inventory = raw_inventory if isinstance(raw_inventory, list) else [raw_inventory]
if not inventory:
    raise SystemExit("npm pack dry run returned no package inventory")
package = inventory[0]
files = package.get("files", [])
inventory_path = Path("/tmp/kernelcad-shipyard-quality-npm-pack.json")
inventory_path.write_text(json.dumps(inventory), encoding="utf-8")
summary = {
    "command": " ".join(command),
    "lifecycleScriptsDisabled": True,
    "dryRun": True,
    "packages": len(inventory),
    "packageName": package.get("name"),
    "packageVersion": package.get("version"),
    "packageFiles": len(files),
    "shipyardSources": sum(entry.get("path", "").startswith("catalog/kits/shipyard/") and entry.get("path", "").endswith(".kcad.ts") for entry in files),
    "shipyardPreviews": sum(entry.get("path", "").startswith("catalog/kits/shipyard/previews/") and entry.get("path", "").endswith(".png") for entry in files),
    "catalogIndexPackaged": any(entry.get("path") == "catalog/index.json" for entry in files),
    "inventoryForBoundaryAudit": str(inventory_path),
    "passed": True,
}
(BUNDLE / "npm-pack-audit.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
