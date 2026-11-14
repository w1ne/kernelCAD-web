#!/usr/bin/env python3
"""Record open issue/PR title-body and changed-path checks for the five samples."""

import json
import subprocess
from pathlib import Path

ASSETS = [
    "plate-rolling-machine",
    "plasma-cutting-gantry-head",
    "pipe-spool-rotator",
    "hull-panel-cutting-table",
    "hull-panel-turnover-cradle",
]
REPO = "w1ne/kernelCAD-web"


def gh_json(args: list[str]) -> list[dict]:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


open_prs = gh_json(["pr", "list", "--state", "open", "--json", "number,title,files", "--limit", "100"])
results = {}
for asset in ASSETS:
    issue_matches = gh_json([
        "issue", "list", "--repo", REPO, "--state", "open", "--search", asset,
        "--json", "number,title,url",
    ])
    pr_text_matches = gh_json([
        "pr", "list", "--repo", REPO, "--state", "open", "--search", asset,
        "--json", "number,title,url",
    ])
    source_path = f"catalog/kits/shipyard/{asset}.kcad.ts"
    path_matches = [
        {"number": pr["number"], "title": pr["title"]}
        for pr in open_prs
        if any(file["path"] == source_path for file in pr["files"])
    ]
    results[asset] = {
        "openIssueTitleBodyMatches": issue_matches,
        "openPrTitleBodyMatches": pr_text_matches,
        "openPrChangedSourceMatches": path_matches,
    }
    assert not issue_matches and not pr_text_matches and not path_matches, f"open target found for {asset}"

record = {"checkedAt": "2026-11-11", "repository": REPO, "results": results}
path = Path(__file__).resolve().parent / "open-target-check.json"
path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
