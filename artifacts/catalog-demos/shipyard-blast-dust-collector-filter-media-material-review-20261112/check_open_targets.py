#!/usr/bin/env python3
"""Record open issue/PR searches and changed-source checks for this sample."""
import json
import subprocess
from pathlib import Path

ASSETS = [
    "abrasive-blast-pot",
    "blast-dust-collector",
    "electrode-storage-oven",
    "hull-block-paint-booth",
    "airless-coating-pump-cart",
]
REPO = "w1ne/kernelCAD-web"
DESTINATION_PR = 1258


def gh_json(args: list[str]) -> list[dict]:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


open_prs = gh_json(["pr", "list", "--repo", REPO, "--state", "open", "--json", "number,title,files", "--limit", "100"])
results = {}
for asset in ASSETS:
    issues = gh_json([
        "issue", "list", "--repo", REPO, "--state", "open", "--search", asset,
        "--json", "number,title,url",
    ])
    pr_search = gh_json([
        "pr", "list", "--repo", REPO, "--state", "open", "--search", asset,
        "--json", "number,title,url",
    ])
    source_path = f"catalog/kits/shipyard/{asset}.kcad.ts"
    changed_paths = [
        {"number": pr["number"], "title": pr["title"]}
        for pr in open_prs
        if any(file["path"] == source_path for file in pr["files"])
    ]
    destination_mentions = [pr for pr in pr_search if pr["number"] == DESTINATION_PR]
    competitors = [pr for pr in pr_search if pr["number"] != DESTINATION_PR]
    results[asset] = {
        "openIssueTitleBodyMatches": issues,
        "openPrSearchMatches": pr_search,
        "destinationPrTextMatches": destination_mentions,
        "competingOpenPrSearchMatches": competitors,
        "openPrChangedSourceMatches": changed_paths,
    }
    assert not issues and not competitors and not changed_paths, f"competing open target for {asset}"

record = {"checkedAt": "2026-11-12", "repository": REPO, "destinationPr": DESTINATION_PR, "results": results}
out = Path(__file__).resolve().parent / "open-target-check.json"
out.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
