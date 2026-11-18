#!/usr/bin/env python3
"""Compose a short, readable preview/material-review video from retained PNGs."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont, ImageOps


BUNDLE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
FRAMES = BUNDLE / "verification/frames"
WIDTH, HEIGHT = 1280, 720
FPS, SECONDS = 12, 3
BG = "#edf2f6"
INK = "#1f3548"
MUTED = "#496273"
ACCENT = "#287e79"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
ASSETS = [
    "hull-block-spreader-beam",
    "plate-pack-transfer-cart",
    "pipe-rack-fork-pocket",
    "weld-consumable-issue-cage",
    "shipfitter-tool-cabinet",
]
LABELS = {
    "hull-block-spreader-beam": "Hull block spreader beam",
    "plate-pack-transfer-cart": "Plate pack transfer cart",
    "pipe-rack-fork-pocket": "Pipe rack with fork pockets",
    "weld-consumable-issue-cage": "Weld consumable issue cage",
    "shipfitter-tool-cabinet": "Shipfitter tool cabinet",
}
OBSERVATIONS = {
    "hull-block-spreader-beam": "Four end shoes are named soft-contact pads. The updated preview separates them from the painted beam and drop links.",
    "plate-pack-transfer-cart": "The low four-wheel carrier reads as a plate cart. Its push bar appears disconnected from the frame; recorded for a separate geometry correction.",
    "pipe-rack-fork-pocket": "Base skids, upright dividers, retaining rail and fork-pocket blocks read as an empty pipe rack.",
    "weld-consumable-issue-cage": "The roof, posts, shelves and door read as storage. Mesh infill is absent despite the mesh-style description; recorded for a separate correction.",
    "shipfitter-tool-cabinet": "Paired doors, drawer bank and side tool rail read as a shop cabinet.",
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def wrapped(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, width: int, size: int = 26, color: str = INK) -> int:
    f = font(size)
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=f)[2] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    for line in lines:
        draw.text((x, y), line, font=f, fill=color)
        y += size + 9
    return y


def new_slide(title: str, kicker: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)
    draw.text((54, 34), kicker.upper(), font=font(18, True), fill=ACCENT)
    draw.text((54, 66), title, font=font(34, True), fill=INK)
    draw.line((54, 116, WIDTH - 54, 116), fill="#b7c7d1", width=2)
    draw.text((54, HEIGHT - 42), "Local kernelCAD software preview • no simulation or hardware acceptance", font=font(17), fill=MUTED)
    return canvas, draw


def add_preview(canvas: Image.Image, path: Path, box: tuple[int, int, int, int]) -> None:
    image = Image.open(path).convert("RGB")
    x0, y0, x1, y1 = box
    fitted = ImageOps.contain(image, (x1 - x0, y1 - y0))
    x = x0 + (x1 - x0 - fitted.width) // 2
    y = y0 + (y1 - y0 - fitted.height) // 2
    canvas.paste(fitted, (x, y))


def asset_slide(asset_id: str) -> Image.Image:
    canvas, draw = new_slide(LABELS[asset_id], "Rendered preview audit")
    image_path = (ROOT / "catalog/kits/shipyard/previews" / f"{asset_id}.png") if asset_id == ASSETS[0] else (BUNDLE / "samples/previews" / f"{asset_id}.png")
    draw.rounded_rectangle((42, 138, 836, 650), radius=16, fill="white", outline="#c8d5dd", width=2)
    add_preview(canvas, image_path, (62, 153, 816, 630))
    draw.text((878, 164), "WHAT THE PREVIEW SHOWS", font=font(18, True), fill=ACCENT)
    y = wrapped(draw, OBSERVATIONS[asset_id], 878, 202, 345, size=25)
    row = find_row(asset_id)
    y += 22
    dimensions = " × ".join(f"{v:.3f}".rstrip("0").rstrip(".") for v in row["stats"]["sizeM"])
    y = wrapped(draw, f"Index envelope: {dimensions} m", 878, y, 345, size=18, color=INK)
    y += 14
    draw.text((878, y), f"{row['stats']['triangles']} triangles / {row['triangleBudget']} budget", font=font(19), fill=MUTED)
    return canvas


def find_row(asset_id: str) -> dict[str, object]:
    index = json.loads((ROOT / "catalog/index.json").read_text())
    return next(row for row in index["assets"] if row["kit"] == "shipyard" and row["id"] == asset_id)


def build_slides() -> list[Image.Image]:
    slides: list[Image.Image] = []
    canvas, draw = new_slide("Five shipyard previews, one material correction", "Semantic review • 18 Nov 2026")
    draw.text((56, 150), "Selected assets", font=font(20, True), fill=ACCENT)
    xs = [52, 292, 532, 772, 1012]
    for x, asset_id in zip(xs, ASSETS, strict=True):
        draw.rounded_rectangle((x, 192, x + 216, 496), radius=13, fill="white", outline="#c8d5dd", width=2)
        img_path = (ROOT / "catalog/kits/shipyard/previews" / f"{asset_id}.png") if asset_id == ASSETS[0] else (BUNDLE / "samples/previews" / f"{asset_id}.png")
        add_preview(canvas, img_path, (x + 8, 202, x + 208, 438))
        label = LABELS[asset_id]
        for line_no, line in enumerate(wrap(label, width=20)[:2]):
            draw.text((x + 12, 444 + line_no * 24), line, font=font(16, True), fill=INK)
    draw.text((56, 536), "The soft-contact pads were keyed to the same painted finish as the beam.", font=font(23), fill=INK)
    draw.text((56, 576), "The source now exposes an elastomer color control for all four pads.", font=font(23), fill=INK)
    slides.append(canvas)

    for asset_id in ASSETS:
        slides.append(asset_slide(asset_id))

    canvas, draw = new_slide("Separate soft-contact pads from painted steel", "Source-to-preview change")
    draw.rounded_rectangle((44, 138, 622, 650), radius=16, fill="white", outline="#c8d5dd", width=2)
    draw.rounded_rectangle((658, 138, 1236, 650), radius=16, fill="white", outline="#c8d5dd", width=2)
    draw.text((74, 160), "BEFORE • same yard paint", font=font(20, True), fill=INK)
    draw.text((688, 160), "AFTER • elastomer pads", font=font(20, True), fill=INK)
    add_preview(canvas, BUNDLE / "before/hull-block-spreader-beam.png", (66, 200, 600, 610))
    add_preview(canvas, ROOT / "catalog/kits/shipyard/previews/hull-block-spreader-beam.png", (680, 200, 1214, 610))
    slides.append(canvas)

    canvas, draw = new_slide("Material regression and limits", "Verification result")
    draw.rounded_rectangle((54, 152, 1226, 610), radius=18, fill="white", outline="#c8d5dd", width=2)
    draw.text((92, 190), "Exported GLB regression", font=font(24, True), fill=ACCENT)
    draw.text((92, 244), "Baseline: fails — contact-shoe-0 uses the painted color", font=font(23), fill=INK)
    draw.text((92, 294), "Revised: passes — all four shoes use editable elastomer", font=font(23), fill=INK)
    draw.text((92, 356), "380 triangles unchanged • geometry and envelope unchanged", font=font(21), fill=INK)
    summary_path = BUNDLE / "verification/summary.json"
    summary = json.loads(summary_path.read_text())
    for i, line in enumerate(summary["checks"]):
        draw.text((92, 414 + i * 38), line, font=font(19), fill=MUTED)
    draw.text((92, 578), "Local source, preview and regression only; branch remains undeployed.", font=font(19, True), fill=INK)
    slides.append(canvas)
    return slides


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    slides = build_slides()
    for i, slide in enumerate(slides, start=1):
        slide.save(FRAMES / f"slide-{i:02d}.png", optimize=True)

    command = ["ffmpeg", "-hide_banner", "-loglevel", "warning", "-y"]
    for i in range(1, len(slides) + 1):
        command.extend(["-loop", "1", "-framerate", str(FPS), "-t", str(SECONDS), "-i", str(FRAMES / f"slide-{i:02d}.png")])
    filters = []
    concat_inputs = []
    for i in range(len(slides)):
        filters.append(f"[{i}:v]fps={FPS},format=yuv420p,setpts=PTS-STARTPTS[v{i}]")
        concat_inputs.append(f"[v{i}]")
    filters.append(f"{''.join(concat_inputs)}concat=n={len(slides)}:v=1:a=0[outv]")
    video = BUNDLE / "shipyard-hull-block-spreader-beam-material-review.mp4"
    command.extend([
        "-filter_complex", ";".join(filters), "-map", "[outv]", "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-movflags", "+faststart", str(video),
    ])
    subprocess.run(command, check=True)
    settings = {
        "date": "2026-11-18",
        "scope": "five existing shipyard asset previews plus one source-to-preview material correction",
        "assetOrder": ASSETS,
        "canvas": f"{WIDTH}x{HEIGHT}",
        "slideCount": len(slides),
        "secondsPerSlide": SECONDS,
        "frameRate": FPS,
        "frameCount": len(slides) * SECONDS * FPS,
        "videoCodec": "H.264 / libx264",
        "encoderPreset": "medium",
        "crf": 24,
        "pixelFormat": "yuv420p",
        "faststart": True,
        "invocation": "python3 <bundle>/make_demo.py",
        "ffmpegInvocation": "8 still PNG inputs at 12 fps, 3 seconds each; fps/format filters; concat; libx264 medium CRF 24; faststart",
        "source": "make_demo.py plus retained native preview PNGs and verification summary",
        "provenance": "Local software preview, exported-GLB regression and catalog checks only. No simulation, deployment or hardware acceptance.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n")
    print(f"Wrote {video} ({len(slides)} slides, {len(slides) * SECONDS} seconds)")


if __name__ == "__main__":
    main()
