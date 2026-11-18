#!/usr/bin/env python3
"""Refresh the photo/video kit guide from the promotion's source map."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/photo-video-studio"
readme = KIT / "README.md"
map_data = json.loads((BUNDLE / "material-map.json").read_text(encoding="utf-8"))
text = readme.read_text(encoding="utf-8")

text = text.replace(
    "Forty original low-poly assets for camera, optics, photo lighting, camera support and production scenes. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every asset exposes editable `scale` and `color` controls and exports as one material under its triangle budget. These stylized scene props do not claim optical accuracy, lighting performance, camera operation or hardware acceptance.",
    "Forty original low-poly assets for cameras, optics, photo lighting, camera support and production scenes. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Each asset keeps its editable `scale` control and exposes two to four material-named color controls, plus `studioBlack` and `fieldRental` presets. Separate polymer, rubber, metal, optical glass, fabric and diffuser surfaces make the camera, lens, stand and lighting details visible in the preview. These stylized scene props do not claim optical accuracy, lighting performance, camera operation or hardware acceptance. The [2026-11-06 quality promotion handoff](../../../artifacts/catalog-demos/photo-video-studio-quality-20261106/README.md) records source mapping, previews, checks and an inspected MP4.",
)

mapping = {row["assetId"]: row for row in map_data["assets"]}
rows = text.splitlines()
updated = []
for line in rows:
    if line.startswith("| `") and line.count("|") == 6:
        cells = line.split("|")
        asset_id = cells[1].strip().strip("`")
        if asset_id in mapping:
            materials = list(mapping[asset_id]["materials"])
            cells[4] = " scale · " + " · ".join(materials) + " "
            description = cells[3].strip()
            if " Knobs:" in description:
                description = description.split(" Knobs:", 1)[0]
            controls = ", ".join(materials[:-1]) + (" and " if len(materials) > 1 else "") + materials[-1]
            cells[3] = f" {description} Knobs: scale, {controls}. Presets: studioBlack and fieldRental. "
            line = "|".join(cells)
    updated.append(line)
text = "\n".join(updated) + "\n"

old_section = """## Rebuild and verify

```sh
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/generate_photo_video_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/render_photo_video_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-photo-video-pages
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/record_photo_video_checks.py
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/verify_photo_video_pages.py /tmp/kernelcad-photo-video-pages
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/capture_photo_video_demo.py
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/inspect_photo_video_video.py --manual-inspection-passed
```
"""
new_section = """## Rebuild and verify

The original source wave and the later quality promotion are separate steps.
Recreate the base sources first, then apply the in-place material and preset
promotion. The promotion leaves the 40 asset IDs and their triangle budgets
unchanged.

```sh
python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/generate_photo_video_assets.py
python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/promote_photo_video_quality.py
python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/render_photo_video_previews.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/photo-video-studio/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildAssetCatalog.ts --check
```

The quality-promotion bundle includes the verified local page build, material
mapping, before/after previews, actual preset renders, check outputs and
readable local MP4 demo. A local build does not establish deployed behavior.
"""
if old_section in text:
    text = text.replace(old_section, new_section)
elif new_section not in text:
    raise SystemExit("expected original README rebuild section")
readme.write_text(text, encoding="utf-8")
print("updated photo/video kit README from material-map.json")
