#!/usr/bin/env python3
"""Capture npm's dry-run package inventory without running lifecycle scripts."""
import json
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
command = ["npm", "pack", "--dry-run", "--ignore-scripts", "--json"]
result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
(BUNDLE / "npm-pack-dry-run-stderr.txt").write_text(result.stderr, encoding="utf-8")
(BUNDLE / "npm-pack-dry-run-stdout.txt").write_text(result.stdout, encoding="utf-8")
if result.returncode:
    raise SystemExit(f"npm pack dry run failed with status {result.returncode}")
raw_inventory = json.loads(result.stdout)
if isinstance(raw_inventory, list):
    inventory = raw_inventory
elif isinstance(raw_inventory, dict) and "files" in raw_inventory:
    inventory = [raw_inventory]
else:
    inventory = list(raw_inventory.values()) if isinstance(raw_inventory, dict) else []
(BUNDLE / "npm-pack-dry-run.json").write_text(json.dumps(inventory, indent=2) + "\n", encoding="utf-8")
print(json.dumps({
    "command": " ".join(command),
    "lifecycleScriptsDisabled": True,
    "dryRun": True,
    "packages": len(inventory),
    "files": len(inventory[0].get("files", [])) if inventory else 0,
    "npmPackDryRunPassed": True,
}, indent=2))
