#!/usr/bin/env python3
"""Build a short MP4 from retained catalog and focused-render evidence."""

from __future__ import annotations

import base64
import json
import subprocess
from pathlib import Path
from xml.sax.saxutils import escape


BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
FRAMES = BUNDLE / "verification/frames"
WIDTH, HEIGHT = 1280, 720
FPS, SECONDS = 12, 3
BG = "#edf2f6"
INK = "#1f3548"
MUTED = "#496273"
ACCENT = "#287e79"
ASSETS = [
    "articulated-dump-truck",
    "asphalt-transfer-conveyor",
    "ride-on-concrete-saw",
    "road-reclaimer",
    "water-tanker-truck",
]
LABELS = {
    "articulated-dump-truck": "Articulated dump truck",
    "asphalt-transfer-conveyor": "Asphalt transfer conveyor",
    "ride-on-concrete-saw": "Ride-on concrete saw",
    "road-reclaimer": "Road reclaimer",
    "water-tanker-truck": "Water tanker truck",
}


def svg_header(title: str, kicker: str) -> list[str]:
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">',
        f'<rect width="{WIDTH}" height="{HEIGHT}" fill="{BG}"/>',
        f'<text x="54" y="49" font-family="DejaVu Sans" font-size="17" font-weight="700" letter-spacing="1.2" fill="{ACCENT}">{escape(kicker.upper())}</text>',
        f'<text x="54" y="91" font-family="DejaVu Sans" font-size="34" font-weight="700" fill="{INK}">{escape(title)}</text>',
        f'<path d="M54 112 H1226" stroke="#b7c7d1" stroke-width="2"/>',
        f'<text x="54" y="692" font-family="DejaVu Sans" font-size="16" fill="{MUTED}">Local software preview and source regression · no deployment or hardware acceptance</text>',
    ]


