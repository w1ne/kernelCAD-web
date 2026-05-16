#!/usr/bin/env python3
"""CLI wrapper around cadqueryeval's geometry scorer.

Reads a reference STL + a generated STL, runs the cadqueryeval geometry
checks (watertight, single-component, bbox, volume, chamfer, hausdorff)
via `perform_geometry_checks`, and prints the dataclass result as JSON to
stdout.

Exit code is always 0 — the JSON tells the caller pass/fail. Crashes in
the scorer itself are caught and reported as a structured error in JSON
so a downstream Node harness never mistakes a scorer fault for a process
crash.

Invocation:
    python cadqueryevalScorerWrapper.py \\
        --reference /path/to/reference.stl \\
        --generated /path/to/generated.stl \\
        [--expected-bbox L,W,H] \\
        [--expected-components N] \\
        [--cad-prompt-mode]

Note: `--expected-bbox` is accepted for forward compatibility but is
currently a no-op — cadqueryeval's `perform_geometry_checks` derives the
reference bbox from the reference STL itself and uses a tolerance-based
check (DEFAULT_BBOX_TOLERANCE_MM). The value is echoed back under
`expected_bbox_ignored` so callers know it wasn't used.

CADPrompt mode (`--cad-prompt-mode`):
  The CADPrompt corpus ships DeepCAD-normalised geometry (most bboxes
  are sub-unity in spite of the `_mm` field-name suffix in the source).
  cadqueryeval's defaults (1 mm chamfer / hausdorff thresholds, 1 mm
  bbox tolerance) are inappropriate at that scale, so in this mode we
  re-evaluate chamfer, hausdorff and bbox with thresholds derived from
  the reference STL's bbox diagonal:

      chamfer threshold   = 0.05 * bbox_diagonal
      hausdorff threshold = 0.05 * bbox_diagonal
      bbox tolerance      = 0.05 * bbox_diagonal (per axis)

  Volume check stays at the cadqueryeval default (±2% of reference
  volume) — already a relative metric.

  We also compute an extra `iogt` (Intersection-over-Ground-Truth) bbox
  overlap, defined per the CADPrompt paper as
      iogt = vol(intersection(gen_bbox, ref_bbox)) / vol(ref_bbox).
  It's surfaced in the JSON payload but not gated yet.
"""

import argparse
import dataclasses
import json
import sys
import traceback
from typing import Any


class _NumpySafeEncoder(json.JSONEncoder):
    """JSON encoder that coerces numpy scalars (bool_, int64, float64) to
    plain Python types. cadqueryeval's geometry checks pull values out of
    numpy arrays (e.g. `all(d <= tol for d in diffs)` over an np.array
    returns numpy.bool_), which the stdlib json encoder rejects.
    """

    def default(self, o: Any) -> Any:  # noqa: D401 — match json.JSONEncoder
        # Use duck-typing rather than `import numpy` to avoid coupling
        # this CLI's import path to numpy at module-load time.
        if hasattr(o, 'item') and callable(o.item):
            try:
                return o.item()
            except Exception:  # noqa: BLE001
                pass
        return super().default(o)

# cadqueryeval is installed in the uv env, but in case this script is
# invoked outside `uv run` we also add its src dir to sys.path.
sys.path.insert(0, '/home/andrii/projects/cadqueryeval/src')


def _parse_bbox(raw: str) -> list[float]:
    parts = [p.strip() for p in raw.split(',')]
    if len(parts) != 3:
        raise argparse.ArgumentTypeError(
            f'expected-bbox must be L,W,H (3 comma-separated numbers); got {raw!r}'
        )
    try:
        return [float(p) for p in parts]
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f'expected-bbox values must be numeric; got {raw!r}'
        ) from exc


def _mesh_axis_aligned_bbox(stl_path: str) -> tuple[list[float], list[float]]:
    """Return ([min_x,min_y,min_z], [max_x,max_y,max_z]) for an STL mesh.

    Uses trimesh (same dependency cadqueryeval already loads) and is safe to
    call on empty meshes (returns six NaNs in that case).
    """
    import trimesh  # type: ignore[import-not-found]

    mesh = trimesh.load(stl_path, force='mesh')
    if mesh.is_empty:
        nan = float('nan')
        return [nan, nan, nan], [nan, nan, nan]
    bmin, bmax = mesh.bounds  # type: ignore[attr-defined]
    return [float(bmin[0]), float(bmin[1]), float(bmin[2])], [
        float(bmax[0]),
        float(bmax[1]),
        float(bmax[2]),
    ]


def _bbox_diagonal(bmin: list[float], bmax: list[float]) -> float:
    dx = bmax[0] - bmin[0]
    dy = bmax[1] - bmin[1]
    dz = bmax[2] - bmin[2]
    return (dx * dx + dy * dy + dz * dz) ** 0.5


