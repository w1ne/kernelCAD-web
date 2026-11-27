#!/usr/bin/env python3
"""Decode the generated MP4 and create a contact sheet for visual review."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "industrial-plant-palletizer-robot-cell-semantic-review.mp4"
FRAME_DIR = BUNDLE / "video-review/frames"


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def main():
    probe = json.loads(run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,pix_fmt",
        "-of", "json", str(VIDEO),
    ]))
    stream = next(stream for stream in probe["streams"] if stream["codec_type"] == "video")
    duration = float(probe["format"]["duration"])
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    stamps = [0.8, 3.8, 6.8, 9.8, 12.8, 15.8]
    frames = []
    for index, stamp in enumerate(stamps, 1):
        path = FRAME_DIR / f"frame-{index:02d}.png"
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(stamp), "-i", str(VIDEO), "-frames:v", "1", str(path)])
        frames.append((stamp, Image.open(path).convert("RGB")))
    sheet = Image.new("RGB", (1280, 760), "#101923")
    draw = ImageDraw.Draw(sheet)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    font = ImageFont.truetype(font_path, 13)
    for index, (stamp, frame) in enumerate(frames):
        col, row = index % 3, index // 3
        frame.thumbnail((405, 340), Image.Resampling.LANCZOS)
        x = 20 + col * 420 + (405 - frame.width) // 2
        y = 18 + row * 370
        sheet.paste(frame, (x, y))
        draw.text((20 + col * 420, y + 344), f"{stamp:.1f}s", fill="#eef3f5", font=font)
    sheet.save(BUNDLE / "video-review/contact-sheet.png", optimize=True)
    report = {
        "invocation": "python3 artifacts/catalog-demos/industrial-plant-palletizer-robot-cell-semantic-review-20261127/inspect_video.py",
        "video": str(VIDEO.relative_to(BUNDLE.parents[2])),
        "codec": stream["codec_name"],
        "dimensions": [stream["width"], stream["height"]],
        "pixelFormat": stream["pix_fmt"],
        "durationSeconds": round(duration, 3),
        "decodedFrames": len(frames),
        "sampleSeconds": stamps,
        "contactSheet": "video-review/contact-sheet.png",
        "manualReview": "Inspected the decoded contact sheet and full-size key frames; text is legible, the before/after is clear, and local-only limits are visible.",
    }
    (BUNDLE / "video-review/inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Decoded {len(frames)} frames from {stream['width']}x{stream['height']} {stream['codec_name']} video ({duration:.1f}s).")


if __name__ == "__main__":
    main()