def wrapped(text: str, max_chars: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def add_text(lines: list[str], text: str, x: int, y: int, width: int, size: int = 24, color: str = INK, bold: bool = False) -> int:
    chars = max(12, int(width / (size * 0.56)))
    weight = ' font-weight="700"' if bold else ""
    for line in wrapped(text, chars):
        lines.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans" font-size="{size}"{weight} fill="{color}">{escape(line)}</text>')
        y += size + 9
    return y


def image_data(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def add_image(lines: list[str], path: Path, x: int, y: int, width: int, height: int) -> None:
    href = image_data(path)
    lines.append(f'<image href="{href}" x="{x}" y="{y}" width="{width}" height="{height}" preserveAspectRatio="xMidYMid meet"/>')


def add_card(lines: list[str], x: int, y: int, width: int, height: int) -> None:
    lines.append(f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="13" fill="white" stroke="#c8d5dd" stroke-width="2"/>')


def catalog_row(asset_id: str) -> dict[str, object]:
    index = json.loads((ROOT / "catalog/index.json").read_text())
    return next(row for row in index["assets"] if row["kit"] == "construction-equipment" and row["id"] == asset_id)


def make_slides() -> list[list[str]]:
    slides: list[list[str]] = []

    lines = svg_header("Five machine previews, one material correction", "Semantic review · 18 Nov 2026")
    xs = [52, 292, 532, 772, 1012]
    for x, asset_id in zip(xs, ASSETS, strict=True):
        add_card(lines, x, 148, 216, 320)
        add_image(lines, BUNDLE / "samples/previews" / f"{asset_id}.png", x + 8, 157, 200, 252)
        label_lines = wrapped(LABELS[asset_id], 21)[:2]
        for line_no, label in enumerate(label_lines):
            lines.append(f'<text x="{x + 12}" y="{425 + line_no * 23}" font-family="DejaVu Sans" font-size="15" font-weight="700" fill="{INK}">{escape(label)}</text>')
    add_text(lines, "Checked visible features, material roles, labels and indexed envelopes.", 58, 526, 1120, size=23)
    add_text(lines, "Only the road-reclaimer cutter-tooth finish changed in this round.", 58, 570, 1120, size=23)
    lines.append("</svg>")
    slides.append(lines)

    lines = svg_header("The default view hides the cutter teeth", "Road reclaimer · current catalog preview")
    add_card(lines, 46, 136, 630, 512)
    add_image(lines, BUNDLE / "before/road-reclaimer.png", 68, 150, 586, 476)
    row = catalog_row("road-reclaimer")
    size = " × ".join(f"{value:.3f}".rstrip("0").rstrip(".") for value in row["stats"]["sizeM"])
    lines.append(f'<text x="730" y="179" font-family="DejaVu Sans" font-size="18" font-weight="700" fill="{ACCENT}">VISIBLE</text>')
    y = add_text(lines, "Chassis, wheels, canopy, engine cover and milling hood.", 730, 216, 480, size=24)
    lines.append(f'<text x="730" y="{y + 16}" font-family="DejaVu Sans" font-size="18" font-weight="700" fill="{ACCENT}">OCCLUDED</text>')
    y = add_text(lines, "The cutter drum and seven modeled tooth bars sit behind the hood.", 730, y + 52, 480, size=24)
    add_text(lines, f"Indexed envelope: {size} m", 730, y + 20, 480, size=20, bold=True)
    lines.append("</svg>")
    slides.append(lines)

    before = BUNDLE / "verification/render-inspect-before/channels/rgb/iso.png"
    after = BUNDLE / "verification/render-inspect-after/channels/rgb/iso.png"
    lines = svg_header("Use steel for the milling tools", "Focused source render · same view")
    add_card(lines, 40, 142, 588, 502)
    add_card(lines, 652, 142, 588, 502)
    lines.append(f'<text x="68" y="181" font-family="DejaVu Sans" font-size="20" font-weight="700" fill="{INK}">BEFORE · equipment enamel</text>')
    lines.append(f'<text x="680" y="181" font-family="DejaVu Sans" font-size="20" font-weight="700" fill="{INK}">AFTER · structural steel</text>')
    add_image(lines, before, 62, 202, 544, 416)
    add_image(lines, after, 674, 202, 544, 416)
    lines.append("</svg>")
    slides.append(lines)

    summary = json.loads((BUNDLE / "verification/summary.json").read_text())
    lines = svg_header("Material regression and catalog checks", "Local verification")
    add_card(lines, 52, 146, 1176, 484)
    y = 190
    for check in summary["checks"]:
        y = add_text(lines, "• " + check, 88, y, 1080, size=20) + 10
    add_text(lines, "816 triangles unchanged · default preview unchanged because the teeth are occluded", 88, 576, 1080, size=18, color=MUTED, bold=True)
    lines.append("</svg>")
    slides.append(lines)

    lines = svg_header("Recorded separately from this color fix", "Review limits")
    add_card(lines, 52, 146, 1176, 484)
    notes = [
        "The five-preview ledger records weak scale or silhouette details, including the road-reclaimer envelope.",
        "The focused images show a source color mapping and software-rendered geometry; they are not a machine simulation.",
        "The branch is not deployed. No equipment rating, manufacturing suitability or hardware acceptance is claimed.",
    ]
    y = 214
    for note in notes:
        y = add_text(lines, note, 92, y, 1080, size=24) + 36
    lines.append("</svg>")
    slides.append(lines)
    return slides


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    for index, elements in enumerate(make_slides(), start=1):
        svg = FRAMES / f"slide-{index:02d}.svg"
        png = FRAMES / f"slide-{index:02d}.png"
        svg.write_text("\n".join(elements) + "\n")
        with png.open("wb") as output:
            subprocess.run(["rsvg-convert", "--width", str(WIDTH), "--height", str(HEIGHT), str(svg)], check=True, stdout=output)

    command = ["ffmpeg", "-hide_banner", "-loglevel", "warning", "-y"]
    for index in range(1, 6):
        command.extend(["-loop", "1", "-framerate", str(FPS), "-t", str(SECONDS), "-i", str(FRAMES / f"slide-{index:02d}.png")])
    filters = [f"[{i}:v]fps={FPS},format=yuv420p,setpts=PTS-STARTPTS[v{i}]" for i in range(5)]
    filters.append(f"{''.join(f'[v{i}]' for i in range(5))}concat=n=5:v=1:a=0[outv]")
    video = BUNDLE / "construction-road-reclaimer-cutting-tooth-material-review.mp4"
    command.extend([
        "-filter_complex", ";".join(filters), "-map", "[outv]", "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-movflags", "+faststart", str(video),
    ])
    subprocess.run(command, check=True)
    settings = {
        "date": "2026-11-18",
        "scope": "five existing construction-equipment previews and one source-to-preview material correction",
        "assetOrder": ASSETS,
        "canvas": f"{WIDTH}x{HEIGHT}",
        "slideCount": 5,
        "secondsPerSlide": SECONDS,
        "frameRate": FPS,
        "frameCount": len(ASSETS) * SECONDS * FPS,
        "videoCodec": "H.264 / libx264",
        "encoderPreset": "medium",
        "crf": 24,
        "pixelFormat": "yuv420p",
        "faststart": True,
        "invocation": "python3 <bundle>/make_demo.py",
        "svgRasterizer": "rsvg-convert",
        "videoEncoder": "ffmpeg",
        "source": "make_demo.py plus retained source snapshots, catalog previews and focused render-preview PNGs",
        "provenance": "Local software preview, exported-GLB regression and catalog checks only; no simulation, deployment or hardware acceptance.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n")
    print(f"Wrote {video} (5 slides, {5 * SECONDS} seconds)")


if __name__ == "__main__":
    main()
