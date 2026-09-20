#!/usr/bin/env python3
"""Score one kernelCAD sample with MUSE's own alignment judge.

Calls MUSE's published functions directly (`_run_alignment_judge`,
`_load_score_system_prompt`) with MUSE's judge model and temperature.
Writes the parsed result to --out as JSON.

Exit code is always 0; transport errors are reported as {"error": ...}.
"""
import argparse
import json
import os
import sys
from pathlib import Path

CATEGORY_KEYS = {
    "assembly readiness": "assembly_readiness",
    "joint design": "joint_design",
    "tolerance": "tolerance",
    "functional adaptation": "functional_adaptation",
    "usage stability": "usage_stability",
    "manufacturability": "manufacturability",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--muse-root", required=True)
    parser.add_argument("--case-name", required=True)
    parser.add_argument("--case-dir", required=True)
    parser.add_argument("--candidate-png", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--model", default="google/gemini-3.1-pro")
    parser.add_argument("--base-url", default="https://api.deepinfra.com/v1/openai")
    parser.add_argument("--api-key-env", default="DEEPINFRA_API_KEY")
    parser.add_argument("--timeout", type=int, default=180)
    args = parser.parse_args()

    api_key = os.environ.get(args.api_key_env)
    if not api_key:
        print(json.dumps({"error": f"missing env {args.api_key_env}"}))
        return 0

    muse_root = Path(args.muse_root).resolve()
    sys.path.insert(0, str(muse_root / "src"))
    try:
        from judge_system.reverse_pipeline import (  # type: ignore
            _load_score_system_prompt,
            _run_alignment_judge,
        )
    except Exception as exc:  # pragma: no cover - env misconfiguration
        print(json.dumps({"error": f"cannot import MUSE judge from {muse_root}: {exc}"}))
        return 0

    case_dir = Path(args.case_dir).resolve()
    render_only = set()
    render_list = muse_root / "src" / "judge_system" / "render_only_cases.txt"
    if render_list.exists():
        for line in render_list.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                render_only.add(line)
    if args.case_name in render_only:
        reference = case_dir / f"{args.case_name}_stp_render.png"
    else:
        reference = case_dir / f"{args.case_name}.png"

    candidate = Path(args.candidate_png).resolve()
    if not candidate.exists():
        print(json.dumps({"error": f"candidate render missing: {candidate}"}))
        return 0
    if not reference.exists():
        print(json.dumps({"error": f"reference image missing: {reference}"}))
        return 0

    try:
        payload = _run_alignment_judge(
            api_key=api_key,
            base_url=args.base_url,
            model=args.model,
            timeout_seconds=args.timeout,
            system_prompt=_load_score_system_prompt(),
            task_text=(case_dir / "design_description.md").read_text(encoding="utf-8"),
            rubric_text=(case_dir / "evaluation_rubric.md").read_text(encoding="utf-8"),
            candidate_svg_png=candidate,
            reference_png=reference,
        )
    except Exception as exc:
        print(json.dumps({"error": f"judge call failed: {exc}"}))
        return 0

    categories = {}
    for item in payload.get("items", []):
        key = CATEGORY_KEYS.get(str(item.get("category_en", "")).strip().lower())
        if key:
            try:
                categories[key] = 1.0 if float(item.get("score", 0) or 0) >= 0.5 else 0.0
            except (TypeError, ValueError):
                categories[key] = 0.0

    overall = payload.get("overall_score_normalized")
    if overall is None:
        overall = payload.get("overall_score")
    try:
        overall_value = float(overall or 0.0)
        if overall_value > 1:
            overall_value = overall_value / 100.0
    except (TypeError, ValueError):
        overall_value = 0.0

    out = {
        "overall": overall_value,
        "categories": categories,
        "summary": str(payload.get("overall_summary", "") or ""),
        "items": payload.get("items", []),
        "judge_model": args.model,
        "judge_base_url": args.base_url,
        "candidate_png": str(candidate),
        "reference_png": str(reference),
    }
    Path(args.out).write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
