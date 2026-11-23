#!/usr/bin/env python3
"""Check sampled catalog IDs against captured open issues and PRs."""

import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
IDS = [
    "belt-conveyor",
    "cartridge-filter-housing",
    "gantry-crane",
    "process-water-silo",
    "shell-and-tube-exchanger",
]

issues = json.loads((ROOT / "open-issues-before.json").read_text())
prs = json.loads((ROOT / "open-prs-before.json").read_text())
changed_paths = (ROOT / "open-pr-catalog-targets.txt").read_text().splitlines()

issue_hits = []
for issue in issues:
    text = f"{issue.get('title', '')}\n{issue.get('body', '')}".lower()
    matched = [asset_id for asset_id in IDS if asset_id in text]
    if matched:
        issue_hits.append({"number": issue["number"], "matchedIds": matched})

pr_hits = []
for pr in prs:
    text = f"{pr.get('title', '')}\n{pr.get('body', '')}".lower()
    matched = [asset_id for asset_id in IDS if asset_id in text]
    if matched:
        pr_hits.append({"number": pr["number"], "matchedIds": matched, "match": "title/body"})

for line in changed_paths:
    matched = [asset_id for asset_id in IDS if asset_id in line]
    if matched:
        pr_hits.append({"path": line, "matchedIds": matched, "match": "changed catalog path"})

result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "sampledIds": IDS,
    "openIssueCount": len(issues),
    "openPullRequestCount": len(prs),
    "openCatalogPathCount": len(changed_paths),
    "issueHits": issue_hits,
    "pullRequestHits": pr_hits,
    "result": "clear" if not issue_hits and not pr_hits else "overlap",
}
(ROOT / "open-target-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if result["result"] != "clear":
    raise SystemExit(1)
