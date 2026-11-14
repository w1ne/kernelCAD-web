#!/usr/bin/env python3
"""Record open issue/PR title-body and changed-path checks for the sample."""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
DESTINATION_PR = 1258
ASSETS = {
    "recycling-facility/ballistic-separator": "ballistic-separator",
    "wind-energy/wind-turbine-blade": "wind-turbine-blade",
    "water-treatment/chlorine-dosing-skid": "chlorine-dosing-skid",
    "grid-substation/substation-oil-cooling-pump-skid": "substation-oil-cooling-pump-skid",
    "mining/continuous-miner": "continuous-miner",
}


def gh_json(*args: str) -> object:
    result = subprocess.run(
        ["gh", *args], check=True, capture_output=True, text=True
    )
    return json.loads(result.stdout)


open_prs = gh_json(
    "pr", "list", "--state", "open", "--limit", "100",
    "--json", "number,title,url",
)
assert isinstance(open_prs, list)
files_by_pr = {
    pr["number"]: {item["path"] for item in gh_json("pr", "view", str(pr["number"]), "--json", "files")["files"]}
    for pr in open_prs
    if pr["number"] != DESTINATION_PR
}

asset_results = []
for asset_path, asset_id in ASSETS.items():
    issue_matches = gh_json(
        "issue", "list", "--state", "open", "--search", asset_id,
        "--json", "number,title,url",
    )
    pr_text_matches = gh_json(
        "pr", "list", "--state", "open", "--search", asset_id,
        "--json", "number,title,url",
    )
    expected_paths = {
        f"catalog/kits/{asset_path}.kcad.ts",
        f"catalog/kits/{asset_path.split('/', 1)[0]}/previews/{asset_id}.png",
    }
    path_matches = []
    for pr in open_prs:
        number = pr["number"]
        if number == DESTINATION_PR:
            continue
        changed_paths = sorted(expected_paths.intersection(files_by_pr[number]))
        if changed_paths:
            path_matches.append(
                {"number": number, "title": pr["title"], "paths": changed_paths}
            )
    asset_results.append(
        {
            "asset": asset_path,
            "issueTitleBodyMatches": issue_matches,
            "openPrTitleBodyMatchesExcludingDestination": [
                pr for pr in pr_text_matches if pr["number"] != DESTINATION_PR
            ],
            "changedSourceOrPreviewPathsInOtherOpenPrs": path_matches,
        }
    )

output = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "destinationPr": DESTINATION_PR,
    "method": "GitHub CLI open issue/PR title-body search plus exact changed source/preview path checks for every other open PR",
    "assets": asset_results,
}
(BUNDLE / "open-target-check.json").write_text(
    json.dumps(output, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(output, indent=2))
