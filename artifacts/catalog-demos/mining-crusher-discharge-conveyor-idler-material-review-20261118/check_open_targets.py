#!/usr/bin/env python3
"""Check all open kernelCAD-web issues, PR text and changed asset paths."""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = "w1ne/kernelCAD-web"
KIT = "mining"
ASSETS = [
    "belt-magnet-separator",
    "crusher-discharge-conveyor",
    "flotation-cell-bank",
    "mine-sump-pump",
    "radial-stacker",
]


def gh_json(*args: str) -> object:
    return json.loads(subprocess.check_output(["gh", *args], text=True))


def mentions(text: str, asset_id: str) -> bool:
    return re.search(rf"(?<![a-z0-9-]){re.escape(asset_id)}(?![a-z0-9-])", text.lower()) is not None


def main() -> None:
    issues = gh_json("issue", "list", "-R", REPO, "--state", "open", "--limit", "100", "--json", "number,title,body")
    prs = gh_json("pr", "list", "-R", REPO, "--state", "open", "--limit", "100", "--json", "number,title,body")
    assert isinstance(issues, list) and isinstance(prs, list)
    target_paths: dict[int, list[str]] = {}
    pr_rows: list[dict[str, object]] = []
    for pr in prs:
        number = int(pr["number"])
        paths_text = subprocess.check_output([
            "gh", "api", "--paginate", f"repos/{REPO}/pulls/{number}/files",
            "--jq", ".[].filename",
        ], text=True)
        paths = [line.strip() for line in paths_text.splitlines() if line.strip()]
        target_paths[number] = paths
        pr_rows.append({
            "number": number,
            "title": pr["title"],
            "assetSourcePaths": [path for path in paths if path.startswith("catalog/kits/") and path.endswith(".kcad.ts")],
        })

    per_asset: dict[str, dict[str, object]] = {}
    for asset_id in ASSETS:
        source = f"catalog/kits/{KIT}/{asset_id}.kcad.ts"
        preview = f"catalog/kits/{KIT}/previews/{asset_id}.png"
        issue_mentions = [
            {"number": issue["number"], "title": issue["title"]}
            for issue in issues
            if mentions(issue.get("title", "") + "\n" + issue.get("body", ""), asset_id)
        ]
        pr_mentions = []
        for pr in prs:
            number = int(pr["number"])
            changed = target_paths[number]
            text = pr.get("title", "") + "\n" + pr.get("body", "")
            if mentions(text, asset_id) or source in changed or preview in changed:
                pr_mentions.append({"number": number, "title": pr["title"], "matchingPaths": [p for p in changed if p in (source, preview)]})
        per_asset[asset_id] = {"issueMentions": issue_mentions, "pullRequestMentionsOrPaths": pr_mentions}

    clean = all(not row["issueMentions"] and not row["pullRequestMentionsOrPaths"] for row in per_asset.values())
    result = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "repository": REPO,
        "selectedAssets": [f"{KIT}/{asset_id}" for asset_id in ASSETS],
        "openPullRequests": pr_rows,
        "openIssuesScanned": len(issues),
        "openPullRequestsScanned": len(prs),
        "perAsset": per_asset,
        "result": "no selected asset is mentioned or source/preview-path-targeted by an open issue or PR" if clean else "overlap found; do not edit overlapping asset",
    }
    out = ROOT / "verification/open-target-check.json"
    out.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if not clean:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
