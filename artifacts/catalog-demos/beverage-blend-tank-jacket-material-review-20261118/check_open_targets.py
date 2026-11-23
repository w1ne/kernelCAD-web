#!/usr/bin/env python3
"""Record issue/PR overlap for this five-asset semantic audit."""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


REPO = "w1ne/kernelCAD-web"
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "verification" / "open-target-check.json"
ASSETS = [
    "bottle-unscrambler",
    "beverage-blend-tank",
    "flash-pasteurizer",
    "filler-valve-head",
    "bottle-accumulation-table",
]
TRACKED_FIXES = [1298, 1305, 1307, 1308]


def gh_json(*args: str):
    completed = subprocess.run(["gh", *args], check=True, text=True, capture_output=True)
    return json.loads(completed.stdout)


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def matching_ids(value: str) -> list[str]:
    text = normalized(value)
    return [asset_id for asset_id in ASSETS if normalized(asset_id) in text]


def pull_files(number: int) -> list[str]:
    completed = subprocess.run(
        ["gh", "api", f"repos/{REPO}/pulls/{number}/files", "--paginate", "--jq", ".[].filename"],
        check=True, text=True, capture_output=True,
    )
    return [line for line in completed.stdout.splitlines() if line]


def main() -> None:
    pull_requests = gh_json(
        "pr", "list", "--state", "open", "--limit", "100",
        "--json", "number,title,body,url",
    )
    issues = gh_json(
        "issue", "list", "--state", "open", "--limit", "100",
        "--json", "number,title,body,url",
    )

    pr_results = []
    for pr in pull_requests:
        files = pull_files(pr["number"])
        path_hits = sorted({
            asset_id for path in files for asset_id in ASSETS
            if f"catalog/kits/beverage-bottling-line/{asset_id}.kcad.ts" in path
        })
        text_hits = matching_ids(f"{pr.get('title', '')}\n{pr.get('body', '')}")
        pr_results.append({
            "number": pr["number"],
            "title": pr.get("title"),
            "url": pr.get("url"),
            "changedFileCount": len(files),
            "pathMatches": path_hits,
            "titleOrBodyMatches": sorted(set(text_hits)),
        })

    issue_results = []
    for issue in issues:
        hits = matching_ids(f"{issue.get('title', '')}\n{issue.get('body', '')}")
        if hits:
            issue_results.append({
                "number": issue["number"],
                "title": issue.get("title"),
                "url": issue.get("url"),
                "matches": hits,
            })

    prior_results = []
    for number in TRACKED_FIXES:
        pr = gh_json("pr", "view", str(number), "--json", "number,title,body,url,state")
        files = pull_files(number)
        path_hits = sorted({
            asset_id for path in files for asset_id in ASSETS
            if f"catalog/kits/beverage-bottling-line/{asset_id}.kcad.ts" in path
        })
        text_hits = matching_ids(f"{pr.get('title', '')}\n{pr.get('body', '')}")
        prior_results.append({
            "number": number,
            "state": pr.get("state"),
            "title": pr.get("title"),
            "pathMatches": path_hits,
            "titleOrBodyMatches": sorted(set(text_hits)),
        })

    report = {
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "method": "Scanned all open PR file lists, open issue/PR title and body text, plus paths and descriptions for the four previously flagged catalog PRs.",
        "assets": ASSETS,
        "openPullRequestsScanned": len(pr_results),
        "openIssuesScanned": len(issues),
        "pullRequests": pr_results,
        "matchingOpenIssues": issue_results,
        "trackedFixes": prior_results,
        "noOverlap": not issue_results and all(
            not row["pathMatches"] and not row["titleOrBodyMatches"]
            for row in pr_results + prior_results
        ),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
