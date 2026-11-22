#!/usr/bin/env python3
"""Replay the retained transform from HEAD sources in a temporary kit copy."""

import importlib.util
import difflib
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
SOURCE = BUNDLE / "promote_alpine.py"
KIT = ROOT / "catalog/kits/alpine-expedition"


def main() -> None:
    spec = importlib.util.spec_from_file_location("promote_alpine", SOURCE)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load retained transform")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with tempfile.TemporaryDirectory(prefix="alpine-promotion-replay-") as directory:
        replay_kit = Path(directory) / "alpine-expedition"
        replay_kit.mkdir()
        baseline_paths = sorted(KIT.glob("*.kcad.ts"))
        for path in baseline_paths:
            data = subprocess.check_output(
                ["git", "show", f"HEAD:{path.relative_to(ROOT).as_posix()}"], cwd=ROOT
            )
            (replay_kit / path.name).write_bytes(data)
        module.KIT = replay_kit
        module.main()
        comparisons = []
        diffs = []
        for generated in sorted(replay_kit.glob("*.kcad.ts")):
            current = KIT / generated.name
            if generated.read_bytes() != current.read_bytes():
                diffs.extend(difflib.unified_diff(
                    current.read_text().splitlines(keepends=True),
                    generated.read_text().splitlines(keepends=True),
                    fromfile="committed/" + generated.name,
                    tofile="replayed/" + generated.name,
                ))
            comparisons.append({
                "id": generated.name.removesuffix(".kcad.ts"),
                "matchesCommittedSource": generated.read_bytes() == current.read_bytes(),
            })
    issues = [entry["id"] for entry in comparisons if not entry["matchesCommittedSource"]]
    result = {
        "status": "passed" if len(comparisons) == 50 and not issues else "failed",
        "sourceBase": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "assetsReplayed": len(comparisons),
        "generatedSourcesMatch": len(comparisons) - len(issues),
        "issues": issues,
    }
    if diffs:
        (BUNDLE / "source-replay-diffs.patch").write_text("".join(diffs))
    (BUNDLE / "source-replay-audit.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if issues or len(comparisons) != 50:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
