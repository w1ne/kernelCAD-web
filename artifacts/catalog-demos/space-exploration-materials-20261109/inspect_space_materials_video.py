#!/usr/bin/env python3
"""Decode and inspect the generated local MP4 demo."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "space-exploration-materials-refinement.mp4"
REVIEW = BUNDLE / "video-review"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def run_json(args):
    return json.loads(subprocess.check_output(args, text=True))


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    metadata = run_json([
        "ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(VIDEO),
    ])
    stream = next(item for item in metadata["streams"] if item["codec_type"] == "video")
    width, height = int(stream["width"]), int(stream["height"])
    duration = float(metadata["format"]["duration"])
    timestamps = [0.8, 3.8, 6.8, 9.8, 12.8, 15.8, 18.8]
    decoded = []
    for index, timestamp in enumerate(timestamps, 1):
        output = REVIEW / f"decoded-{index:02d}.png"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timestamp),
            "-i", str(VIDEO), "-frames:v", "1", str(output),
        ], check=True)
        decoded.append(output)

    thumb_w, thumb_h, gap, label_h = 480, 270, 16, 28
    sheet = Image.new("RGB", (gap + 2 * (thumb_w + gap), gap + 4 * (thumb_h + label_h + gap)), "#111923")
    draw = ImageDraw.Draw(sheet)
    label_font = ImageFont.truetype(FONT, 13)
    for index, path in enumerate(decoded):
        col, row = index % 2, index // 2
        x = gap + col * (thumb_w + gap)
        y = gap + row * (thumb_h + label_h + gap)
        frame = Image.open(path).convert("RGB")
        frame.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(frame, (x + (thumb_w - frame.width) // 2, y + (thumb_h - frame.height) // 2))
        draw.text((x, y + thumb_h + 4), f"Frame {index + 1} · {timestamps[index]:.1f}s", fill="#eef3f5", font=label_font)
    contact_sheet = REVIEW / "contact-sheet.png"
    sheet.save(contact_sheet, optimize=True)

    result = {
        "video": str(VIDEO.relative_to(BUNDLE)),
        "resolution": f"{width}x{height}",
        "durationSeconds": duration,
        "frameRate": stream.get("r_frame_rate"),
        "codec": stream.get("codec_name"),
        "pixelFormat": stream.get("pix_fmt"),
        "decodedFrames": len(decoded),
        "contactSheet": str(contact_sheet.relative_to(BUNDLE)),
        "visuallyInspected": False,
        "inspectionNotes": "Set visuallyInspected after reviewing the contact sheet and decoded frames.",
    }
    (BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
