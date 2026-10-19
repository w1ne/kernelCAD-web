#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Build docs/demos/standard-parts/demo.mp4: an annotated still sequence from
# the local `kernelcad render --preset publish` outputs of the two committed
# examples. Not a screen recording. Run from this directory:
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
    """Trim the white page around the model; the render itself is kept."""
    background = Image.new("RGB", image.size, "#ffffff")
    diff = ImageChops.difference(image, background).convert("L")
    box = diff.point(lambda v: 255 if v > 8 else 0).getbbox()
    if box is None:
        return image
    left = max(0, box[0] - margin)
    top = max(0, box[1] - margin)
    right = min(image.width, box[2] + margin)
    bottom = min(image.height, box[3] + margin)
    return image.crop((left, top, right, bottom))


def slide(title, body, footer, image_path=None, image_crop=None):
    """One annotated still on a light canvas."""
    canvas = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(canvas)
    draw.text((120, 84), title, font=FONT_B(56), fill=INK)
    y = 178

    if image_path is not None:
        image = Image.open(image_path).convert("RGB")
        if image_crop is not None:
            image = image.crop(image_crop)
        image = autocrop(image)
        box = (120, y, W - 120, H - 270)
        image.thumbnail((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
        canvas.paste(
            image,
            (box[0] + (box[2] - box[0] - image.width) // 2, box[1] + 24),
        )
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
                "Standard fasteners, scripted",
                "lib.part and lib.stack \u00b7 local renders of the committed examples",
                "Envelope solids: head plus shank. No helical thread.",
            ),
            4.0,
            "title card",
        ),
        (
            slide(
                "Seven families from one table",
                "",
                "ISO 4762, ISO 7380, ISO 10642 screws \u00b7 ISO 4032, DIN 985 nuts \u00b7 ISO 7089, DIN 127B washers. M2\u2013M6.",
                HERE / "lineup.hero.png",
            ),
            5.0,
            "lineup.hero.png",
        ),
        (
            slide(
                "A bolt stack in one call",
                "lib.stack({ thread: 'M5', gripMm: 12, mode: 'bolt' })",
                "Screw, washer under the head, washer and hex nut on the back. M5 \u00d7 18 is the next stocked length at or above 17 mm.",
                HERE / "stack.hero.png",
            ),
            5.0,
            "stack.hero.png",
        ),
        (
            slide(
                "Placement comes with the stack",
                "",
                "Head washer on the grip's top face; tail washer and nut under it. Cropped from the front-elevation render.",
                HERE / "stack-detail.png",
            ),
            5.0,
            "stack-detail.png",
        ),
        (
            slide(
                "kernelcad.com",
                "Source: examples/parts/bolt-stack.kcad.ts and examples/parts/fastener-lineup.kcad.ts",
                "Local deterministic renders of the committed sources. Not a platform capture or hardware test.",
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
            {
                "image": label if label != "title card" and label != "end card" else None,
                "durationSec": seconds,
            }
            for _canvas, seconds, label in slides
        ],
        "sourceModels": {
            "bolt-stack.kcad.ts": sha256(HERE / "../../../examples/parts/bolt-stack.kcad.ts"),
            "fastener-lineup.kcad.ts": sha256(HERE / "../../../examples/parts/fastener-lineup.kcad.ts"),
        },
        "inputSha256": {
            name: sha256(HERE / name)
            for name in ("lineup.hero.png", "stack.hero.png", "stack-detail.png")
        },
        "invocations": [
            "npx tsx src/agent/cli/index.ts render examples/parts/fastener-lineup.kcad.ts --preset publish -o docs/demos/standard-parts/lineup.hero.png",
            "npx tsx src/agent/cli/index.ts render examples/parts/bolt-stack.kcad.ts --preset publish -o docs/demos/standard-parts/stack.hero.png",
            "npx tsx src/agent/cli/index.ts render examples/parts/bolt-stack.kcad.ts --preset publish --width 2048 --height 1536 --pose 0,0 -o docs/demos/standard-parts/stack-front.png",
            "convert stack-front.pose-0-0.png -crop 1400x1100+330+210 +repage stack-detail.png",
        ],
        "provenance": (
            "Annotated still sequence composed from local kernelcad render --preset publish outputs "
            "of the committed example sources. Not a screen recording, turntable, deployed platform "
            "capture, physical hardware or strength test."
        ),
    }
    (HERE / "video-evidence.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps({"ok": True, "video": str(OUT), "durationSec": duration}))


if __name__ == "__main__":
    sys.exit(main())
