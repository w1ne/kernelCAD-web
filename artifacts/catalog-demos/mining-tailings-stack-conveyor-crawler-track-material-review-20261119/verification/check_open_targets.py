#!/usr/bin/env python3
"""Record exact issue and pull-request overlap for this five-asset audit."""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
BUNDLE = Path(__file__).resolve().parents[1]
REPO = "w1ne/kernelCAD-web"
KIT = "mining"
ASSETS = [
    "core-drill-rig",
    "overland-conveyor-bridge",
    "stacker-reclaimer-boom",
    "tailings-stack-conveyor",
    "ore-sorting-arch",
]
KNOWN_FIX_PRS = [1298, 1305, 1307, 1308]


def run_json(*args: str):
    result = subprocess.run(args, cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def gh_pages(endpoint: str):
    rows = []
    page = 1
    while True:
        batch = run_json("gh", "api", f"{endpoint}?per_page=100&page={page}")
        rows.extend(batch)
        if len(batch) < 100:
            return rows
        page += 1


def pull_files(number: int):
    rows = []
    page = 1
    while True:
        batch = run_json(
            "gh", "api", f"repos/{REPO}/pulls/{number}/files?per_page=100&page={page}"
        )
        rows.extend(batch)
        if len(batch) < 100:
            return rows
        page += 1


def exact_token(text: str, asset_id: str, full_path: str):
    if full_path in text:
        return True
    pattern = rf"(?<![A-Za-z0-9-]){re.escape(asset_id)}(?![A-Za-z0-9-])"
    return re.search(pattern, text, re.IGNORECASE) is not None


open_issues = [
    row for row in gh_pages(f"repos/{REPO}/issues") if "pull_request" not in row
]
open_pulls = gh_pages(f"repos/{REPO}/pulls")
current_head = run_json("gh", "pr", "view", "1507", "--json", "headRefOid")[
    "headRefOid"
]
local_head = subprocess.run(
    ["git", "rev-parse", "HEAD"], cwd=ROOT, check=True, capture_output=True, text=True
).stdout.strip()
if local_head != current_head:
    raise SystemExit(f"local HEAD {local_head} does not match PR #1507 head {current_head}")

pull_file_sets = {}
pull_audit_methods = {}
for row in open_pulls:
    number = row["number"]
    if number == 1507:
        paths = subprocess.run(
            ["git", "diff", "--name-only", "origin/develop...HEAD"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.splitlines()
        pull_file_sets[number] = set(paths)
        pull_audit_methods[number] = "complete local diff at matching PR head"
    else:
        files = pull_files(number)
        pull_file_sets[number] = {item["filename"] for item in files}
        pull_audit_methods[number] = "paginated GitHub changed-file API"

closed_fix_pulls = {}
for number in KNOWN_FIX_PRS:
    pull = run_json("gh", "api", f"repos/{REPO}/pulls/{number}")
    files = pull_files(number)
    closed_fix_pulls[number] = {
        "state": pull["state"],
        "mergedAt": pull.get("merged_at"),
        "title": pull["title"],
        "files": {item["filename"] for item in files},
    }

candidate_rows = []
for asset_id in ASSETS:
    source_path = f"catalog/kits/{KIT}/{asset_id}.kcad.ts"
    preview_path = f"catalog/kits/{KIT}/previews/{asset_id}.png"
    issue_matches = []
    for issue in open_issues:
        text = f"{issue.get('title', '')}\n{issue.get('body') or ''}"
        if exact_token(text, asset_id, f"{KIT}/{asset_id}") or exact_token(
            text, asset_id, source_path
        ):
            issue_matches.append({"number": issue["number"], "title": issue["title"]})

    pr_matches = []
    for pull in open_pulls:
        number = pull["number"]
        text = f"{pull.get('title', '')}\n{pull.get('body') or ''}"
        matching_paths = sorted(
            path for path in pull_file_sets[number] if path in {source_path, preview_path}
        )
        if matching_paths or exact_token(text, asset_id, f"{KIT}/{asset_id}"):
            pr_matches.append(
                {
                    "number": number,
                    "title": pull["title"],
                    "matchingPaths": matching_paths,
                    "pathAudit": pull_audit_methods[number],
                }
            )

    known_fix_matches = []
    for number, pull in closed_fix_pulls.items():
        matching_paths = sorted(
            path for path in pull["files"] if path in {source_path, preview_path}
        )
        if matching_paths:
            known_fix_matches.append({"number": number, "matchingPaths": matching_paths})

    candidate_rows.append(
        {
            "asset": f"{KIT}/{asset_id}",
            "sourcePath": source_path,
            "previewPath": preview_path,
            "openIssueMatches": issue_matches,
            "openPullRequestMatches": pr_matches,
            "knownFixPullRequestMatches": known_fix_matches,
            "clearForSelection": not issue_matches and not pr_matches and not known_fix_matches,
        }
    )

if not all(row["clearForSelection"] for row in candidate_rows):
    raise SystemExit("At least one selected asset overlaps existing issue or PR work")

pr_status = run_json(
    "gh",
    "pr",
    "view",
    "1507",
    "--json",
    "number,state,headRefOid,mergeStateStatus,reviewDecision,reviews,statusCheckRollup,url",
)
feature_status = run_json(
    "gh",
    "pr",
    "view",
    "1258",
    "--json",
    "number,state,mergedAt,reviewDecision,reviews,statusCheckRollup,url",
)

report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "repository": REPO,
    "branch": subprocess.run(
        ["git", "branch", "--show-current"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip(),
    "localHead": local_head,
    "featurePR1258": feature_status,
    "activeCatalogPR1507": pr_status,
    "openPullRequestsChecked": [row["number"] for row in open_pulls],
    "knownFixPullRequestsExcluded": [
        {
            "number": number,
            "state": pull["state"],
            "mergedAt": pull["mergedAt"],
            "title": pull["title"],
        }
        for number, pull in closed_fix_pulls.items()
    ],
    "candidates": candidate_rows,
}

(BUNDLE / "verification" / "open-target-check.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
print(f"Checked {len(candidate_rows)} assets against {len(open_issues)} open issues.")
print(f"Checked {len(open_pulls)} open PRs and known fix PRs {KNOWN_FIX_PRS}.")
for row in candidate_rows:
    print(f"CLEAR {row['asset']}: no exact open issue/PR path overlap or known-fix overlap")
