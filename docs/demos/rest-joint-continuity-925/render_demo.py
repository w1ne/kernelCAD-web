#!/usr/bin/env python3
"""Render the retained local mechanism-verdict evidence as a short MP4."""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
REPORT = HERE / "demo-output.json"
VIDEO = HERE / "demo.mp4"
WIDTH, HEIGHT = 1280, 720
FPS = 24
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BACKGROUND = (11, 16, 31)
CARD = (22, 31, 52)
TEXT = (235, 241, 250)
MUTED = (157, 171, 191)
BLUE = (91, 169, 255)
RED = (255, 115, 115)
AMBER = (255, 194, 86)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def put(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, size: int, color=TEXT) -> None:
    draw.text(xy, value, font=font(size), fill=color)


def wrapped(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, width: int, size: int, color=TEXT, line_gap: int = 8) -> int:
    y = xy[1]
    selected_font = font(size)
    lines: list[str] = []
    line = ""
    for word in value.split():
        candidate = word if not line else f"{line} {word}"
        if line and draw.textlength(candidate, font=selected_font) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    for line in lines:
        draw.text((xy[0], y), line, font=selected_font, fill=color)
        y += size + line_gap
    return y


def base(title: str, subtitle: str, index: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    put(draw, (64, 36), "kernelCAD   /   ISSUE #925", 19, BLUE)
    put(draw, (64, 84), title, 40)
    put(draw, (64, 145), subtitle, 21, MUTED)
    draw.rounded_rectangle((64, 640, WIDTH - 64, 644), radius=2, fill=(45, 59, 82))
    draw.rounded_rectangle((64, 640, 64 + int((WIDTH - 128) * index / 4), 644), radius=2, fill=BLUE)
    put(draw, (64, 662), "LOCAL CAD VALIDATION  ·  NO PHYSICS SIMULATION / DEPLOYMENT / HARDWARE ACCEPTANCE", 13, MUTED)
    return image, draw


def model_diagram(draw: ImageDraw.ImageDraw) -> None:
    # Side section of a valid annular bearing. The center is intentionally
    # open; material contact around the pivot supports the two mated parts.
    draw.rounded_rectangle((170, 430, 365, 545), radius=8, fill=(68, 77, 96), outline=(147, 165, 190), width=3)
    draw.rounded_rectangle((475, 430, 670, 545), radius=8, fill=(68, 77, 96), outline=(147, 165, 190), width=3)
    draw.rounded_rectangle((170, 390, 670, 425), radius=8, fill=(45, 78, 117), outline=BLUE, width=3)
    put(draw, (210, 475), "parent rim", 20)
    put(draw, (515, 475), "parent rim", 20)
    put(draw, (235, 350), "child disc", 22)
    draw.line((420, 270, 420, 575), fill=(111, 135, 169), width=2)
    draw.ellipse((407, 386, 433, 412), fill=AMBER, outline=(255, 230, 180), width=2)
    put(draw, (455, 286), "joint axis", 18, AMBER)
    put(draw, (730, 310), "The annular rim provides bearing contact.", 22)
    put(draw, (730, 365), "Both pivot-distance paths are deliberately unavailable.", 18, MUTED)
    put(draw, (730, 460), "Rest pose", 18, MUTED)
    put(draw, (730, 493), "revolute · travel sweep skipped", 20)


def make_frames(report: dict) -> list[Image.Image]:
    evidence = report["evidence"]
    diagnostics = evidence["diagnostics"]
    unknown = next(item for item in diagnostics if item["code"] == "mechanism.joint-mesh-unverified")
    unknown_text = unknown["message"]
    images: list[Image.Image] = []

    image, draw = base("Rest-pose joint continuity", "Annular bearing · local OCCT evaluation", 1)
    model_diagram(draw)
    images.append(image)

    image, draw = base("Unavailable evidence stays unverified", "Invocation: checkMechanismTruth(arm, { sweepBudget: 0 })", 2)
    draw.rounded_rectangle((64, 245, 1216, 570), radius=18, fill=CARD, outline=(48, 66, 94), width=2)
    put(draw, (100, 280), "VERDICT", 18, MUTED)
    put(draw, (100, 315), evidence["verdict"].upper(), 44, RED)
    put(draw, (620, 280), "SWEEP COVERAGE", 18, MUTED)
    put(draw, (620, 315), f"sweep = {str(evidence['coverage']['sweep']).lower()}", 29, AMBER)
    put(draw, (100, 410), "WARN  mechanism.joint-mesh-unverified", 24, AMBER)
    put(draw, (100, 452), "WARN  mechanism.unverified-budget-exceeded", 20, AMBER)
    wrapped(draw, (100, 500), "The rest-pose check still ran; unavailable joint measurements remain unverified when travel coverage is skipped.", 1050, 17, MUTED, 6)
    images.append(image)

    image, draw = base("The diagnostic names the unknown measurement", "The travel sweep is skipped; rest-pose continuity still runs.", 3)
    draw.rounded_rectangle((64, 240, 1216, 570), radius=18, fill=CARD, outline=(48, 66, 94), width=2)
    wrapped(draw, (100, 300), unknown_text, 1050, 22, AMBER, 9)
    wrapped(draw, (100, 410), "The separate budget diagnostic reports skipped travel coverage; it does not erase the rest-pose unknown.", 1050, 19, MUTED, 7)
    images.append(image)

    image, draw = base("Evidence scope", "Keep each kind of result explicit.", 4)
    rows = [
        ("LOCAL VALIDATION", "Real annular-bearing model; measurement paths stubbed unavailable", BLUE),
        ("MOTION SWEEP", "Skipped at budget 0; rest-pose check still ran", AMBER),
        ("SIMULATION", "No physics or motion simulation was run", MUTED),
        ("DEPLOYMENT / HARDWARE", "Not deployed; no physical hardware acceptance", MUTED),
    ]
    y = 244
    for label, detail, color in rows:
        draw.rounded_rectangle((64, y, 1216, y + 74), radius=14, fill=CARD, outline=(48, 66, 94), width=1)
        put(draw, (88, y + 22), label, 16, color)
        put(draw, (390, y + 21), detail, 18)
        y += 88
    images.append(image)
    return images


def main() -> None:
    report = json.loads(REPORT.read_text())
    with tempfile.TemporaryDirectory(prefix="kc-rest-joint-demo-") as temp:
        frames = Path(temp)
        for index, image in enumerate(make_frames(report)):
            image.save(frames / f"frame-{index:02d}.png")
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", "1/3", "-i", str(frames / "frame-%02d.png"),
            "-c:v", "libx264", "-preset", "medium", "-crf", "22",
            "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart",
            str(VIDEO),
        ], check=True)
    print(f"Wrote {VIDEO} ({VIDEO.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
