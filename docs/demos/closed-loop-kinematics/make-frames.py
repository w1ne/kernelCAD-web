#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Write one posed .kcad.ts per demo frame into <out-dir>: the model part of
# examples/kinematic/four-bar-swept.kcad.ts (crank driven) and of the
# kernelcad-kinematic cookbook 06 over-center latch (handle driven, latched
# side pinned with loopMode). Parts get display colours and a pale backboard
# so every frame auto-frames the same. Run from the repository root:
#   python3 docs/demos/closed-loop-kinematics/make-frames.py <out-dir>
import re
import sys
from pathlib import Path

COLOURS = {
    "ground": "#8a929c", "crank": "#e07b2a", "coupler": "#2b6cb0", "rocker": "#2f9e5a", "stop": "#c53030",
    "housing": "#8a929c", "handle": "#e07b2a", "link": "#2b6cb0", "keeper": "#2f9e5a",
}
FOUR_BAR_CRANK = [0, 30, 60, 90, 120, 150, 165, 174]
LATCH_HANDLE = [-20, -12, -6, 0, 4]


def colour(src: str) -> str:
    for name, c in COLOURS.items():
        src = re.sub(r"(arm\.part\('%s', box\([^;]*?)\)\);" % name, lambda m: m.group(1) + f").color('{c}'));", src, count=1)
    return src


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    fb = Path("examples/kinematic/four-bar-swept.kcad.ts").read_text()
    four_bar = colour(fb[fb.index("const a = 40;"):fb.index("// Sweep the crank alone")])
    four_bar += "arm.part('board', box(280, 2, 190, true).translate(65, 60, 50).color('#eef1f5'));\n"
    for t in FOUR_BAR_CRANK:
        (out / f"fourbar-{t:03d}.kcad.ts").write_text(four_bar + f"return arm.solvedModel({{ crank: {t} }}, {{ validate: 'off' }});\n")
    lt = Path("src/agent/skills/kernelcad-kinematic/cookbook/06-over-center-latch-reachable.kcad.ts").read_text()
    latch = colour(lt[lt.index("const r = 30;"):lt.index("// 1. Reach:")])
    latch += (
        "const u = B0;\nconst w = [keeperX(handle0) - B0[0], e - B0[1]];\n"
        "arm.loopMode('latch', { joint: 'link', sign: u[0] * w[1] - u[1] * w[0] > 0 ? '+' : '-' });\n"
        "arm.part('board', box(200, 2, 120, true).translate(60, 50, 10).color('#eef1f5'));\n"
    )
    for i, t in enumerate(LATCH_HANDLE):
        (out / f"latch-{i}.kcad.ts").write_text(latch + f"return arm.solvedModel({{ handle: {t} }}, {{ validate: 'off' }});\n")


if __name__ == "__main__":
    main()
