#!/usr/bin/env python3
"""Check exact asset source paths and slugs against currently open GitHub work."""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
REPO = "w1ne/kernelCAD-web"
KIT = "beverage-bottling-line"
IDS = (
    "rotary-filler",
    "sanitary-lobe-pump",
    "pet-blow-molder",
    "case-checkweigher",
    "flash-pasteurizer",
)
TARGET_PATHS = {f"catalog/kits/{KIT}/{asset_id}.kcad.ts" for asset_id in IDS}


def gh_json(*args: str):
    return json.loads(subprocess.check_output(["gh", *args], cwd=ROOT, text=True))


issues = gh_json("issue", "list", "--state", "open", "--limit", "100",
                 "--json", "number,title,body,url")
prs = gh_json("pr", "list", "--state", "open", "--limit", "100",
              "--json", "number,title,url")
slug_pattern = "|".join(IDS)
issue_matches = [
    {"number": issue["number"], "title": issue["title"], "url": issue["url"]}
    for issue in issues
    if any(slug in f'{issue["title"]} {issue["body"]}'.lower() for slug in IDS)
]

path_matches = []
for pr in prs:
    files = gh_json("api", f"repos/{REPO}/pulls/{pr['number']}/files", "--paginate")
    for item in files:
        if item["filename"] in TARGET_PATHS:
            path_matches.append({
                "number": pr["number"],
                "title": pr["title"],
                "url": pr["url"],
                "filename": item["filename"],
            })

report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "repository": REPO,
    "sampleIds": list(IDS),
    "openIssueCount": len(issues),
    "openPullRequestCount": len(prs),
    "openIssueSlugMatches": issue_matches,
    "openPullRequestSourcePathMatches": path_matches,
    "checkedOpenPullRequests": [{"number": pr["number"], "title": pr["title"], "url": pr["url"]} for pr in prs],
}
output = Path(__file__).resolve().parent / "open-target-check.json"
output.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({
    "checkedOpenIssues": len(issues),
    "checkedOpenPRs": len(prs),
    "issueMatches": issue_matches,
    "sourcePathMatches": path_matches,
}, indent=2))
