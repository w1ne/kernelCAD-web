#!/usr/bin/env python3
"""Run the real local sew() capture repro and render a compact MP4 handoff."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = HERE / "demo.ts"
OUTPUT = HERE / "sew-option-keys.mp4"
WIDTH, HEIGHT, FPS, DURATION_SECONDS = 1280, 720, 24, 6
BG = (12, 18, 31)
PANEL = (22, 31, 49)
PANEL_LIGHT = (28, 41, 64)
TEXT = (236, 241, 250)
MUTED = (156, 174, 198)
CYAN = (91, 206, 220)
RED = (255, 135, 129)
GREEN = (140, 222, 169)


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def rounded(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], color: tuple[int, int, int], radius: int = 16) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=color)


def centered(draw: ImageDraw.ImageDraw, y: int, text: str, text_font: ImageFont.FreeTypeFont, fill: tuple[int, int, int]) -> None:
    box = draw.textbbox((0, 0), text, font=text_font)
    draw.text(((WIDTH - (box[2] - box[0])) // 2, y), text, font=text_font, fill=fill)


def make_frame(result: dict, corrected: bool) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((66, 45), "KernelCAD  /  ENGINE REGRESSION", font=font(REGULAR, 20), fill=CYAN)
    draw.text((66, 93), "Sew option validation", font=font(REGULAR, 46), fill=TEXT)
    draw.text((68, 157), "A misspelled closure guard must not silently disable open-shell protection.", font=font(REGULAR, 22), fill=MUTED)

    rounded(draw, (64, 228, 1216, 361), PANEL)
    draw.text((90, 248), "CAPTURED CALL", font=font(REGULAR, 17), fill=MUTED)
    call = result["correctedCall"] if corrected else result["invalidCall"]
    draw.text((90, 291), call, font=font(MONO, 27), fill=GREEN if corrected else TEXT)

    rounded(draw, (64, 385, 1216, 590), PANEL_LIGHT if corrected else PANEL)
    if corrected:
        draw.text((90, 409), "VALID OPTIONS RETAINED", font=font(REGULAR, 18), fill=GREEN)
        draw.text((90, 455), f"requireClosed = {str(result['correctedRecord']['requireClosed']).lower()}", font=font(MONO, 28), fill=TEXT)
        draw.text((90, 503), f"tolerance = {result['correctedRecord']['toleranceMm']} mm", font=font(MONO, 28), fill=TEXT)
        draw.text((90, 551), "Feature capture succeeds with the documented values.", font=font(REGULAR, 19), fill=MUTED)
    else:
        draw.text((90, 407), result["error"]["code"], font=font(MONO, 24), fill=RED)
        draw.text((90, 453), "opts.requireClosd  →  unknown option", font=font(MONO, 27), fill=TEXT)
        draw.text((90, 503), "Allowed: tolerance, requireClosed", font=font(MONO, 23), fill=CYAN)
        draw.text((90, 551), f"Sew records unchanged: {result['sewRecordsBefore']} → {result['sewRecordsAfter']}", font=font(REGULAR, 19), fill=MUTED)

    centered(draw, 632, "LOCAL CAPTURE VALIDATION  ·  GEOMETRY NOT LOWERED  ·  NOT A DEPLOYMENT CLAIM", font(REGULAR, 16), MUTED)
    return image


def main() -> None:
    run = subprocess.run(
        ["npx", "tsx", str(SOURCE)], cwd=ROOT, check=True, text=True,
        capture_output=True,
    )
    result = json.loads(run.stdout)
    (HERE / "repro-output.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    frame_count = FPS * DURATION_SECONDS
    with tempfile.TemporaryDirectory(prefix="kc-sew-demo-") as temp_name:
        temp = Path(temp_name)
        first = make_frame(result, corrected=False)
        last = make_frame(result, corrected=True)
        for index in range(frame_count):
            corrected = index >= frame_count // 2
            (last if corrected else first).save(temp / f"frame-{index:04d}.png")
        first.save(HERE / "inspection-first-frame.png")
        last.save(HERE / "inspection-last-frame.png")

        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise RuntimeError("ffmpeg is required to render the demo")
        command = [
            ffmpeg, "-y", "-framerate", str(FPS), "-i", str(temp / "frame-%04d.png"),
            "-c:v", "libx264", "-preset", "slow", "-crf", "24",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT),
        ]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)

    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        raise RuntimeError("ffprobe is required to verify the rendered demo")
    probe = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height,r_frame_rate", "-of", "json", str(OUTPUT)],
        check=True, capture_output=True, text=True,
    )
    info = json.loads(probe.stdout)
    manifest = {
        "capturedAtUtc": datetime.now(timezone.utc).isoformat(),
        "source": "demo.ts",
        "invocation": "npx tsx docs/demos/engine/sew-option-keys-20261117/demo.ts",
        "renderInvocation": "python3 docs/demos/engine/sew-option-keys-20261117/render_demo.py",
        "settings": {"width": WIDTH, "height": HEIGHT, "fps": FPS, "durationSeconds": DURATION_SECONDS, "codec": "libx264", "crf": 24},
        "video": OUTPUT.name,
        "sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        "probe": info,
        "provenance": "actual local CaptureSession API result; no OCCT lowering, deployed behavior, or hardware acceptance",
    }
    (HERE / "render-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
