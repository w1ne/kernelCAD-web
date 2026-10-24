#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Write one posed .kcad.ts per demo frame into <out-dir>: the model section
# of examples/kinematic/four-bar-swept.kcad.ts (crank driven, 0° to the first
# contact) and of the kernelcad-kinematic cookbook 06 over-center latch
# (handle driven from −20° to 4°, latched side pinned with loopMode). Parts
# get display colours; on the contact frame the contacting pair (rocker and
# stop) is drawn red. A pale backboard behind the mechanism keeps the
# auto-framing identical across frames. Run from the repository root:
#   python3 docs/demos/closed-loop-kinematics/make-frames.py <out-dir>
import sys
from pathlib import Path

CONTACT_DEG = 164  # first contact reported by the example's swept-collision check (and its closed form)
FOUR_BAR_CRANK = list(range(0, CONTACT_DEG, 4)) + [CONTACT_DEG]
LATCH_HANDLE = list(range(-20, 5, 1))
FOUR_BAR_COLOURS = {"ground": "#8a929c", "crank": "#e07b2a", "coupler": "#2b6cb0", "rocker": "#2f9e5a", "stop": "#4a5568"}
CONTACT_COLOURS = {**FOUR_BAR_COLOURS, "rocker": "#e53e3e", "stop": "#e53e3e"}
LATCH_COLOURS = {"housing": "#8a929c", "handle": "#e07b2a", "link": "#2b6cb0", "keeper": "#2f9e5a"}


def colour(src: str, colours: dict) -> str:
    """Append .color(c) to the shape argument of each arm.part('name', shape)."""
    for name, c in colours.items():
        key = f"'{name}',"
        i = src.index("arm.part(", src.index(key) - 40)
        depth, j = 0, i + len("arm.part")
        while True:
            ch = src[j]
            depth += ch == "("
            depth -= ch == ")"
            if depth == 0:
                break
            j += 1
        inner = src[i + len("arm.part("):j].rstrip().rstrip(",")
        src = src[:i] + f"arm.part({inner}.color('{c}'))" + src[j + 1:]
    return src


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    fb = Path("examples/kinematic/four-bar-swept.kcad.ts").read_text()
    model = fb[fb.index("const a = 40;"):fb.index("// Sweep the crank alone")]
    board = "arm.part('board', box(220, 2, 160, true).translate(50, 60, 15).color('#eef1f5'));\n"
    for t in FOUR_BAR_CRANK:
        colours = CONTACT_COLOURS if t == CONTACT_DEG else FOUR_BAR_COLOURS
        (out / f"fourbar-{t:03d}.kcad.ts").write_text(
            colour(model, colours) + board + f"return arm.solvedModel({{ crank: {t} }}, {{ validate: 'off' }});\n")
    lt = Path("src/agent/skills/kernelcad-kinematic/cookbook/06-over-center-latch-reachable.kcad.ts").read_text()
    latch = colour(lt[lt.index("const r = 30;"):lt.index("// 1. Reach:")], LATCH_COLOURS)
    latch += (
        "const u = B0;\nconst w = [keeperX(handle0) - B0[0], e - B0[1]];\n"
        "arm.loopMode('latch', { joint: 'link', sign: u[0] * w[1] - u[1] * w[0] > 0 ? '+' : '-' });\n"
        "arm.part('board', box(200, 2, 120, true).translate(60, 50, 10).color('#eef1f5'));\n"
    )
    for t in LATCH_HANDLE:
        (out / f"latch-{t + 20:02d}.kcad.ts").write_text(latch + f"return arm.solvedModel({{ handle: {t} }}, {{ validate: 'off' }});\n")


if __name__ == "__main__":
    main()
