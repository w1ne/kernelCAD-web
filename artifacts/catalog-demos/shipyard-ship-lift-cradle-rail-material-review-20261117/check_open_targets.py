#!/usr/bin/env python3
"""Record that the five shipyard sample assets are not open issue/PR targets."""

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSETS = [
    "ship-lift-cradle",
    "shipyard-block-transporter",
    "plate-rolling-machine",
    "weld-fit-up-table",
    "pipe-spool-rotator",
]
KIT = "shipyard"


def gh_json(*args: str):
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def changed_files(number: int) -> set[str]:
    result = subprocess.run(
        [
            "gh", "api", f"repos/w1ne/kernelCAD-web/pulls/{number}/files?per_page=100",
            "--paginate", "--jq", ".[].filename",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return {line for line in result.stdout.splitlines() if line}


def asset_match(asset: str, text: str) -> bool:
    return re.search(r"(?<![a-z0-9-])" + re.escape(asset) + r"(?![a-z0-9-])", text.lower()) is not None


issues = gh_json(
    "issue", "list", "--state", "open", "--limit", "100",
    "--json", "number,title,body,url",
)
pull_requests = gh_json(
    "pr", "list", "--state", "open", "--limit", "100",
    "--json", "number,title,body,url",
)

issue_hits = []
for issue in issues:
    text = f"{issue['title']}\n{issue.get('body') or ''}"
    matches = [asset for asset in ASSETS if asset_match(asset, text)]
    if matches:
        issue_hits.append({"number": issue["number"], "url": issue["url"], "assets": matches})

pull_request_hits = []
for pull_request in pull_requests:
    text = f"{pull_request['title']}\n{pull_request.get('body') or ''}"
    paths = changed_files(pull_request["number"])
    matches = []
    for asset in ASSETS:
        source = f"catalog/kits/{KIT}/{asset}.kcad.ts"
        preview = f"catalog/kits/{KIT}/previews/{asset}.png"
        if source in paths or preview in paths or asset_match(asset, text):
            matches.append(asset)
    if matches:
        pull_request_hits.append({
            "number": pull_request["number"],
            "url": pull_request["url"],
            "assets": matches,
        })

catalog_prs = {}
for number in (1258, 1507):
    pr = gh_json(
        "pr", "view", str(number), "--json",
        "number,state,reviewDecision,latestReviews,statusCheckRollup,headRefOid,url",
    )
    catalog_prs[str(number)] = {
        "url": pr["url"],
        "state": pr["state"],
        "head": pr["headRefOid"],
        "reviewDecision": pr["reviewDecision"],
        "submittedReviews": len(pr["latestReviews"]),
        "checks": [
            {"name": check["name"], "status": check["status"], "conclusion": check["conclusion"]}
            for check in pr["statusCheckRollup"]
        ],
    }

report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "scope": "Open issue text and open PR descriptions plus all changed file paths",
    "selectedAssets": [f"{KIT}/{asset}" for asset in ASSETS],
    "openIssueCount": len(issues),
    "openPullRequestCount": len(pull_requests),
    "issueHits": issue_hits,
    "pullRequestHits": pull_request_hits,
    "catalogPullRequests": catalog_prs,
}
(ROOT / "verification" / "open-target-check.json").write_text(
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, indent=2))
if issue_hits or pull_request_hits:
    raise SystemExit(1)
