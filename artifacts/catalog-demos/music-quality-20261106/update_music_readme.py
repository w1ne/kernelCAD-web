#!/usr/bin/env python3
"""Refresh the music kit handoff table from the generated source map and index."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT_README = ROOT / "catalog/kits/music/README.md"
index = json.loads((ROOT / "catalog/index.json").read_text())
records = {asset["id"]: asset for asset in index["assets"] if asset["kit"] == "music"}
mapping = json.loads((BUNDLE / "material-map.json").read_text())
report = json.loads((BUNDLE / "verification.json").read_text())
if len(records) != 40 or len(mapping) != 40:
    raise SystemExit(f"expected 40 music rows, found {len(records)} index records and {len(mapping)} mappings")

readme = KIT_README.read_text()
table_start = readme.index("| id | asset | description | knobs | triangles |")
table_end = readme.index("\n\n## Rebuild and verify", table_start)
table_lines = readme[table_start:table_end].splitlines()
by_id = {row["id"]: row for row in mapping}
updated = []
for line in table_lines:
    if line.startswith("| `"):
        asset_id = line.split("|", 2)[1].strip().strip("`")
        cols = line.split("|")
        if asset_id not in by_id or asset_id not in records:
            raise SystemExit(f"missing music row for {asset_id}")
        knobs = ", ".join(by_id[asset_id]["materials"])
        cols[4] = f" scale · {knobs} · concert / vintage "
        cols[5] = f" {records[asset_id]['stats']['triangles']} "
        line = "|".join(cols)
    elif line.startswith("| id |"):
        line = "| id | asset | description | material knobs and variants | triangles |"
    updated.append(line)
updated = updated[2:]

intro = f"""Forty original low-poly assets for orchestra, band, rehearsal and stage scenes. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every asset exposes editable scale and two to four material-specific colour controls, plus `concert` and `vintage` presets. Guitar and bowed-string bodies use path-extruded outlines; saxophone and tuba bells use flared geometry. These stylized scene props do not claim acoustic, performance or instrument certification.

The [music quality promotion handoff](../../../artifacts/catalog-demos/music-quality-20261106/README.md) records the material mapping, silhouette edits, 40 regenerated previews, index rebuild, checks and inspected MP4. The [music wave bundle](../../../artifacts/catalog-demos/music-wave-20261102/README.md) retains the initial source creation record.

## Quality promotion

- Promoted all 40 existing IDs; added {report['materialControls']} material-named controls and {report['presetEntries']} named preset entries. No assets or kits were added.
- All 40 music assets pass `scripts/checkCatalogQuality.py`; all 40 previews were rendered and indexed with matching source hashes.
- Full catalog quality is **{report['catalogPassing']}/{report['catalogTotal']} passing ({report['catalogPassRate']})**, with {report['catalogThin']} thin assets remaining.
- The branch is not deployed. The handoff covers local source, preview, index, lint, integration and static-page checks only.

| id | asset | description | material knobs and variants | triangles |
| --- | --- | --- | --- | ---: |"""
new_text = "# Music kit\n\n" + intro + "\n" + "\n".join(updated) + "\n\n"

rebuild = """## Rebuild and verify

```sh
# Start from the original 40-asset source wave, then apply the quality promotion.
python3 artifacts/catalog-demos/music-wave-20261102/generate_music_assets.py
python3 artifacts/catalog-demos/music-quality-20261106/promote_music_quality.py
python3 artifacts/catalog-demos/music-quality-20261106/render_music_previews.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/music/
npx vitest run tests/integration/catalog/
```

`promote_music_quality.py` assigns material colours by named instrument part, adds the two appearance presets and improves the outlined bodies, bells and missing instrument details. Re-render the previews and rebuild the generated index in the same source change.

## Licence and provenance

Every asset and any export from it are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is modeled from scratch with kernelCAD primitives. No downloaded models, meshes, textures or palettes are included.
"""
KIT_README.write_text(new_text + rebuild)
print(f"updated {KIT_README}")
