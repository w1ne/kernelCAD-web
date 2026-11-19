#!/usr/bin/env python3
"""Inspect the encoded case-01 regression demo and save a contact sheet."""
from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
VIDEO = HERE / "demo.mp4"
OUT = HERE / "verification"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(VIDEO),
    ], text=True))
    stream = next(item for item in probe["streams"] if item.get("codec_type") == "video")
    samples = [1, 5, 9]
    with tempfile.TemporaryDirectory(prefix="pi4-floor-inspection-") as tmp:
        thumbs: list[Image.Image] = []
        for second in samples:
            path = Path(tmp) / f"frame-{second}.png"
            subprocess.run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(second),
                "-i", str(VIDEO), "-frames:v", "1", "-update", "1", str(path),
            ], check=True)
            frame = Image.open(path).convert("RGB")
            frame.thumbnail((400, 225))
            thumbs.append(frame.copy())

    sheet = Image.new("RGB", (1240, 280), "#101820")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    for i, (second, thumb) in enumerate(zip(samples, thumbs, strict=True)):
        x = 20 + i * 410
        sheet.paste(thumb, (x, 20))
        draw.text((x, 250), f"sample at {second}s", font=font, fill="#edf3f6")
    sheet.save(OUT / "video-contact-sheet.png")

    report = {
        "video": "demo.mp4",
        "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
        "bytes": VIDEO.stat().st_size,
        "durationSeconds": float(probe["format"]["duration"]),
        "codec": stream["codec_name"],
        "pixelFormat": stream.get("pix_fmt"),
        "width": stream["width"],
        "height": stream["height"],
        "frameRate": stream["r_frame_rate"],
        "sampleSeconds": samples,
        "contactSheet": "video-contact-sheet.png",
    }
    (OUT / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
