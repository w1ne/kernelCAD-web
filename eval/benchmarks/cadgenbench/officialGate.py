# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
# eval/benchmarks/cadgenbench/officialGate.py
#
# Batch wrapper around the benchmark's own validity gate
# (cadgenbench.common.validity.analyze_step, the same call its
# sanity_check_submission.py makes). One Python process checks every
# candidate, so the heavy import cost is paid once.
#
# Usage: <python with the cadgenbench package> officialGate.py a.step b.step ...
# Prints one JSON object per input line:
#   {"path", "valid", "watertight", "errors", "solids", "faces"}
import json
import sys


def main() -> int:
    from cadgenbench.common.validity import analyze_step

    for path in sys.argv[1:]:
        try:
            result = analyze_step(path)
            val = result.validation
            m = result.measurements
            row = {
                "path": path,
                "valid": bool(val.is_valid),
                "watertight": bool(val.is_watertight),
                "errors": list(val.topology_errors)[:10],
                "solids": m.solid_count,
                "faces": m.face_count,
            }
        except Exception as exc:  # a load failure is an invalid candidate
            row = {"path": path, "valid": False, "watertight": False,
                   "errors": [f"STEP load failed: {exc}"], "solids": 0, "faces": 0}
        print(json.dumps(row), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
