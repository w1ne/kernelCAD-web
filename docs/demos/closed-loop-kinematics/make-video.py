#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Build demo.mp4: captioned stills from local `kernelcad render --preset
# publish --pose 0,0` captures of posed frames of the four-bar example and
# the over-center latch cookbook. Not a screen recording.
#   python3 make-video.py <frames-dir>
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "demo.mp4"
W, H = 1280, 720
INK, GREY = "#1c2026", "#5b636e"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

FOUR_BAR = "Four-bar: crank 40, coupler 120, rocker 80, ground 100 mm. Only the crank is driven."
LATCH = "Over-center latch (slider-crank). Only the handle is driven; the latched side is pinned."
SLIDES = [
    (None, "Closed-loop kinematics", "One driven joint; the loop solver poses every other link.", 2.5),
    ("fourbar-000", FOUR_BAR, "crank = 0°", 1.3),
    ("fourbar-030", FOUR_BAR, "crank = 30°", 1.3),
    ("fourbar-060", FOUR_BAR, "crank = 60°", 1.3),
    ("fourbar-090", FOUR_BAR, "crank = 90°", 1.3),
    ("fourbar-120", FOUR_BAR, "crank = 120°", 1.3),
    ("fourbar-150", FOUR_BAR, "crank = 150°", 1.3),
    ("fourbar-165", FOUR_BAR, "crank = 165°", 1.3),
    ("fourbar-174", FOUR_BAR, "crank = 174°: first contact, the rocker (green) meets the stop (red).\nSwept collision and the closed form agree: 174°", 3.0),
    ("latch-0", LATCH, "handle = −20° (as modeled, latched)", 1.5),
    ("latch-1", LATCH, "handle = −12°", 1.3),
    ("latch-2", LATCH, "handle = −6°", 1.3),
    ("latch-3", LATCH, "handle = 0°", 1.3),
    ("latch-4", LATCH, "handle = 4°: last pose on the pinned (latched) side.\nAt 6° the sweep stops: kinematic.loop.branch-flip (closed form 4.41°)", 3.5),
]


def slide(frames: Path, name, top, bottom) -> Image.Image:
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    if name is None:
        d.text((W // 2, H // 2 - 40), top, font=ImageFont.truetype(BOLD, 52), fill=INK, anchor="mm")
        d.text((W // 2, H // 2 + 30), bottom, font=ImageFont.truetype(FONT, 28), fill=GREY, anchor="mm")
        d.text((W // 2, H - 40), "Local capture evidence from kernelcad render, not deployed behaviour.",
               font=ImageFont.truetype(FONT, 20), fill=GREY, anchor="mm")
        return img
    shot = Image.open(frames / f"{name}.pose-0-0.png").convert("RGB")
    shot.thumbnail((W, 530))
    img.paste(shot, ((W - shot.width) // 2, 60))
    d.text((W // 2, 36), top, font=ImageFont.truetype(FONT, 24), fill=GREY, anchor="mm")
    d.multiline_text((W // 2, H - 55), bottom, font=ImageFont.truetype(BOLD, 26), fill=INK, anchor="mm", align="center")
    return img


def main() -> None:
    frames = Path(sys.argv[1])
    with tempfile.TemporaryDirectory() as tmp:
        lines = []
        for i, (name, top, bottom, secs) in enumerate(SLIDES):
            p = Path(tmp) / f"s{i:02d}.png"
            slide(frames, name, top, bottom).save(p)
            lines += [f"file '{p}'", f"duration {secs}"]
        lines.append(f"file '{Path(tmp) / f's{len(SLIDES) - 1:02d}.png'}'")
        listing = Path(tmp) / "list.txt"
        listing.write_text("\n".join(lines) + "\n")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(listing),
                        "-vf", "fps=10,format=yuv420p", "-c:v", "libx264", "-crf", "28", "-preset", "slow",
                        "-movflags", "+faststart", str(OUT)], check=True)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
