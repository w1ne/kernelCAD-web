#!/usr/bin/env python3
"""Probe the MP4, decode representative frames, and retain a contact sheet."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "archaeology-fieldwork-quality-promotion.mp4"
REVIEW = BUNDLE / "video-review"


def main() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt",
        "-of", "json", str(VIDEO),
    ], text=True))
    stream = next(stream for stream in probe["streams"] if stream.get("codec_name") == "h264")
    decoded = sorted(REVIEW.glob("decoded-*.png"))
    for path in decoded:
        path.unlink()
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
        "-vf", "fps=1/4", "-frames:v", "5", str(REVIEW / "decoded-%02d.png"),
    ], check=True)
    decoded = sorted(REVIEW.glob("decoded-*.png"))
    if len(decoded) != 5:
        raise SystemExit("expected 5 decoded representative frames; got " + str(len(decoded)))
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    cell_w, cell_h, gap = 480, 270, 14
    sheet = Image.new("RGB", (3 * (cell_w + gap) + gap, 2 * (cell_h + 42 + gap) + gap), "#e8edf2")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(decoded):
        frame = Image.open(path).convert("RGB")
        if frame.size != (int(stream["width"]), int(stream["height"])):
            raise SystemExit("unexpected frame dimensions: " + str(frame.size))
        frame.thumbnail((cell_w, cell_h), Image.Resampling.LANCZOS)
        col, row = index % 3, index // 3
        x, y = gap + col * (cell_w + gap), gap + row * (cell_h + 42 + gap)
        sheet.paste(frame, (x, y))
        draw.text((x, y + cell_h + 8), "Decoded sample " + str(index + 1), fill="#273644", font=font)
    contact = REVIEW / "contact-sheet.png"
    sheet.save(contact, optimize=True)
    result = {
        "video": str(VIDEO.relative_to(BUNDLE)),
        "codec": stream["codec_name"],
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "pixelFormat": stream.get("pix_fmt"),
        "frameRate": stream.get("r_frame_rate"),
        "durationSeconds": float(probe["format"]["duration"]),
        "sizeBytes": int(probe["format"]["size"]),
        "decodedFrames": [str(path.relative_to(BUNDLE)) for path in decoded],
        "contactSheet": str(contact.relative_to(BUNDLE)),
        "allFramesDecodeAtExpectedSize": True,
        "manualVisualReview": "pending",
    }
    (BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
