#!/usr/bin/env python3
"""Render the actual local zero-budget diagnostic output as a short MP4."""

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
GREEN = (105, 220, 165)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def put(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, size: int, color=TEXT) -> None:
    draw.text(xy, value, font=font(size), fill=color)


def wrapped(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, width: int, size: int, color=TEXT, gap: int = 8) -> int:
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
    y = xy[1]
    for line in lines:
        draw.text((xy[0], y), line, font=selected_font, fill=color)
        y += size + gap
    return y


def base(title: str, subtitle: str, index: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    put(draw, (64, 36), "kernelCAD   /   MECHANISM VALIDATION", 19, BLUE)
    put(draw, (64, 84), title, 40)
    put(draw, (64, 145), subtitle, 21, MUTED)
    draw.rounded_rectangle((64, 640, WIDTH - 64, 644), radius=2, fill=(45, 59, 82))
    draw.rounded_rectangle((64, 640, 64 + int((WIDTH - 128) * index / 3), 644), radius=2, fill=BLUE)
    put(draw, (64, 662), "LOCAL CAD VALIDATION  ·  SWEEP SKIPPED  ·  NO SIMULATION / DEPLOYMENT / HARDWARE ACCEPTANCE", 13, MUTED)
    return image, draw


def make_frames(report: dict) -> list[Image.Image]:
    result = report["result"]
    diagnostics = {item["code"]: item for item in result["diagnostics"]}
    overlap = diagnostics["mechanism.rest-interpenetration"]
    sweep = diagnostics["mechanism.unverified-budget-exceeded"]
    images: list[Image.Image] = []

    image, draw = base("A forced sweep skip", "A revolute mate, a real rest-pose overlap, and a zero sweep budget.", 1)
    # Side view of the actual two overlapping 10 mm cube bodies.
    draw.rounded_rectangle((140, 340, 500, 510), radius=16, fill=(55, 89, 132), outline=BLUE, width=4)
    draw.rounded_rectangle((420, 390, 780, 560), radius=16, fill=(124, 73, 68), outline=RED, width=4)
    put(draw, (245, 404), "parent", 26)
    put(draw, (535, 454), "child", 26)
    draw.ellipse((438, 327, 462, 351), fill=AMBER, outline=(255, 230, 180), width=2)
    put(draw, (474, 320), "revolute axis", 18, AMBER)
    draw.rounded_rectangle((838, 300, 1216, 560), radius=16, fill=CARD, outline=(48, 66, 94), width=2)
    put(draw, (878, 334), "INVOCATION", 16, MUTED)
    put(draw, (878, 375), "checkMechanismTruth(arm,", 21)
    put(draw, (878, 410), "  { sweepBudget: 0 })", 21, BLUE)
    wrapped(draw, (878, 466), report["scenario"], 300, 17, MUTED, 5)
    images.append(image)

    image, draw = base("Reason appears in the diagnostic", "The rest-pose overlap is broken; the travel sweep was forced off.", 2)
    draw.rounded_rectangle((64, 234, 1216, 610), radius=18, fill=CARD, outline=(48, 66, 94), width=2)
    put(draw, (96, 268), "VERDICT", 16, MUTED)
    put(draw, (96, 298), result["mechanism"].upper(), 38, RED)
    put(draw, (465, 268), "SWEEP COVERAGE", 16, MUTED)
    put(draw, (465, 298), str(result["sweepCoverage"]).lower(), 30, AMBER)
    put(draw, (96, 366), f"ERROR  {overlap['code']}", 19, RED)
    put(draw, (96, 402), f"WARN  {sweep['code']}", 19, AMBER)
    wrapped(draw, (96, 444), sweep["message"], 1060, 17, TEXT, 7)
    images.append(image)

    image, draw = base("The hint follows the stated reason", "Read the structured message before changing the sweep budget.", 3)
    draw.rounded_rectangle((64, 240, 1216, 510), radius=18, fill=CARD, outline=(48, 66, 94), width=2)
    put(draw, (96, 270), "HINT", 16, MUTED)
    wrapped(draw, (96, 310), sweep["hint"], 1060, 20, GREEN, 9)
    put(draw, (96, 550), "This run says: sweepBudget is 0 (forced skip).", 22, AMBER)
    images.append(image)
    return images


def main() -> None:
    report = json.loads(REPORT.read_text())
    with tempfile.TemporaryDirectory(prefix="kc-sweep-hint-demo-") as temp:
        frames = Path(temp)
        for index, image in enumerate(make_frames(report)):
            image.save(frames / f"frame-{index:02d}.png")
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", "1/2.5", "-i", str(frames / "frame-%02d.png"),
            "-c:v", "libx264", "-preset", "medium", "-crf", "22",
            "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart",
            str(VIDEO),
        ], check=True)
    print(f"Wrote {VIDEO} ({VIDEO.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