def _iogt(
    gen_min: list[float],
    gen_max: list[float],
    ref_min: list[float],
    ref_max: list[float],
) -> float | None:
    """Intersection-over-Ground-Truth: vol(gen ∩ ref) / vol(ref).

    Returns None if the reference bbox has zero volume (degenerate) or any
    of the bounds are non-finite.
    """
    for v in (*gen_min, *gen_max, *ref_min, *ref_max):
        if v != v or v in (float('inf'), float('-inf')):
            return None
    ref_vol = max(0.0, ref_max[0] - ref_min[0]) * max(0.0, ref_max[1] - ref_min[1]) * max(
        0.0, ref_max[2] - ref_min[2]
    )
    if ref_vol <= 0.0:
        return None
    ix0 = max(gen_min[0], ref_min[0])
    iy0 = max(gen_min[1], ref_min[1])
    iz0 = max(gen_min[2], ref_min[2])
    ix1 = min(gen_max[0], ref_max[0])
    iy1 = min(gen_max[1], ref_max[1])
    iz1 = min(gen_max[2], ref_max[2])
    inter = max(0.0, ix1 - ix0) * max(0.0, iy1 - iy0) * max(0.0, iz1 - iz0)
    return inter / ref_vol


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Run cadqueryeval geometry scorer on a generated STL vs reference STL.'
    )
    parser.add_argument('--reference', required=True, help='Path to reference STL')
    parser.add_argument('--generated', required=True, help='Path to generated STL')
    parser.add_argument(
        '--expected-bbox',
        type=_parse_bbox,
        default=None,
        help='Expected bounding box "L,W,H" (currently ignored; bbox is checked against reference).',
    )
    parser.add_argument(
        '--expected-components',
        type=int,
        default=1,
        help='Expected number of connected components (default 1).',
    )
    parser.add_argument(
        '--cad-prompt-mode',
        action='store_true',
        help=(
            'Use relative thresholds (5%% of reference bbox diagonal) for '
            'chamfer / hausdorff / per-axis bbox. Volume threshold stays at '
            'the cadqueryeval default (2%% of reference). Also emits IoGT.'
        ),
    )
    args = parser.parse_args()

    try:
        from cadqueryeval.geometry import perform_geometry_checks

        kwargs: dict[str, Any] = {
            'generated_path': args.generated,
            'reference_path': args.reference,
            'expected_components': args.expected_components,
        }

        ref_min, ref_max = _mesh_axis_aligned_bbox(args.reference)
        ref_diag = _bbox_diagonal(ref_min, ref_max)

        cad_prompt_payload: dict[str, Any] = {}
        if args.cad_prompt_mode:
            # 5 % of bbox diagonal — matches the CADPrompt paper conventions
            # and works across the dataset's huge dynamic range (sub-unity to
            # multi-unit bboxes).
            if ref_diag > 0 and ref_diag == ref_diag:  # finite and positive
                rel = 0.05 * ref_diag
                kwargs['chamfer_threshold'] = rel
                kwargs['hausdorff_threshold'] = rel
                kwargs['bbox_tolerance'] = rel
                cad_prompt_payload['cad_prompt_mode'] = True
                cad_prompt_payload['reference_bbox_diagonal'] = ref_diag
                cad_prompt_payload['relative_threshold'] = rel
            else:
                cad_prompt_payload['cad_prompt_mode'] = True
                cad_prompt_payload['reference_bbox_diagonal'] = None
                cad_prompt_payload['relative_threshold'] = None

        result = perform_geometry_checks(**kwargs)

        payload = dataclasses.asdict(result)
        payload['all_passed'] = result.all_passed
        if args.expected_bbox is not None:
            payload['expected_bbox_ignored'] = args.expected_bbox

        # Compute IoGT (intersection-over-ground-truth bbox overlap). Always
        # emitted (in both modes) — cheap to compute and useful for the
        # CADPrompt leaderboard. None if the generated STL is missing.
        try:
            gen_min, gen_max = _mesh_axis_aligned_bbox(args.generated)
            payload['iogt'] = _iogt(gen_min, gen_max, ref_min, ref_max)
            payload['reference_bbox_min'] = ref_min
            payload['reference_bbox_max'] = ref_max
            payload['generated_bbox_min'] = gen_min
            payload['generated_bbox_max'] = gen_max
        except Exception as bbox_exc:  # noqa: BLE001
            payload['iogt'] = None
            payload['iogt_error'] = f'{type(bbox_exc).__name__}: {bbox_exc}'

        payload.update(cad_prompt_payload)

        print(json.dumps(payload, cls=_NumpySafeEncoder))
        return 0

    except Exception as exc:  # noqa: BLE001 — surface anything as structured JSON
        err_payload = {
            'is_watertight': None,
            'is_single_component': None,
            'bbox_accurate': None,
            'volume_passed': None,
            'chamfer_passed': None,
            'hausdorff_passed': None,
            'chamfer_distance': None,
            'hausdorff_95p': None,
            'hausdorff_99p': None,
            'icp_fitness': None,
            'volume_ratio': None,
            'reference_volume': None,
            'generated_volume': None,
            'iogt': None,
            'errors': [
                f'scorer-wrapper exception: {type(exc).__name__}: {exc}',
                traceback.format_exc(),
            ],
            'all_passed': False,
        }
        print(json.dumps(err_payload))
        return 0


if __name__ == '__main__':
    sys.exit(main())
