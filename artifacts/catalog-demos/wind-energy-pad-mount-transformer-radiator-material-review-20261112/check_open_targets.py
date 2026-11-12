#!/usr/bin/env python3
"""Check the five-sample audit against open issue/PR text and PR source paths."""
from datetime import datetime, timezone
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = "w1ne/kernelCAD-web"
DESTINATION_PR = 1258
ASSETS = [
    ("wind-energy", "blade-root-protector"),
    ("wind-energy", "cable-entry-boot"),
    ("wind-energy", "nacelle-transport-frame"),
    ("wind-energy", "wind-farm-meter-pedestal"),
    ("wind-energy", "wind-farm-pad-mount-transformer"),
]


def gh_json(args: list[str]) -> list[dict]:
    return json.loads(subprocess.check_output(["gh", *args], text=True))


open_prs = gh_json([
    "pr", "list", "--repo", REPO, "--state", "open", "--limit", "100",
    "--json", "number,title,url",
])
paths_by_pr = {}
for pr in open_prs:
    paths = subprocess.check_output([
        "gh", "api", "--paginate", "--jq", ".[].filename",
        f"repos/{REPO}/pulls/{pr['number']}/files?per_page=100",
    ], text=True).splitlines()
    paths_by_pr[pr["number"]] = set(paths)

results = {}
for kit, asset in ASSETS:
    issues = gh_json([
        "issue", "list", "--repo", REPO, "--state", "open", "--search", asset,
        "--json", "number,title,url",
    ])
    pr_search = gh_json([
        "pr", "list", "--repo", REPO, "--state", "open", "--search", asset,
        "--json", "number,title,url",
    ])
    source_path = f"catalog/kits/{kit}/{asset}.kcad.ts"
    changed_matches = [
        {"number": pr["number"], "title": pr["title"]}
        for pr in open_prs
        if source_path in paths_by_pr[pr["number"]]
    ]
    destination_mentions = [pr for pr in pr_search if pr["number"] == DESTINATION_PR]
    competing_text_matches = [pr for pr in pr_search if pr["number"] != DESTINATION_PR]
    results[asset] = {
        "kit": kit,
        "openIssueTitleBodyMatches": issues,
        "openPrSearchMatches": pr_search,
        "destinationPrTextMatches": destination_mentions,
        "competingOpenPrSearchMatches": competing_text_matches,
        "openPrChangedSourceMatches": changed_matches,
    }
    assert not issues, f"open issue mentions {asset}: {issues}"
    assert not competing_text_matches, f"competing open PR mentions {asset}: {competing_text_matches}"
    assert not changed_matches, f"open PR changes {source_path}: {changed_matches}"

record = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "repository": REPO,
    "destinationPr": DESTINATION_PR,
    "openPrCount": len(open_prs),
    "openPrFilesFetchedPaginated": True,
    "results": results,
}
out = HERE / "open-target-check.json"
out.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
