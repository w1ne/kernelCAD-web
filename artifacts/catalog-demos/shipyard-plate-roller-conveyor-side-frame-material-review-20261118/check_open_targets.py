#!/usr/bin/env python3
"""Check current open GitHub issues and PRs for selected asset overlap."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPO = "w1ne/kernelCAD-web"
ASSETS = [
    "coating-mix-cabinet",
    "optical-measurement-station",
    "pipe-spool-saddle-stand",
    "plate-roller-conveyor",
    "temporary-work-light-mast",
]


def gh_json(*args: str) -> object:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def gh_lines(*args: str) -> list[str]:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return [line for line in result.stdout.splitlines() if line]


def matches(text: str) -> list[str]:
    return [asset for asset in ASSETS if asset in text]


def api_objects(endpoint: str) -> list[dict[str, object]]:
    lines = gh_lines("api", "--paginate", endpoint, "--jq", ".[] | @json")
    return [json.loads(line) for line in lines]


def main() -> None:
    issues = gh_json("issue", "list", "-R", REPO, "--state", "open", "--limit", "100", "--json", "number,title,body,url")
    prs = gh_json("pr", "list", "-R", REPO, "--state", "open", "--limit", "100", "--json", "number,title,body,headRefName,url")
    assert isinstance(issues, list) and isinstance(prs, list)

    issue_matches = []
    for issue in issues:
        assert isinstance(issue, dict)
        number = int(issue["number"])
        blobs = [str(issue.get("title", "")), str(issue.get("body", ""))]
        blobs.extend(str(c.get("body", "")) for c in api_objects(f"repos/{REPO}/issues/{number}/comments?per_page=100"))
        found = sorted(set(asset for blob in blobs for asset in matches(blob)))
        if found:
            issue_matches.append({"number": number, "url": issue["url"], "assets": found})

    pr_matches = []
    changed_paths: dict[str, list[str]] = {}
    for pr in prs:
        assert isinstance(pr, dict)
        number = int(pr["number"])
        paths: list[str]
        if number == 1507:
            # GitHub's pull-files endpoint is capped at 300 entries. This ref
            # is the PR head, verified by matching headRefOid to origin below.
            head_sha_lines = gh_lines("api", "repos/w1ne/kernelCAD-web/pulls/1507", "--jq", ".head.sha")
            head_sha = head_sha_lines[0] if head_sha_lines else ""
            local_sha_result = subprocess.run(
                ["git", "rev-parse", "origin/feat/catalog-2000"],
                check=True,
                capture_output=True,
                text=True,
            )
            local_sha = local_sha_result.stdout.strip()
            if head_sha != local_sha:
                raise RuntimeError(f"PR #1507 head mismatch: API {head_sha} vs origin {local_sha}")
            local_result = subprocess.run(
                ["git", "diff", "--name-only", "origin/develop...origin/feat/catalog-2000"],
                check=True,
                capture_output=True,
                text=True,
            )
            paths = [line for line in local_result.stdout.splitlines() if line]
        else:
            paths = [str(row["filename"]) for row in api_objects(f"repos/{REPO}/pulls/{number}/files?per_page=100")]
        changed_paths[str(number)] = paths
        blobs = [str(pr.get("title", "")), str(pr.get("body", "")), *paths]
        blobs.extend(str(c.get("body", "")) for c in api_objects(f"repos/{REPO}/issues/{number}/comments?per_page=100"))
        blobs.extend(str(c.get("body", "")) for c in api_objects(f"repos/{REPO}/pulls/{number}/comments?per_page=100"))
        blobs.extend(str(c.get("body", "")) for c in api_objects(f"repos/{REPO}/pulls/{number}/reviews?per_page=100"))
        found = sorted(set(asset for blob in blobs for asset in matches(blob)))
        if found:
            pr_matches.append({"number": number, "url": pr["url"], "assets": found})

    result = {
        "checkedAt": "2026-11-18",
        "assets": ASSETS,
        "openIssueCount": len(issues),
        "openIssues": [{"number": i["number"], "title": i["title"], "url": i["url"]} for i in issues],
        "openPrCount": len(prs),
        "openPrs": [{"number": p["number"], "title": p["title"], "headRefName": p["headRefName"], "url": p["url"]} for p in prs],
        "issueMatches": issue_matches,
        "prMatches": pr_matches,
        "changedFileCountByOpenPr": {key: len(paths) for key, paths in changed_paths.items()},
        "result": "no exact selected asset ID in open issue or PR titles, bodies, comments, reviews, or changed file paths" if not issue_matches and not pr_matches else "overlap found",
    }
    (ROOT / "verification/open-target-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
