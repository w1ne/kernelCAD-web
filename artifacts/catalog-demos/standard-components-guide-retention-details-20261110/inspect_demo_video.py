#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Decode and record representative frames from the completed MP4."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


OUT = Path(__file__).resolve().parent
VIDEO = OUT / "standard-components-guide-retention-details.mp4"
REVIEW = OUT / "video-review"
TIMES = [1.5, 4.5, 7.5, 10.5, 13.5]


def main() -> None:
    REVIEW.mkdir(exist_ok=True)
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration,size,format_name:stream=codec_name,width,height,r_frame_rate,pix_fmt",
            "-of", "json", str(VIDEO),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    metadata = json.loads(probe.stdout)
    samples = []
    for index, seconds in enumerate(TIMES, start=1):
        target = REVIEW / f"sample-{index:02d}.png"
        subprocess.run(
            [
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(seconds),
                "-i", str(VIDEO), "-frames:v", "1", str(target),
            ],
            check=True,
        )
        with Image.open(target) as frame:
            samples.append(frame.convert("RGB"))
    sheet = Image.new("RGB", (1256, 486), (239, 243, 248))
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(samples):
        frame.thumbnail((400, 225), Image.Resampling.LANCZOS)
        x = 12 + (index % 3) * 416
        y = 12 + (index // 3) * 237
        sheet.paste(frame, (x, y))
        draw.text((x + 6, y + 226), f"{TIMES[index]:.1f}s", fill=(25, 39, 58))
    sheet.save(REVIEW / "decoded-samples.png")
    record = {
        "inspectionInvocation": "python3 artifacts/catalog-demos/standard-components-guide-retention-details-20261110/inspect_demo_video.py",
        "video": VIDEO.name,
        "ffprobe": metadata,
        "sampleSeconds": TIMES,
        "samples": [f"video-review/sample-{index:02d}.png" for index in range(1, len(TIMES) + 1)],
        "contactSheet": "video-review/decoded-samples.png",
        "reviewStatus": "decoded; visual inspection required before handoff",
    }
    (OUT / "video-inspection.json").write_text(f"{json.dumps(record, indent=2)}\n", encoding="utf-8")
    print(json.dumps({"duration": metadata.get("format", {}).get("duration"), "size": metadata.get("format", {}).get("size"), "samples": len(samples)}, indent=2))


if __name__ == "__main__":
    main()
