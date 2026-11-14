#!/usr/bin/env python3
"""Compose the retained kernelCAD keyboard variant renders into a short MP4."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
RENDERS = BUNDLE / "renders"
FRAMES = BUNDLE / "frames"
SEQUENCE = [
    ("default-tenkeyless.png", "Default · tenkeyless", "Default graphite keycaps · ABS shell · coral accent"),
    ("retro-tenkeyless.png", "Preset · retro", "retro preset · cream PBT keycaps and warm ABS shell"),
    ("white-compact.png", "Layout · compact | preset · white", "compact layout · white preset · the navigation block is removed"),
    ("full-gamer.png", "Layout · full | preset · gamer", "full layout · gamer preset · navigation block and number pad are visible"),
]


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    font_bold_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    title_font = ImageFont.truetype(font_bold_path, 26)
    body_font = ImageFont.truetype(font_path, 18)
    note_font = ImageFont.truetype(font_path, 14)

    for index, (name, title, caption) in enumerate(SEQUENCE):
        canvas = Image.new("RGB", (800, 690), "#f3f6f9")
        draw = ImageDraw.Draw(canvas)
        draw.text((42, 22), "kernelCAD · Electronics keyboard", fill="#24364b", font=title_font)
        draw.text((42, 58), title, fill="#3d5874", font=body_font)
        render = Image.open(RENDERS / name).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
        canvas.paste(render, ((800 - 512) // 2, 92))
        draw.text((42, 616), caption, fill="#26384c", font=body_font)
        draw.text((42, 650), "Source variant replay · local low-poly render · not a deployed browser capture", fill="#66788a", font=note_font)
        canvas.save(FRAMES / f"frame-{index:02d}.png", optimize=True)

    gate = Image.new("RGB", (800, 690), "#f3f6f9")
    draw = ImageDraw.Draw(gate)
    draw.text((42, 22), "kernelCAD · catalog quality gate", fill="#24364b", font=title_font)
    draw.text((42, 58), "Command and observed result", fill="#3d5874", font=body_font)
    lines = [
        "python3 scripts/checkCatalogQuality.py --kit electronics",
        "12/12 electronics assets pass",
        "Two material-named controls + at least one preset",
        "Whole catalog: 2,401/2,402 pass (99.96%)",
        "Remaining strict-gate gap: interior/table-lamp",
    ]
    for row, line in enumerate(lines):
        draw.text((64, 170 + row * 58), line, fill="#26384c", font=body_font if row else note_font)
    draw.text((42, 650), "Local source gate · no deployment or physical acceptance claim", fill="#66788a", font=note_font)
    gate.save(FRAMES / "frame-04.png", optimize=True)

    subprocess.run([
        "ffmpeg", "-y", "-framerate", "1/3", "-i", str(FRAMES / "frame-%02d.png"),
        "-r", "30", "-c:v", "libx264", "-crf", "22", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(BUNDLE / "keyboard-material-controls.mp4"),
    ], check=True)


if __name__ == "__main__":
    main()
