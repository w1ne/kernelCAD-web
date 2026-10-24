#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Build demo.mp4 (12 fps) from local `kernelcad render --preset publish
# --pose 30,20` captures of the frame scripts written by make-frames.py:
# the four-bar crank sweep from 0° to the first contact, then the latch
# handle sweep from −20° to 4°, each pose shown for two video frames, with a
# hold on the contact and on the last pose before the branch flip.
#   python3 make-video.py <frames-dir>
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "demo.mp4"
W, H, FPS = 1280, 720, 12
PER_POSE, HOLD, TITLE = 2, 24, 24  # video frames
INK, GREY = "#1c2026", "#5b636e"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
POSE = "pose-30-20"

FOUR_BAR = "Four-bar: crank 40, coupler 120, rocker 80, ground 100 mm. Only the crank (orange) is driven."
LATCH = "Over-center latch (slider-crank). Only the handle (orange) is driven; the latched side is pinned."


def card(top: str, sub: str) -> Image.Image:
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    d.text((W // 2, H // 2 - 40), top, font=ImageFont.truetype(BOLD, 50), fill=INK, anchor="mm")
    d.text((W // 2, H // 2 + 30), sub, font=ImageFont.truetype(FONT, 26), fill=GREY, anchor="mm")
    d.text((W // 2, H - 40), "Local capture evidence from kernelcad render, not deployed behaviour.",
           font=ImageFont.truetype(FONT, 20), fill=GREY, anchor="mm")
    return img


def slide(png: Path, top: str, bottom: str) -> Image.Image:
    img = Image.new("RGB", (W, H), "white")
    shot = Image.open(png).convert("RGB")
    shot.thumbnail((W, 560))
    img.paste(shot, ((W - shot.width) // 2, 60))
    d = ImageDraw.Draw(img)
    d.text((W // 2, 32), top, font=ImageFont.truetype(FONT, 22), fill=GREY, anchor="mm")
    d.multiline_text((W // 2, H - 52), bottom, font=ImageFont.truetype(BOLD, 26), fill=INK, anchor="mm", align="center")
    return img


def main() -> None:
    frames = Path(sys.argv[1])
    fourbar = sorted(frames.glob(f"fourbar-*.{POSE}.png"))
    latch = sorted(frames.glob(f"latch-*.{POSE}.png"))
    seq: list[tuple[Image.Image, int]] = [(card("Closed-loop kinematics", "One driven joint; the loop solver poses every other link."), TITLE)]
    for i, p in enumerate(fourbar):
        crank = int(re.search(r"fourbar-(\d+)", p.name).group(1))
        if i == len(fourbar) - 1:
            seq.append((slide(p, FOUR_BAR, f"crank = {crank}°: first contact. Rocker and stop (both red) touch.\n"
                                             f"The swept-collision check and the closed form both give {crank}°"), HOLD))
        else:
            seq.append((slide(p, FOUR_BAR, f"crank = {crank}°"), PER_POSE))
    for i, p in enumerate(latch):
        handle = int(re.search(r"latch-(\d+)", p.name).group(1)) - 20
        if i == len(latch) - 1:
            seq.append((slide(p, LATCH, f"handle = {handle}°: last pose on the pinned (latched) side.\n"
                                        "At 6° the sweep stops with kinematic.loop.branch-flip (closed form 4.41°)"), HOLD))
        else:
            seq.append((slide(p, LATCH, f"handle = {handle}°".replace("-", "−")), PER_POSE))
    with tempfile.TemporaryDirectory() as tmp:
        n = 0
        for img, count in seq:
            for _ in range(count):
                img.save(Path(tmp) / f"f{n:05d}.png")
                n += 1
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(Path(tmp) / "f%05d.png"),
                        "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart", str(OUT)], check=True)
    print(f"wrote {OUT} ({n} frames, {n / FPS:.1f} s)")


if __name__ == "__main__":
    main()
