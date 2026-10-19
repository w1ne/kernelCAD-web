#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Build docs/demos/hole-driven-insert/demo.mp4: an annotated still sequence
# from the local `kernelcad render --preset publish` outputs of the committed
# example. Not a screen recording. Run from this directory:
#   python3 make-review-video.py
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
FRAME_DIR = HERE / "frames"
OUT = HERE / "demo.mp4"
W, H = 1920, 1080
INK = "#1c2026"
GREY = "#5b636e"
ACCENT = "#2b6cb0"

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]
FONT_BOLD_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]


def first_existing(paths):
    for path in paths:
        if Path(path).exists():
            return path
    raise FileNotFoundError(f"no usable font in {paths}")


FONT = lambda size: ImageFont.truetype(first_existing(FONT_CANDIDATES), size)
FONT_B = lambda size: ImageFont.truetype(first_existing(FONT_BOLD_CANDIDATES), size)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def autocrop(image, margin=36):
    background = Image.new("RGB", image.size, "#ffffff")
    diff = ImageChops.difference(image, background).convert("L")
    box = diff.point(lambda v: 255 if v > 8 else 0).getbbox()
    if box is None:
        return image
    return image.crop(
        (
            max(0, box[0] - margin),
            max(0, box[1] - margin),
            min(image.width, box[2] + margin),
            min(image.height, box[3] + margin),
        )
    )


def slide(title, body, footer, image_path=None):
    canvas = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(canvas)
    draw.text((120, 84), title, font=FONT_B(56), fill=INK)
    y = 178
    if image_path is not None:
        image = autocrop(Image.open(image_path).convert("RGB"))
        box = (120, y, W - 120, H - 270)
        image.thumbnail((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
        canvas.paste(image, (box[0] + (box[2] - box[0] - image.width) // 2, box[1] + 24))
    else:
        draw.text((120, y + 40), body, font=FONT(40), fill=ACCENT)
        body = ""
    if body:
        draw.text((120, H - 236), body, font=FONT(34), fill=INK)
    draw.text((120, H - 150), footer, font=FONT(24), fill=GREY)
    return canvas


def main():
    FRAME_DIR.mkdir(exist_ok=True)
    slides = [
        (
            slide(
                "Fasteners from the holes",
                "lib.insert \u00b7 local renders of the committed example",
                "Envelope solids; the seat is cut to the fastener family.",
            ),
            4.0,
            "title card",
        ),
        (
            slide(
                "Six holes, six fasteners",
                "",
                "\u00d85.5 bores size to M5, \u00d83.4 to M3 (ISO 273 normal clearance). Thread, length and placement come from the hole.",
                HERE / "insert.hero.png",
            ),
            5.0,
            "insert.hero.png",
        ),
        (
            slide(
                "The seat follows the family",
                "",
                "Flat heads cut a 90\u00b0 countersink to the head diameter and seat flush; socket heads cut nothing here.",
                HERE / "insert-detail.png",
            ),
            5.0,
            "insert-detail.png",
        ),
        (
            slide(
                "Nuts and washers land on the back",
                "",
                "Bolt mode adds a washer under and a washer plus hex nut on the far side, positioned along the detected axis.",
                HERE / "insert-front.pose-0-0.png",
            ),
            5.0,
            "insert-front.pose-0-0.png",
        ),
        (
            slide(
                "kernelcad.com",
                "Source: examples/parts/hole-driven-insert.kcad.ts",
                "Local deterministic renders of the committed source. Not a platform capture or hardware test.",
            ),
            4.0,
            "end card",
        ),
    ]

    frame_paths = []
    for index, (canvas, _seconds, _label) in enumerate(slides):
        path = FRAME_DIR / f"{index:02d}.png"
        canvas.save(path)
        frame_paths.append(path)

    list_path = FRAME_DIR / "slides.txt"
    lines = []
    for index, (_canvas, seconds, _label) in enumerate(slides):
        lines.append(f"file '{frame_paths[index].name}'")
        lines.append(f"duration {seconds}")
    lines.append(f"file '{frame_paths[-1].name}'")
    list_path.write_text("\n".join(lines) + "\n")

    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", str(list_path),
            "-vf", "fps=24,format=yuv420p",
            "-c:v", "libx264", "-crf", "18", "-movflags", "+faststart",
            str(OUT),
        ],
        check=True,
    )

    duration = sum(seconds for _canvas, seconds, _label in slides)
    evidence = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "video": OUT.name,
        "videoSha256": sha256(OUT),
        "durationSec": duration,
        "canvas": f"{W}x{H}",
        "slides": [
            {"image": label if label.endswith(".png") else None, "durationSec": seconds}
            for _canvas, seconds, label in slides
        ],
        "sourceModels": {
            "hole-driven-insert.kcad.ts": sha256(HERE / "../../../examples/parts/hole-driven-insert.kcad.ts"),
        },
        "inputSha256": {
            name: sha256(HERE / name)
            for name in ("insert.hero.png", "insert-detail.png", "insert-front.pose-0-0.png")
        },
        "invocations": [
            "npx tsx src/agent/cli/index.ts render examples/parts/hole-driven-insert.kcad.ts --preset publish -o docs/demos/hole-driven-insert/insert.hero.png",
            "npx tsx src/agent/cli/index.ts render examples/parts/hole-driven-insert.kcad.ts --preset publish --width 2048 --height 1536 --pose 0,0 -o docs/demos/hole-driven-insert/insert-front.png",
            "convert insert.hero.png -crop 760x700+540+260 +repage insert-detail.png",
        ],
        "provenance": (
            "Annotated still sequence composed from local kernelcad render --preset publish outputs "
            "of the committed example source. Not a screen recording, turntable, deployed platform "
            "capture, physical hardware or strength test."
        ),
    }
    (HERE / "video-evidence.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps({"ok": True, "video": str(OUT), "durationSec": duration}))


if __name__ == "__main__":
    sys.exit(main())
