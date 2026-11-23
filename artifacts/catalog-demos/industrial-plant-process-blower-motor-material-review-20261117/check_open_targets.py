#!/usr/bin/env python3
"""Check open catalog issues and pull-request files for the five audit targets."""

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSETS = [
    "palletizer-robot-cell",
    "pressure-relief-valve",
    "process-blower",
    "bucket-elevator",
    "chemical-metering-skid",
]


def gh_json(*args: str):
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


issues = gh_json(
    "issue", "list", "--state", "open", "--limit", "100",
    "--json", "number,title,body,url",
)
pull_requests = gh_json(
    "pr", "list", "--state", "open", "--limit", "100",
    "--json", "number,title,body,headRefName,url",
)

issue_hits = []
for issue in issues:
    text = f"{issue['title']}\n{issue['body']}".lower()
    matches = [asset for asset in ASSETS if asset in text]
    if matches:
        issue_hits.append({"number": issue["number"], "url": issue["url"], "assets": matches})

pull_request_hits = []
for pull_request in pull_requests:
    detail = gh_json("pr", "view", str(pull_request["number"]), "--json", "files")
    changed_paths = {entry["path"] for entry in detail["files"]}
    text = f"{pull_request['title']}\n{pull_request['body']}".lower()
    matches = []
    for asset in ASSETS:
        source = f"catalog/kits/industrial-plant/{asset}.kcad.ts"
        preview = f"catalog/kits/industrial-plant/previews/{asset}.png"
        if source in changed_paths or preview in changed_paths or asset in text:
            matches.append(asset)
    if matches:
        pull_request_hits.append({
            "number": pull_request["number"],
            "url": pull_request["url"],
            "assets": matches,
        })

report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "scope": "All open issues and open PR descriptions plus changed file paths",
    "assets": ASSETS,
    "openIssueCount": len(issues),
    "openPullRequestCount": len(pull_requests),
    "issueHits": issue_hits,
    "pullRequestHits": pull_request_hits,
}
(ROOT / "verification" / "open-target-check.json").write_text(
    json.dumps(report, indent=2) + "\n",
    encoding="utf-8",
)
print(json.dumps(report, indent=2))
