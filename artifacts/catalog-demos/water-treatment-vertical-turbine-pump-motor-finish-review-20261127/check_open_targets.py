#!/usr/bin/env python3
"""Check selected IDs against current open issues/PRs and known fix PRs."""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BUNDLE = Path(__file__).resolve().parent
REPO = "w1ne/kernelCAD-web"
ASSETS = [
    ("recycling-facility", "eddy-current-separator"),
    ("grid-substation", "substation-main-power-transformer"),
    ("water-treatment", "vertical-turbine-pump"),
    ("wind-energy", "offshore-wind-turbine"),
    ("industrial-plant", "centrifugal-pump"),
]
KNOWN_FIX_PRS = [1298, 1305, 1307, 1308]


def gh_json(*args: str):
    result = subprocess.run(args, cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def api_pages(endpoint: str):
    rows = []
    page = 1
    while True:
        separator = "&" if "?" in endpoint else "?"
        batch = gh_json("gh", "api", f"{endpoint}{separator}per_page=100&page={page}")
        rows.extend(batch)
        if len(batch) < 100:
            return rows
        page += 1


def pull_files(number: int):
    return api_pages(f"repos/{REPO}/pulls/{number}/files")


def exact_token(text: str, asset_id: str, full_path: str) -> bool:
    if full_path in text:
        return True
    pattern = rf"(?<![A-Za-z0-9-]){re.escape(asset_id)}(?![A-Za-z0-9-])"
    return re.search(pattern, text, re.IGNORECASE) is not None


open_issues = [
    row for row in api_pages(f"repos/{REPO}/issues?state=open")
    if "pull_request" not in row
]
open_pulls = api_pages(f"repos/{REPO}/pulls?state=open")
pull_paths = {
    row["number"]: {file["filename"] for file in pull_files(row["number"])}
    for row in open_pulls
}
known_fix_paths = {
    number: {file["filename"] for file in pull_files(number)}
    for number in KNOWN_FIX_PRS
}

rows = []
for kit, asset_id in ASSETS:
    source_path = f"catalog/kits/{kit}/{asset_id}.kcad.ts"
    preview_path = f"catalog/kits/{kit}/previews/{asset_id}.png"
    issue_matches = []
    for issue in open_issues:
        text = f"{issue.get('title', '')}\n{issue.get('body') or ''}"
        if exact_token(text, asset_id, f"{kit}/{asset_id}") or exact_token(
            text, asset_id, source_path
        ):
            issue_matches.append({"number": issue["number"], "title": issue["title"]})

    pr_matches = []
    for pull in open_pulls:
        text = f"{pull.get('title', '')}\n{pull.get('body') or ''}"
        matching_paths = sorted(
            path for path in pull_paths[pull["number"]]
            if path in {source_path, preview_path}
        )
        if matching_paths or exact_token(text, asset_id, f"{kit}/{asset_id}"):
            pr_matches.append(
                {"number": pull["number"], "title": pull["title"], "matchingPaths": matching_paths}
            )

    known_matches = []
    for number, paths in known_fix_paths.items():
        matching_paths = sorted(path for path in paths if path in {source_path, preview_path})
        if matching_paths:
            known_matches.append({"number": number, "matchingPaths": matching_paths})

    rows.append(
        {
            "asset": f"{kit}/{asset_id}",
            "sourcePath": source_path,
            "previewPath": preview_path,
            "openIssueMatches": issue_matches,
            "openPullRequestMatches": pr_matches,
            "knownFixPullRequestMatches": known_matches,
            "clearForSelection": not issue_matches and not pr_matches and not known_matches,
        }
    )

report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "repository": REPO,
    "baseline": "origin/develop at 7fce1daef",
    "openPullRequestCount": len(open_pulls),
    "candidateAssets": rows,
}
(BUNDLE / "verification" / "open-target-check.json").write_text(
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
if not all(row["clearForSelection"] for row in rows):
    raise SystemExit("a selected asset overlaps existing issue or PR work")
print(json.dumps(report, indent=2))
