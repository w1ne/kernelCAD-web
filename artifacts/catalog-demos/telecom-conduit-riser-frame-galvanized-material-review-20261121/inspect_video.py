#!/usr/bin/env python3
"""Probe the MP4 and build a contact sheet from evenly spaced sample frames."""

from pathlib import Path
import json
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / "review-demo.mp4"
FRAME_DIR = ROOT / "video-review"
FRAME_DIR.mkdir(exist_ok=True)

probe = subprocess.run(
    [
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO),
    ],
    check=True,
    capture_output=True,
    text=True,
)
metadata = json.loads(probe.stdout)
(FRAME_DIR / "ffprobe.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
duration = float(metadata["format"]["duration"])
times = [2.0, 6.0, 10.0, min(14.0, max(0.0, duration - 0.5))]
frames = []
for index, seconds in enumerate(times, start=1):
    frame = FRAME_DIR / f"frame-{index:02d}.png"
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-ss", str(seconds), "-i", str(VIDEO),
            "-frames:v", "1", str(frame),
        ],
        check=True,
        capture_output=True,
    )
    frames.append((seconds, frame))

sheet = Image.new("RGB", (1280, 760), "#e8edf0")
draw = ImageDraw.Draw(sheet)
label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
for index, (seconds, frame_path) in enumerate(frames):
    image = Image.open(frame_path).convert("RGB")
    image = ImageOps.fit(image, (620, 350), Image.Resampling.LANCZOS)
    x = 14 + (index % 2) * 630
    y = 14 + (index // 2) * 374
    sheet.paste(image, (x, y))
    draw.text((x + 8, y + 352), f"{seconds:.1f} s", fill="#1b2a36", font=label_font)
sheet.save(FRAME_DIR / "contact-sheet.png")

video_stream = next(stream for stream in metadata["streams"] if stream["codec_type"] == "video")
if video_stream["width"] != 1280 or video_stream["height"] != 720:
    raise SystemExit(f"unexpected video dimensions: {video_stream['width']}x{video_stream['height']}")
if duration < 12 or duration > 22:
    raise SystemExit(f"unexpected duration: {duration:.2f}s")

print(json.dumps({"durationSeconds": duration, "width": video_stream["width"], "height": video_stream["height"], "sampleTimesSeconds": times}, indent=2))
