#!/usr/bin/env python3
"""Inspect the encoded USB-C regression demo and create a contact sheet."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
VIDEO = HERE / "demo.mp4"
VERIFICATION = HERE / "verification"


def main() -> None:
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration,size",
        "-of", "json", str(VIDEO),
    ], check=True, capture_output=True, text=True)
    data = json.loads(probe.stdout)
    stream = data["streams"][0]
    duration = float(data["format"]["duration"])
    assert stream["codec_name"] == "h264"
    assert (stream["width"], stream["height"], stream["pix_fmt"]) == (1280, 720, "yuv420p")
    assert stream["r_frame_rate"] == "24/1"
    assert 11.9 <= duration <= 12.1

    frames = []
    for second in (1, 5, 9):
        frame = subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(second),
            "-i", str(VIDEO), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-",
        ], check=True, capture_output=True).stdout
        from io import BytesIO
        frames.append(Image.open(BytesIO(frame)).convert("RGB"))

    sheet = Image.new("RGB", (1280, 275), "#101820")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    for index, frame in enumerate(frames):
        thumb = frame.resize((400, 225))
        x = 20 + index * 420
        sheet.paste(thumb, (x, 8))
        draw.text((x, 240), f"{index * 4 + 1}s", fill="#edf3f6", font=font)
    VERIFICATION.mkdir(parents=True, exist_ok=True)
    sheet.save(VERIFICATION / "video-contact-sheet.png")

    report = {
        "video": "demo.mp4",
        "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
        "bytes": VIDEO.stat().st_size,
        "codec": stream["codec_name"],
        "size": [stream["width"], stream["height"]],
        "frameRate": stream["r_frame_rate"],
        "pixelFormat": stream["pix_fmt"],
        "durationSeconds": duration,
        "framesVisuallySampledAtSeconds": [1, 5, 9],
        "contactSheet": "verification/video-contact-sheet.png",
        "result": "pass",
    }
    (VERIFICATION / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
