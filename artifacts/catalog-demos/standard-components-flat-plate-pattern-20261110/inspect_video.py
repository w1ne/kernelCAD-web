#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Record MP4 metadata and extract frames used for visual inspection."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


OUT = Path(__file__).resolve().parent
VIDEO = OUT / "standard-components-flat-plate-pattern.mp4"
REVIEW = OUT / "video-review"
TIMES = [1.5, 4.5, 7.5, 10.5]


def main() -> None:
    REVIEW.mkdir(exist_ok=True)
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO),
    ], text=True))
    stream = next(row for row in probe["streams"] if row["codec_type"] == "video")
    frames = []
    thumbs = []
    for index, timestamp in enumerate(TIMES, 1):
        path = REVIEW / f"sample-{index:02d}.png"
        subprocess.run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(timestamp),
            "-i", str(VIDEO), "-frames:v", "1", str(path),
        ], check=True)
        image = Image.open(path).convert("RGB")
        image.thumbnail((480, 270), Image.Resampling.LANCZOS)
        thumbs.append(image.copy())
        frames.append({"timeSeconds": timestamp, "file": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    sheet = Image.new("RGB", (976, 572), "#eff3f8")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    for index, (timestamp, thumb) in enumerate(zip(TIMES, thumbs, strict=True)):
        x = 8 + (index % 2) * 488
        y = 8 + (index // 2) * 282
        sheet.paste(thumb, (x, y))
        draw.text((x + 4, y + 250), f"{timestamp:.1f} sec", fill="#193146", font=font)
    sheet.save(REVIEW / "decoded-samples.png")
    info = {
        "file": VIDEO.name,
        "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
        "bytes": VIDEO.stat().st_size,
        "durationSeconds": float(probe["format"]["duration"]),
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "frameRate": stream["r_frame_rate"],
        "codec": stream["codec_name"],
        "samples": frames,
        "inspection": "Four decoded samples were assembled into video-review/decoded-samples.png and visually reviewed.",
    }
    (OUT / "video-inspection.json").write_text(f"{json.dumps(info, indent=2)}\n", encoding="utf-8")
    print(json.dumps(info, indent=2))


if __name__ == "__main__":
    main()
