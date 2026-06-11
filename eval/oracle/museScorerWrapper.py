#!/usr/bin/env python3
"""CLI wrapper around the MUSE benchmark's own scoring stages.

Takes a kernelCAD-exported STEP file and pushes it through the MUSE
text-to-CAD funnel using MUSE's published code and thresholds — nothing
is reimplemented here:

  Stage 1 (code execution)  -> judge_system.sandbox.execute_in_sandbox
  Stage 2 (OCCT validity)   -> judge_system.geometry_metrics.evaluate_geometry
                               (requires MUSE's external `validator` module;
                               reported as unavailable when absent)
  Stage 2 (component overlap) -> judge_system.geometry_metrics.evaluate_interpenetration
  Render (Stage 3 artifact) -> judge_system.drawings.render_3d_preview

Geometry submission model: MUSE's funnel is driven by a CadQuery script.
kernelCAD submits geometry, so this wrapper writes a minimal CadQuery
shim (`code.py`) that imports the exported STEP and binds it to the
`result` global MUSE expects. The shim is then executed/validated/
rendered by MUSE's own functions exactly as any candidate script would
be. If the STEP export failed upstream, the shim raises inside MUSE's
sandbox and the sample counts as a Stage 1 failure — no silent drops.

Exit code is always 0 — the JSON on stdout tells the caller pass/fail.

Invocation:
    python museScorerWrapper.py \
        --muse-root /path/to/muse \
        --step /path/to/sample.step \
        --workdir /path/to/output \
        --name <case_label>
"""

import argparse
import dataclasses
import json
import sys
from pathlib import Path


SHIM_TEMPLATE = """import cadquery as cq

# kernelCAD geometry submission: the solids were produced by a kernelCAD
# `.kcad.ts` script and exported to STEP. Importing them here lets the
# benchmark's standard funnel (sandbox -> geometry checks -> rendering ->
# VLM judge) run unmodified on the submitted geometry.
result = cq.importers.importStep(r"{step_path}")
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--muse-root", required=True, help="Path to the MUSE benchmark checkout")
    parser.add_argument("--step", required=True, help="kernelCAD-exported STEP file to score")
    parser.add_argument("--workdir", required=True, help="Directory for code.py + render artifacts")
    parser.add_argument("--name", default="sample", help="Artifact base name")
    parser.add_argument("--timeout", type=int, default=120, help="Per-stage timeout (seconds)")
    args = parser.parse_args()

    muse_root = Path(args.muse_root).resolve()
    sys.path.insert(0, str(muse_root / "src"))
    try:
        from judge_system.sandbox import execute_in_sandbox
        from judge_system.geometry_metrics import evaluate_geometry, evaluate_interpenetration
        from judge_system.drawings import render_3d_preview
    except Exception as exc:  # pragma: no cover — env misconfiguration
        print(json.dumps({"infra_error": f"cannot import MUSE judge_system from {muse_root}: {exc}"}))
        return 0

    workdir = Path(args.workdir).resolve()
    workdir.mkdir(parents=True, exist_ok=True)
    step_path = Path(args.step).resolve()
    python_executable = Path(sys.executable)

    code = SHIM_TEMPLATE.format(step_path=str(step_path))
    code_path = workdir / "code.py"
    code_path.write_text(code, encoding="utf-8")

    out = {
        "shim_code_path": str(code_path),
        "step_path": str(step_path),
        "step_exists": step_path.exists(),
    }

    # Stage 1 — MUSE sandbox execution.
    sandbox = execute_in_sandbox(code, args.timeout, python_executable)
    out["sandbox_ok"] = sandbox.ok
    out["sandbox_error"] = sandbox.error
    out["result_solid_count"] = sandbox.solid_count
    out["bbox"] = sandbox.bbox

    # Stage 2 — MUSE OCCT validity (external `validator` module).
    validator_root = muse_root / "external" / "validator"
    import os

    env_validator = os.environ.get("MUSE_VALIDATOR_ROOT")
    if env_validator:
        validator_root = Path(env_validator)
    validator_present = any(
        (candidate / probe).exists()
        for candidate in (validator_root, validator_root / "validator")
        for probe in ("validator.py", "__init__.py")
    )
    out["validator_available"] = validator_present
    if validator_present and sandbox.ok:
        geometry = evaluate_geometry(code, validator_root, python_executable, args.timeout)
        out["geometry"] = dataclasses.asdict(geometry)
    elif not validator_present:
        out["geometry"] = None
        out["geometry_note"] = (
            "MUSE's external `validator` module (OCCT watertight/manifold/self-intersection "
            "checks) is not published in the benchmark repo; stage not scored."
        )
    else:
        out["geometry"] = None
        out["geometry_note"] = "sandbox failed; geometry stage not reached"

    # Stage 2 — MUSE component-overlap (interpenetration) check on the STEP.
    if sandbox.ok and step_path.exists():
        out["interpenetration"] = evaluate_interpenetration(step_path, python_executable, args.timeout)
    else:
        out["interpenetration"] = None

    # Stage 3 artifact — MUSE's VTK 3D render of the candidate (also re-exports
    # STL/STEP through MUSE's own template, like every candidate sample).
    if sandbox.ok:
        rendered = render_3d_preview(code_path, workdir / "render", args.name, python_executable, args.timeout)
        out["render_ok"] = rendered.ok
        out["render_png_path"] = str(rendered.png_path) if rendered.png_path else ""
        out["render_mesh_path"] = str(rendered.mesh_path) if rendered.mesh_path else ""
        out["render_step_path"] = str(rendered.step_path) if rendered.step_path else ""
        out["render_error"] = rendered.error
    else:
        out["render_ok"] = False
        out["render_png_path"] = ""
        out["render_mesh_path"] = ""
        out["render_step_path"] = ""
        out["render_error"] = "sandbox failed; render not attempted"

    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
