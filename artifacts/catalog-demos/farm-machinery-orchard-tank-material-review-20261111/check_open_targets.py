#!/usr/bin/env python3
"""Check five sample assets against other open issue and PR targets."""

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = "w1ne/kernelCAD-web"
CURRENT_PR = 1258
ASSETS = [
    "orchard-air-blast-sprayer",
    "potato-harvester",
    "self-propelled-field-sprayer",
    "grain-dryer",
    "farm-grain-auger",
]


def gh_json(args: list[str]) -> list[dict]:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


open_prs = gh_json([
    "pr", "list", "--repo", REPO, "--state", "open", "--limit", "100",
    "--json", "number,title",
])
other_open_prs = []
for pr in open_prs:
    if pr["number"] == CURRENT_PR:
        continue
    files = gh_json([
        "api", "--paginate",
        f"repos/{REPO}/pulls/{pr['number']}/files?per_page=100",
    ])
    other_open_prs.append((pr, {file["filename"] for file in files}))

results = {}
for asset in ASSETS:
    source_path = f"catalog/kits/farm-machinery/{asset}.kcad.ts"
    issues = gh_json([
        "issue", "list", "--repo", REPO, "--state", "open", "--search", asset,
        "--json", "number,title,url",
    ])
    prs = gh_json([
        "pr", "list", "--repo", REPO, "--state", "open", "--search", asset,
        "--json", "number,title,url",
    ])
    changed_source_matches = [
        {"number": pr["number"], "title": pr["title"]}
        for pr, paths in other_open_prs
        if source_path in paths
    ]
    results[asset] = {
        "source": source_path,
        "openIssueTitleBodyMatches": issues,
        "openPrTitleBodyMatches": prs,
        "otherOpenPrChangedSourceMatches": changed_source_matches,
    }
    assert not issues and not prs and not changed_source_matches, f"open target found for {asset}"

record = {
    "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
    "repository": REPO,
    "currentDestinationPrExcludedFromChangedSourceConflicts": CURRENT_PR,
    "otherOpenPrsChecked": [{"number": pr["number"], "title": pr["title"]} for pr, _ in other_open_prs],
    "results": results,
}
output = Path(__file__).resolve().parent / "verification" / "open-target-check.json"
output.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
