#!/usr/bin/env python3
"""Decode and inspect representative frames from the generated MP4."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "air-compressor-demo.mp4"
REVIEW = BUNDLE / "video-review"
TIMES = [1.5, 4.5, 7.5, 10.5, 13.5]


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    probe = json.loads(subprocess.run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO),
    ], check=True, capture_output=True, text=True).stdout)
    video_stream = next(stream for stream in probe["streams"] if stream["codec_type"] == "video")
    decoded = []
    for index, timestamp in enumerate(TIMES, 1):
        frame_path = REVIEW / f"decoded-{index:02d}.png"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timestamp),
            "-i", str(VIDEO), "-frames:v", "1", str(frame_path),
        ], check=True)
        decoded.append(frame_path)

    thumb_w, thumb_h = 384, 216
    sheet = Image.new("RGB", (thumb_w * 3, (thumb_h + 28) * 2), "#101923")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    for index, frame_path in enumerate(decoded):
        thumb = Image.open(frame_path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = (index % 3) * thumb_w
        y = (index // 3) * (thumb_h + 28)
        sheet.paste(thumb, (x, y))
        draw.text((x + 10, y + thumb_h + 5), f"Frame {index + 1} · {TIMES[index]:.1f}s", fill="#eef3f5", font=font)
    contact = REVIEW / "contact-sheet.png"
    sheet.save(contact, optimize=True)
    report = {
        "video": str(VIDEO.relative_to(BUNDLE)),
        "codec": video_stream["codec_name"],
        "width": int(video_stream["width"]),
        "height": int(video_stream["height"]),
        "durationSeconds": float(probe["format"]["duration"]),
        "sampleTimesSeconds": TIMES,
        "decodedFrames": [str(path.relative_to(BUNDLE)) for path in decoded],
        "contactSheet": str(contact.relative_to(BUNDLE)),
        "visualInspection": "Decoded all five sampled frames; see contact sheet. Each scene shows local geometry or a local verification summary.",
    }
    if report["width"] != 1280 or report["height"] != 720 or report["durationSeconds"] < 14:
        raise SystemExit(f"unexpected demo video format: {report}")
    (REVIEW / "inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
