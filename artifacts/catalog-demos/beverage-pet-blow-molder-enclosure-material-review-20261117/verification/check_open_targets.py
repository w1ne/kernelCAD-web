#!/usr/bin/env python3
"""Check the five preview-audit IDs against current open issues and PRs."""

from __future__ import annotations

import json
import subprocess

TARGETS = [
    "pet-blow-molder",
    "rotary-filler",
    "case-layer-palletizer",
    "bottle-rinser-carousel",
    "case-erector",
]


def gh_json(args: list[str]) -> list[dict[str, object]]:
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


checks = {}
for target in TARGETS:
    checks[target] = {
        "openIssues": gh_json([
            "issue", "list", "--state", "open", "--search", target,
            "--json", "number,title,url",
        ]),
        "openPullRequests": gh_json([
            "pr", "list", "--state", "open", "--search", target,
            "--json", "number,title,url",
        ]),
    }

changed_paths = subprocess.run(
    ["gh", "api", "--paginate", "repos/w1ne/kernelCAD-web/pulls/1507/files", "--jq", ".[].filename"],
    check=True,
    capture_output=True,
    text=True,
).stdout.splitlines()

checks["openCatalogPR1507SourcePathCheck"] = {
    target: f"catalog/kits/beverage-bottling-line/{target}.kcad.ts" in changed_paths
    for target in TARGETS
}
print(json.dumps(checks, indent=2, sort_keys=True))
