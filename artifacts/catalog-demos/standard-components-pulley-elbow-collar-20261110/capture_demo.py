#!/usr/bin/env python3
"""Compose a short review video from checked-in sources and CAD renders."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
FRAMES = OUT / "frames"
PANELS = FRAMES / "panels"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
BG = "#eff3f8"
INK = "#19273a"
ACCENT = "#27657e"
MUTED = "#516276"
WHITE = "#ffffff"
FOOTER = "Local software renders and checks · branch not deployed · no physical acceptance"
W, H = 1280, 720


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def annotate(image: Path, x: int, y: int, text: str, *, size: int = 17, bold: bool = False, color: str = ACCENT) -> None:
    run([
        "convert", str(image), "-font", FONT_BOLD if bold else FONT,
        "-pointsize", str(size), "-fill", color, "-gravity", "northwest",
        "-annotate", f"+{x}+{y}", text, str(image),
    ])


def base_frame(title: str, subtitle: str) -> Path:
    frame = FRAMES / f"{len(list(FRAMES.glob('*.png'))) + 1:02d}.png"
    run([
        "convert", "-size", f"{W}x{H}", f"xc:{BG}",
        "-fill", INK, "-draw", f"rectangle 0,0 {W},92",
        "-font", FONT_BOLD, "-pointsize", "22", "-fill", "#b0cadb",
        "-annotate", "+54+30", "kernelCAD · standard-components",
        "-font", FONT_BOLD, "-pointsize", "30", "-fill", INK,
        "-annotate", "+54+116", title,
        "-font", FONT, "-pointsize", "16", "-fill", MUTED,
        "-annotate", "+56+158", subtitle,
        "-fill", INK, "-draw", f"rectangle 0,{H - 48} {W},{H}",
        "-font", FONT, "-pointsize", "14", "-fill", "#e0e9f1",
        "-annotate", f"+54+{H - 18}", FOOTER,
        str(frame),
    ])
    return frame


def panel(source: Path, label: str, name: str, *, width: int = 350, height: int = 390) -> Path:
    output = PANELS / f"{name}.png"
    image_height = height - 38
    run([
        "convert", str(source), "-thumbnail", f"{width - 12}x{image_height - 8}",
        "-background", WHITE, "-gravity", "center", "-extent", f"{width}x{image_height}",
        "-background", WHITE, "-gravity", "south", "-splice", "0x38",
        "-font", FONT_BOLD, "-pointsize", "16", "-fill", ACCENT,
        "-annotate", "+0+9", label, str(output),
    ])
    return output


def place(frame: Path, image: Path, x: int, y: int) -> None:
    run(["convert", str(frame), str(image), "-geometry", f"+{x}+{y}", "-composite", str(frame)])


def panel_pair(asset: str, label: str) -> Path:
    before = panel(OUT / "before/previews" / f"{asset}-before.png", "BEFORE", f"{asset}-before", width=174, height=208)
    after = panel(ROOT / "catalog/kits/standard-components/previews" / f"{asset}.png", "UPDATED", f"{asset}-after", width=174, height=208)
    output = PANELS / f"{asset}-pair.png"
    run(["montage", str(before), str(after), "-tile", "2x1", "-geometry", "+5+0", "-background", BG, str(output)])
    return output


def source_to_preview() -> None:
    frame = base_frame("Three existing assets, refined in place", "The same IDs now show their object-defining geometry in the default catalog view.")
    entries = [
        ("v-belt-pulley", "V-belt pulley"),
        ("pipe-elbow-90", "90 degree elbow"),
        ("shaft-collar", "Shaft collar"),
    ]
    for index, (asset, title) in enumerate(entries):
        x = 40 + index * 412
        annotate(frame, x + 8, 183, title, size=18, bold=True)
        place(frame, panel_pair(asset, title), x, 212)
    frame.rename(FRAMES / "01-before-after.png")


def pulley_variants() -> None:
    frame = base_frame("Set pulley size and material palette", "The V valleys, keyed bore and locking screw remain part of every generated variant.")
    names = [("pulley-default", "Standard"), ("pulley-large", "Large"), ("pulley-weathered", "Weathered")]
    for index, (variant, label) in enumerate(names):
        place(frame, panel(OUT / "variants" / f"{variant}.png", label, f"pulley-{variant}", height=400), 48 + index * 410, 205)
    frame.rename(FRAMES / "02-pulley-variants.png")


def collar_variants() -> None:
    frame = base_frame("Choose how the collar grips the shaft", "The retention choice changes the source geometry between a clamping gap and a radial screw.")
    names = [
        ("collar-split", "Split clamp"),
        ("collar-set-screw", "Radial set screw"),
        ("collar-large", "Large split clamp"),
    ]
    for index, (variant, label) in enumerate(names):
        place(frame, panel(OUT / "variants" / f"{variant}.png", label, f"collar-{variant}", height=400), 48 + index * 410, 205)
    frame.rename(FRAMES / "03-collar-variants.png")


def elbow_and_checks() -> None:
    frame = base_frame("Review the hollow elbow and local checks", "The steel turn, bronze socket and elastomer seal are separate material controls.")
    place(frame, panel(OUT / "variants/elbow-default.png", "Steel · bronze · elastomer", "elbow-default", width=350, height=390), 42, 220)
    place(frame, panel(OUT / "variants/elbow-brass.png", "Brass preset", "elbow-brass", width=350, height=390), 420, 220)
    lines = [
        "3 existing assets refined",
        "9 source variants rendered",
        "50/50 kit assets pass the quality gate",
        "2,402/2,402 catalog assets pass (100%)",
        "ESLint and catalog integration pass",
        "All 50 kit previews refreshed; index rebuilt",
        "Local branch only; no deployment claim",
    ]
    for index, line in enumerate(lines):
        y = 248 + index * 45
        run(["convert", str(frame), "-fill", WHITE, "-draw", f"roundrectangle 815,{y - 7} 1225,{y + 28} 8,8", str(frame)])
        annotate(frame, 829, y, line, size=14, bold=True)
    frame.rename(FRAMES / "04-elbow-checks.png")


def main() -> None:
    PANELS.mkdir(parents=True, exist_ok=True)
    for stale in FRAMES.glob("*.png"):
        stale.unlink()
    source_to_preview()
    pulley_variants()
    collar_variants()
    elbow_and_checks()
    concat = FRAMES / "concat.txt"
    names = ["01-before-after.png", "02-pulley-variants.png", "03-collar-variants.png", "04-elbow-checks.png"]
    concat.write_text("".join(f"file '{FRAMES / name}'\nduration 3.75\n" for name in names) + f"file '{FRAMES / names[-1]}'\n", encoding="utf-8")
    video = OUT / "standard-components-pulley-elbow-collar.mp4"
    run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat), "-vf", "fps=24,scale=1280:720,format=yuv420p", "-c:v", "libx264",
        "-preset", "medium", "-crf", "20", "-movflags", "+faststart", str(video),
    ])
    settings_hash = hashlib.sha256((OUT / "demo-settings.json").read_bytes()).hexdigest()
    (OUT / "capture-output.txt").write_text(
        "Invocation: PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/standard-components-pulley-elbow-collar-20261110/capture_demo.py\n"
        "Video: ffmpeg concat, 1280x720, 24 fps, H.264, CRF 20, 15-second four-slide source-to-preview review\n"
        f"Settings SHA256: {settings_hash}\n"
        f"Output: {video.relative_to(ROOT)} ({video.stat().st_size} bytes)\n",
        encoding="utf-8",
    )
    print(f"wrote {video} ({video.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
