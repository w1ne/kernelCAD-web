#!/usr/bin/env python3
"""Render demo.mp4 from verification/measurements.json and inspect the encoded video.

  python3 docs/demos/point-inside-face-plane-parity-20261119/make_demo.py
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "verification"
VIDEO = HERE / "demo.mp4"
W, H, FPS, SLIDE_SECONDS = 1280, 720, 24, 5
BG, INK, MUTED, GREEN, AMBER, RED = "#101820", "#edf3f6", "#93a4ad", "#4fd18b", "#f2b544", "#f2695c"


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSansMono" if mono else "DejaVuSans"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}{'-Bold' if bold else ''}.ttf", size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  MESH POINT-IN-SOLID TEST", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(35, True), fill=INK)
    draw.text((72, 154), subtitle, font=font(20), fill=MUTED)
    draw.text((72, 668), "Local measurement in Node. Not a deployed-runtime result.", font=font(16), fill=MUTED)
    return image, draw


def rows(draw: ImageDraw.ImageDraw, items: list[tuple[str, str, str]], y: int = 250, step: int = 96) -> None:
    for label, value, colour in items:
        draw.text((112, y), label, font=font(19), fill=MUTED)
        draw.text((112, y + 30), value, font=font(24, True, mono=True), fill=colour)
        y += step


def slides(m: dict) -> list[Image.Image]:
    junction, ball, rail, klift = m["junction"], m["sphereLattice"], m["railOnDeck"], m["klift"]
    verdict = lambda rows: ", ".join("inside" if r["inside"] else "outside" for r in rows)
    out = []
    image, draw = slide("A point where a post meets a slab", "The point is inside the solid and in the plane of the slab top")
    rows(draw, [
        ("Solid", junction["solid"], INK),
        ("3 junction points, before", verdict(junction["before"]), RED),
        ("3 junction points, after", verdict(junction["after"]), GREEN),
    ])
    out.append(image)
    image, draw = slide("Lattice points in a sphere mesh", f"{ball['mesh']}; {ball['lattice']}; exact answer from the distance to the centre")
    rows(draw, [
        ("Wrong answers before", f"{ball['before']['wrong']} of {ball['before']['compared']:,} points", RED),
        ("Wrong answers after", f"{ball['after']['wrong']} of {ball['after']['compared']:,} points", GREEN),
        ("Time for all points, best of 3", f"{ball['before']['bestOf3Ms']} ms before, {ball['after']['bestOf3Ms']} ms after", INK),
    ])
    out.append(image)
    image, draw = slide("Effect on the joint check", "A slide connector at the base of a rail that is one solid with its deck")
    rows(draw, [
        ("Rail on a deck, before", rail["before"], RED),
        ("Rail on a deck, after", rail["after"], GREEN),
        ("K-Lift gallery example, evaluate_script diagnostics", f"{klift['diagnosticsBefore']} before, {klift['diagnosticsAfter']} after; the other {klift['diagnosticsAfter']} are real defects", AMBER),
    ])
    out.append(image)
    return out


def inspect() -> dict:
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(VIDEO),
    ], text=True))
    stream = next(item for item in probe["streams"] if item.get("codec_type") == "video")
    samples = [2, 7, 12]
    thumbs: list[Image.Image] = []
    with tempfile.TemporaryDirectory(prefix="point-inside-parity-") as tmp:
        for second in samples:
            path = Path(tmp) / f"frame-{second}.png"
            subprocess.run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(second),
                "-i", str(VIDEO), "-frames:v", "1", "-update", "1", str(path),
            ], check=True)
            frame = Image.open(path).convert("RGB")
            frame.thumbnail((400, 225))
            thumbs.append(frame.copy())
    sheet = Image.new("RGB", (1240, 280), BG)
    draw = ImageDraw.Draw(sheet)
    for i, (second, thumb) in enumerate(zip(samples, thumbs, strict=True)):
        sheet.paste(thumb, (20 + i * 410, 20))
        draw.text((20 + i * 410, 250), f"sample at {second}s", font=font(14), fill=INK)
    sheet.save(OUT / "video-contact-sheet.png")
    return {
        "video": "demo.mp4",
        "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
        "bytes": VIDEO.stat().st_size,
        "durationSeconds": float(probe["format"]["duration"]),
        "codec": stream["codec_name"],
        "width": stream["width"],
        "height": stream["height"],
        "frameRate": stream["r_frame_rate"],
        "sampleSeconds": samples,
        "contactSheet": "video-contact-sheet.png",
    }


def main() -> None:
    measurements = json.loads((OUT / "measurements.json").read_text())
    with tempfile.TemporaryDirectory(prefix="point-inside-parity-") as tmp:
        for i, image in enumerate(slides(measurements)):
            image.save(Path(tmp) / f"slide-{i + 1:02d}.png")
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", f"1/{SLIDE_SECONDS}", "-i", str(Path(tmp) / "slide-%02d.png"),
            "-vf", f"fps={FPS},format=yuv420p", "-c:v", "libx264", "-movflags", "+faststart", str(VIDEO),
        ], check=True)
    report = inspect()
    (OUT / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
