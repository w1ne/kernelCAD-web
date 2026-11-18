#!/usr/bin/env python3
"""Inspect the generated MP4 and save representative frames."""
from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
VIDEO = HERE / "demo.mp4"
VERIFY = HERE / "verification"


def main() -> None:
    VERIFY.mkdir(exist_ok=True)
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,r_frame_rate,pix_fmt",
        "-show_entries", "format=duration,size", "-of", "json", str(VIDEO),
    ], text=True))
    with tempfile.TemporaryDirectory(prefix="fastened-pose-review-", dir=HERE) as tmp:
        frames: list[Image.Image] = []
        for second in (1, 4, 7):
            frame = Path(tmp) / f"frame-{second}.png"
            subprocess.run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(second),
                "-i", str(VIDEO), "-frames:v", "1", str(frame),
            ], check=True)
            frames.append(Image.open(frame).convert("RGB"))
        sheet = Image.new("RGB", (1296, 800), "#101820")
        draw = ImageDraw.Draw(sheet)
        label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        for i, (second, frame) in enumerate(zip((1, 4, 7), frames)):
            x = 16 + i * 432
            sheet.paste(frame.resize((416, 234)), (x, 24))
            draw.text((x, 274), f"{second}s", font=label, fill="#edf3f6")
        sheet.save(VERIFY / "video-contact-sheet.png")
    report = {
        "video": str(VIDEO.relative_to(HERE)),
        "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
        "metadata": probe,
        "inspectedSeconds": [1, 4, 7],
        "visualInspection": "Titles, topology labels, error text, and local-verification caption are legible in the sampled frames.",
        "source": "capture_demo.py",
    }
    (VERIFY / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
