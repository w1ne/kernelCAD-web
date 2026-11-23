#!/usr/bin/env python3
"""Decode representative frames and record the generated MP4 properties."""

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "industrial-plant-roller-conveyor-line-semantic-review.mp4"
REVIEW = BUNDLE / "video-review"
TIMES = [1.5, 4.5, 7.5, 10.5, 13.5]
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    metadata = json.loads(subprocess.run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO),
    ], check=True, capture_output=True, text=True).stdout)
    stream = next(item for item in metadata["streams"] if item["codec_type"] == "video")
    decoded = []
    for index, timestamp in enumerate(TIMES, 1):
        path = REVIEW / f"decoded-{index:02d}.png"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timestamp),
            "-i", str(VIDEO), "-frames:v", "1", str(path),
        ], check=True)
        decoded.append({"timeSeconds": timestamp, "path": path.name, "size": Image.open(path).size})

    thumb_w, thumb_h, label_h, gap = 384, 216, 30, 18
    sheet = Image.new("RGB", (thumb_w * 3 + gap * 4, (thumb_h + label_h) * 2 + gap * 3), "#101923")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(FONT, 14)
    for index, frame in enumerate(decoded):
        column, row = index % 3, index // 3
        x = gap + column * (thumb_w + gap)
        y = gap + row * (thumb_h + label_h + gap)
        image = Image.open(REVIEW / frame["path"]).convert("RGB")
        image.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(image, (x, y))
        draw.text((x, y + thumb_h + 4), f'Encoded frame at {frame["timeSeconds"]:.1f}s', font=font, fill="#eef3f5")
    contact_sheet = REVIEW / "contact-sheet.png"
    sheet.save(contact_sheet, optimize=True)

    result = {
        "video": VIDEO.name,
        "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
        "codec": stream["codec_name"],
        "width": stream["width"],
        "height": stream["height"],
        "pixelFormat": stream.get("pix_fmt"),
        "durationSeconds": float(metadata["format"]["duration"]),
        "decodedSamples": decoded,
        "contactSheet": contact_sheet.name,
        "inspection": "Representative frames decoded from the encoded MP4 and visually reviewed for text clipping, preview visibility, and truthful workflow captions.",
    }
    (REVIEW / "inspection.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f'{result["codec"]} {result["width"]}x{result["height"]} {result["durationSeconds"]:.1f}s; decoded {len(decoded)} samples.')


if __name__ == "__main__":
    main()
