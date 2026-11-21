#!/usr/bin/env python3
"""Check open catalog issue and PR text/files for the five reviewed assets."""

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPO = "w1ne/kernelCAD-web"
ASSETS = [
    "plate-heat-exchanger",
    "maintenance-platform",
    "scissor-lift-table",
    "burner-management-skid",
    "mobile-tool-cart",
]


def gh_json(*args: str):
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def changed_files(number: int) -> set[str]:
    result = subprocess.run(
        [
            "gh", "api", f"repos/{REPO}/pulls/{number}/files",
            "--paginate", "--jq", ".[] | .filename",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return {line for line in result.stdout.splitlines() if line}


issues = gh_json(
    "issue", "list", "--repo", REPO, "--state", "open", "--limit", "100",
    "--json", "number,title,body,url",
)
pull_requests = gh_json(
    "pr", "list", "--repo", REPO, "--state", "open", "--limit", "100",
    "--json", "number,title,body,url",
)

issue_hits = []
for issue in issues:
    text = f"{issue['title']}\n{issue.get('body', '')}".lower()
    matches = [asset for asset in ASSETS if asset in text]
    if matches:
        issue_hits.append({"number": issue["number"], "url": issue["url"], "assets": matches})

pull_request_hits = []
for pull_request in pull_requests:
    text = f"{pull_request['title']}\n{pull_request.get('body', '')}".lower()
    paths = changed_files(pull_request["number"])
    matches = []
    for asset in ASSETS:
        source = f"catalog/kits/industrial-plant/{asset}.kcad.ts"
        preview = f"catalog/kits/industrial-plant/previews/{asset}.png"
        if source in paths or preview in paths or asset in text:
            matches.append(asset)
    if matches:
        pull_request_hits.append(
            {"number": pull_request["number"], "url": pull_request["url"], "assets": matches}
        )

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
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, indent=2))
