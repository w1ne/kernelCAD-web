#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Build docs/demos/standard-parts/flange-demo.mp4: an annotated still sequence
# from the local `kernelcad render --preset publish` outputs of the committed
# bolted-flange example. Not a screen recording. Run from this directory:
#   python3 make-flange-video.py
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
FRAME_DIR = HERE / "flange-frames"
OUT = HERE / "flange-demo.mp4"
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
                "A bolted flange from eight holes",
                "lib.insert \u00b7 local renders of the committed example",
                "Envelope solids; the seat is cut to the fastener family.",
            ),
            4.0,
            "title card",
        ),
        (
            slide(
                "Eight bores, eight stacks",
                "",
                "\u00d86.6 on an 85 mm bolt circle sizes to M6 normal (ISO 273): grip 10 + washer 1.6 + nut 5 \u2192 M6 \u00d7 18.",
                HERE / "flange.hero.png",
            ),
            5.0,
            "flange.hero.png",
        ),
        (
            slide(
                "The seat follows the family",
                "",
                "Flat heads cut a 90\u00b0 countersink to the ISO 10642 head and seat flush; washer and nut land on the back.",
                HERE / "flange-detail.png",
            ),
            5.0,
            "flange-detail.png",
        ),
        (
            slide(
                "Close, normal or loose",
                "M6 clearance \u00b7 6.4 close \u00b7 6.6 normal \u00b7 7.0 loose",
                "ISO 273 fits: a bore at any of the three sizes finds its thread, and reports which fit it matched.",
            ),
            5.0,
            "text card",
        ),
        (
            slide(
                "kernelcad.com",
                "Source: examples/parts/bolted-flange.kcad.ts",
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
            "bolted-flange.kcad.ts": sha256(HERE / "../../../examples/parts/bolted-flange.kcad.ts"),
        },
        "inputSha256": {
            name: sha256(HERE / name)
            for name in ("flange.hero.png", "flange-detail.png", "flange-front.pose-0-0.png")
        },
        "invocations": [
            "npx tsx src/agent/cli/index.ts render examples/parts/bolted-flange.kcad.ts --preset publish -o docs/demos/standard-parts/flange.hero.png",
            "npx tsx src/agent/cli/index.ts render examples/parts/bolted-flange.kcad.ts --preset publish --width 2048 --height 1536 --pose 0,0 -o docs/demos/standard-parts/flange-front.png",
            "convert flange-front.pose-0-0.png -crop 900x430+660+590 +repage flange-detail.png",
        ],
        "provenance": (
            "Annotated still sequence composed from local kernelcad render --preset publish outputs "
            "of the committed example source. Not a screen recording, turntable, deployed platform "
            "capture, physical hardware or strength test."
        ),
    }
    (HERE / "flange-video-evidence.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps({"ok": True, "video": str(OUT), "durationSec": duration}))


if __name__ == "__main__":
    sys.exit(main())
