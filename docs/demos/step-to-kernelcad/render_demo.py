#!/usr/bin/env python3
"""Render a short terminal-style demo from retained, real CLI JSON output."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
VERIFY = ROOT / "verification"
WIDTH, HEIGHT = 1920, 1080
FPS, SECONDS_PER_SLIDE = 30, 6
BG = (11, 17, 24)
PANEL = (19, 28, 38)
TEXT = (224, 234, 242)
MUTED = (149, 165, 181)
GREEN = (97, 222, 157)
CYAN = (91, 204, 242)
YELLOW = (255, 202, 98)


def read_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as stream:
        value = json.load(stream)
    if not isinstance(value, dict):
        raise SystemExit(f"Expected a JSON object in {path}")
    return value


def verify_external_assembly(manifest: dict, parts_result: dict) -> dict:
    definitions = {definition["id"]: definition for definition in manifest["definitions"]}
    max_bounds_outside_mm = 0.0
    max_conservative_gap_mm = 0.0
    max_relative_volume_error = 0.0
    for occurrence, part in zip(manifest["occurrences"], parts_result["parts"], strict=True):
        definition = definitions[occurrence["definitionId"]]
        matrix = occurrence["transformMm"]["matrixColumnMajor"]
        corners = [
            [
                matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
                matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
                matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
            ]
            for x in (definition["boundsMm"]["min"][0], definition["boundsMm"]["max"][0])
            for y in (definition["boundsMm"]["min"][1], definition["boundsMm"]["max"][1])
            for z in (definition["boundsMm"]["min"][2], definition["boundsMm"]["max"][2])
        ]
        envelope = {
            "min": [min(corner[axis] for corner in corners) for axis in range(3)],
            "max": [max(corner[axis] for corner in corners) for axis in range(3)],
        }
        for axis in range(3):
            max_bounds_outside_mm = max(
                max_bounds_outside_mm,
                envelope["min"][axis] - part["bbox"]["min"][axis],
                part["bbox"]["max"][axis] - envelope["max"][axis],
                0.0,
            )
            max_conservative_gap_mm = max(
                max_conservative_gap_mm,
                part["bbox"]["min"][axis] - envelope["min"][axis],
                envelope["max"][axis] - part["bbox"]["max"][axis],
                0.0,
            )
        max_relative_volume_error = max(
            max_relative_volume_error,
            abs(definition["volumeMm3"] - part["volumeMm3"]) / definition["volumeMm3"],
        )

    report = {
        "ok": bool(parts_result["ok"])
        and not parts_result["diagnostics"]
        and len(parts_result["parts"]) == len(manifest["occurrences"]),
        "sourceLengthUnits": manifest["sourceLengthUnits"],
        "externalDocumentCount": len(manifest["input"]["dependencies"]),
        "definitionCount": len(manifest["definitions"]),
        "occurrenceCount": len(manifest["occurrences"]),
        "loadedPartCount": len(parts_result["parts"]),
        "maxMeshBoundsOutsideTransformedBrepEnvelopeMm": max_bounds_outside_mm,
        "maxTessellatedBoundsGapInsideConservativeEnvelopeMm": max_conservative_gap_mm,
        "maxRelativeVolumeError": max_relative_volume_error,
        "partsDiagnostics": len(parts_result["diagnostics"]),
        "boundsMethod": "parts reports tessellated mesh bounds; comparison uses transformed corners of each exact local BRep AABB, a conservative world envelope.",
    }
    (VERIFY / "external-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if not report["ok"] or max_bounds_outside_mm > 0.01 or max_relative_volume_error > 1e-9:
        raise SystemExit(f"Multi-file STEP geometry check failed: {json.dumps(report)}")
    return report


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
    return ImageFont.truetype(path, size=size)


def wrap(draw: ImageDraw.ImageDraw, value: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), candidate, font=face)[2] > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def make_slide(title: str, subtitle: str, lines: list[tuple[str, tuple[int, int, int]]], index: int) -> Path:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 13), fill=CYAN)
    draw.text((112, 70), "KernelCAD  /  STEP IMPORT", font=font(26, True), fill=CYAN)
    draw.text((112, 128), title, font=font(47, True), fill=TEXT)
    draw.text((112, 204), subtitle, font=font(25), fill=MUTED)
    draw.rounded_rectangle((88, 286, WIDTH - 88, HEIGHT - 98), radius=20, fill=PANEL, outline=(43, 60, 77), width=2)
    draw.ellipse((125, 323, 147, 345), fill=(255, 100, 102))
    draw.ellipse((161, 323, 183, 345), fill=YELLOW)
    draw.ellipse((197, 323, 219, 345), fill=GREEN)
    draw.text((250, 314), "kernelcad  ·  import workspace", font=font(21), fill=MUTED)
    face = font(26)
    y = 393
    line_height = 42
    max_width = WIDTH - 280
    for value, color in lines:
        for row in wrap(draw, value, face, max_width):
            draw.text((136, y), row, font=face, fill=color)
            y += line_height
        y += 8
    draw.text((WIDTH - 200, HEIGHT - 62), f"{index} / 4", font=font(20), fill=MUTED)
    path = VERIFY / f"frame-{index:02d}.png"
    image.save(path, optimize=True)
    return path


def main() -> None:
    import_result = read_json(VERIFY / "import-cli.json")
    parts_result = read_json(VERIFY / "parts-cli.json")
    manifest = read_json(ROOT / "bundle" / "manifest.json")
    external_import = read_json(VERIFY / "external-import.json")
    external_parts = read_json(VERIFY / "external-parts.json")
    external_manifest = read_json(VERIFY / "external-manifest.json")
    if not import_result.get("ok") or not parts_result.get("ok") or not external_import.get("ok") or not external_parts.get("ok"):
        raise SystemExit("All retained CLI runs must succeed before rendering the demo")
    if len(parts_result.get("parts", [])) != len(manifest.get("occurrences", [])):
        raise SystemExit("CLI part count does not match imported occurrence count")

    bundle = import_result["bundle"]
    definition = manifest["definitions"][0]
    occurrence = manifest["occurrences"][0]
    part = parts_result["parts"][0]
    bounds = definition["boundsMm"]
    size = [round(bounds["max"][i] - bounds["min"][i], 2) for i in range(3)]
    color = occurrence.get("color", {}).get("hex", "inherited from STEP")
    asset_hash = definition["sha256"][:16]

    slide_1 = make_slide(
        "Translate STEP into a native KernelCAD bundle",
        "The import keeps exact OCCT BREP geometry and STEP product metadata.",
        [
            ('$ kernelcad import-step source.step --name "Smoke Box" --out bundle', CYAN),
            (f"✓ {bundle['partAssets']} exact BREP asset  ·  {bundle['definitionCount']} definition  ·  {bundle['occurrenceCount']} occurrence", GREEN),
            (f"✓ Product name: {occurrence['originalName']}", TEXT),
            (f"✓ Source unit: {', '.join(manifest['sourceLengthUnits'])}  →  KernelCAD mm", TEXT),
        ],
        1,
    )
    slide_2 = make_slide(
        "Assembly structure and appearance are retained",
        "manifest.json records source paths, placements, colors, and definition identity.",
        [
            (f"occurrence path  : {' / '.join(occurrence['sourcePath'])}", TEXT),
            (f"effective color  : {color}", YELLOW),
            (f"placement (mm)   : {occurrence['transformMm']['translation']}", TEXT),
            (f"native BREP      : parts/{asset_hash}…", CYAN),
            (f"solid count      : {definition['solidCount']}", TEXT),
        ],
        2,
    )
    slide_3 = make_slide(
        "Evaluate the generated KernelCAD project",
        "The existing parts command reloads the exact BREP asset through lib.fromBREP.",
        [
            ('$ kernelcad parts "bundle/Smoke Box.kcad.ts" --json', CYAN),
            (f"✓ {part['name']}  ·  bbox {size} mm", GREEN),
            (f"✓ Volume {part['volumeMm3']:.3f} mm³  ·  surface {part['surfaceAreaMm2']:.3f} mm²", TEXT),
            (f"✓ Export mesh {part['triangleCount']} triangles  ·  BREP sha256 {asset_hash}…", TEXT),
        ],
        3,
    )

    external_bundle = external_import["bundle"]
    external_dependencies = external_manifest["input"]["dependencies"]
    external_units = ", ".join(external_manifest["sourceLengthUnits"])
    external_check = verify_external_assembly(external_manifest, external_parts)
    if external_check["occurrenceCount"] != external_bundle["occurrenceCount"]:
        raise SystemExit("The multi-file STEP import report does not match its assembly manifest")
    slide_4 = make_slide(
        "Local multi-file STEP assemblies import as one project",
        "The importer resolves nested DOCUMENT_FILE references and tracks every source file hash.",
        [
            ('$ kernelcad import-step s1-c5-214.stp --out bundle', CYAN),
            (f"✓ {len(external_dependencies)} recursive STEP dependencies recorded", GREEN),
            (f"✓ {external_bundle['definitionCount']} BREP definitions  ·  {external_bundle['occurrenceCount']} placed occurrences", TEXT),
            (f"✓ Source units {external_units}  →  canonical KernelCAD mm", TEXT),
            ("✓ Generated assembly reloads with no diagnostics", GREEN),
        ],
        4,
    )

    output = ROOT / "step-to-kernelcad.mp4"
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for frame in (slide_1, slide_2, slide_3, slide_4):
        command.extend(["-loop", "1", "-framerate", str(FPS), "-t", str(SECONDS_PER_SLIDE), "-i", str(frame)])
    command.extend([
        "-filter_complex", "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0,format=yuv420p",
        "-r", str(FPS), "-c:v", "libx264", "-crf", "20", "-preset", "medium",
        "-movflags", "+faststart", str(output),
    ])
    subprocess.run(command, check=True)
    print(output)


if __name__ == "__main__":
    main()
