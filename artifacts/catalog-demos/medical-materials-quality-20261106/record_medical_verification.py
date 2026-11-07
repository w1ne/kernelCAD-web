#!/usr/bin/env python3
"""Record source hashes, local pages, quality and test evidence for this round."""

import hashlib
import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
BASE = "5e4313eed"
OUT = BUNDLE / "verification.json"


def git_text(spec):
    return subprocess.check_output(["git", "show", spec], cwd=ROOT, text=True)


def source_hash(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def main():
    materials = json.loads((BUNDLE / "material-map.json").read_text(encoding="utf-8"))
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    old_index = json.loads(git_text(f"{BASE}:catalog/index.json"))
    old_rows = {(row["kit"], row["id"]): row for row in old_index["assets"]}
    rows = {(row["kit"], row["id"]): row for row in index["assets"]}
    if set(old_rows) != set(rows):
        raise SystemExit("catalog IDs changed in a quality-only round")
    if len(rows) != 2390:
        raise SystemExit(f"expected 2390 catalog rows, found {len(rows)}")

    medical = [row for row in index["assets"] if row["kit"] == "medical"]
    if len(medical) != 40:
        raise SystemExit(f"expected 40 indexed medical assets, found {len(medical)}")
    source_records = []
    for row in medical:
        source = (ROOT / row["source"]).read_text(encoding="utf-8")
        if source_hash(row["source"]) != row["sourceSha256"]:
            raise SystemExit(f"stale index source hash: medical/{row['id']}")
        if not (ROOT / "catalog/kits/medical/previews" / f"{row['id']}.png").is_file():
            raise SystemExit(f"missing preview: medical/{row['id']}")
        if not re.search(r"// .+\nconst ", source):
            raise SystemExit(f"missing object-specific source comment: medical/{row['id']}")
        source_records.append({
            "id": row["id"],
            "sourceSha256": row["sourceSha256"],
            "triangleCount": row["stats"]["triangles"],
            "triangleBudget": row["triangleBudget"],
            "presetNames": sorted((row.get("presets") or {}).keys()),
            "parameterNames": [param["name"] for param in row["params"]],
            "preview": row["preview"],
        })

    previous_generic = 0
    for asset in materials["assets"]:
        old = git_text(f"{BASE}:catalog/kits/medical/{asset['asset']}.kcad.ts")
        previous_generic += len(re.findall(r"param\('(shell|accent)'", old))
    controls = sum(asset["materialCount"] for asset in materials["assets"])
    if previous_generic != 80 or controls != 132:
        raise SystemExit(f"unexpected control totals: {previous_generic} before, {controls} after")

    full_quality = subprocess.check_output(
        ["python3", "scripts/checkCatalogQuality.py"], cwd=ROOT, text=True
    )
    kit_quality = subprocess.check_output(
        ["python3", "scripts/checkCatalogQuality.py", "--kit", "medical"], cwd=ROOT, text=True
    )
    if "2390/2390 assets pass" not in full_quality or "40/40 assets pass" not in kit_quality:
        raise SystemExit("catalog quality gate did not pass")

    pages_root = Path("/tmp/medical-materials-catalog-pages-20261106")
    local_asset_pages = list((pages_root / "catalog").glob("*/*/index.html"))
    if len(local_asset_pages) != 2390 or not (pages_root / "catalog/index.html").is_file():
        raise SystemExit("local catalog output does not contain the hub and 2390 asset pages")
    if (pages_root / "sitemap.xml").exists() or (pages_root / "robots.txt").exists():
        raise SystemExit("catalog page writer unexpectedly emitted site-owned sitemap or robots files")
    page_checks = []
    material_by_id = {asset["asset"]: asset for asset in materials["assets"]}
    for row in medical:
        html_path = pages_root / "catalog" / "medical" / row["id"] / "index.html"
        preview_path = pages_root / "catalog" / "medical" / row["id"] / "preview.png"
        if not html_path.is_file() or not preview_path.is_file():
            raise SystemExit(f"local asset page or preview missing for medical/{row['id']}")
        html = html_path.read_text(encoding="utf-8")
        labels = [material["label"] for material in material_by_id[row["id"]]["materials"]]
        if "<title>" not in html or 'property="og:title"' not in html or '<h1>' not in html:
            raise SystemExit(f"local metadata title or heading missing for medical/{row['id']}")
        if 'rel="canonical"' not in html or 'application/ld+json' not in html:
            raise SystemExit(f"local canonical or JSON-LD missing for medical/{row['id']}")
        if any(label not in html for label in labels):
            raise SystemExit(f"material labels missing from local page for medical/{row['id']}")
        if "clinic" not in html or "emergency" not in html:
            raise SystemExit(f"preset names missing from local page for medical/{row['id']}")
        if hashlib.sha256(preview_path.read_bytes()).digest() != hashlib.sha256(
            (ROOT / "catalog/kits/medical/previews" / f"{row['id']}.png").read_bytes()
        ).digest():
            raise SystemExit(f"local page preview differs from rendered preview for medical/{row['id']}")
        page_checks.append({
            "id": row["id"],
            "path": str(html_path.relative_to(pages_root)),
            "previewCopied": True,
            "materialLabels": labels,
            "presets": ["clinic", "emergency"],
            "hasTitleOgH1CanonicalJsonLd": True,
        })

    integration_text = (BUNDLE / "integration-output.txt").read_text(encoding="utf-8")
    integration_summary = re.search(r"Test Files\s+(\d+) passed[^\n]*\n\s*Tests\s+(\d+) passed", integration_text)
    if integration_summary is None:
        raise SystemExit("final catalog integration output does not show a passing summary")
    variants = json.loads((BUNDLE / "preset-variants.json").read_text(encoding="utf-8"))
    if len(variants["variants"]) != 6:
        raise SystemExit("expected six source-driven preset renders")

    public = json.loads((BUNDLE / "public-site-baseline.json").read_text(encoding="utf-8"))
    report = {
        "date": "2026-11-06",
        "baseCommit": BASE,
        "kit": "medical",
        "existingAssetCount": 40,
        "catalogAssetCount": len(rows),
        "assetIdsAddedRenamedOrDuplicated": 0,
        "materialControls": {
            "genericShellAccentBefore": previous_generic,
            "materialNamedAfter": controls,
            "minimumPerAsset": min(asset["materialCount"] for asset in materials["assets"]),
            "maximumPerAsset": max(asset["materialCount"] for asset in materials["assets"]),
            "averagePerAsset": round(controls / 40, 2),
            "presetEntries": sum(len(row["presets"]) for row in medical),
        },
        "quality": {
            "passing": 2390,
            "total": 2390,
            "passRate": "100.00%",
            "thinAssets": 0,
            "medicalKit": {"passing": 40, "total": 40, "averageColorKnobs": 3.3},
            "gateOutput": full_quality,
            "kitGateOutput": kit_quality,
        },
        "silhouetteDetailsAdded": [
            "Erlenmeyer flask tapered loft, liquid-level panel and graduation marks",
            "Petri dish agar sample and sample-label part",
            "Pulse oximeter interior finger pads",
            "Specimen cup paper identification label",
            "Syringe plunger seal",
        ],
        "medicalAssets": source_records,
        "previewCount": len(list((ROOT / "catalog/kits/medical/previews").glob("*.png"))),
        "localPages": {
            "generatedPages": 2390,
            "verifiedMedicalPages": len(page_checks),
            "siteFiles": "sitemap.xml and robots.txt are site-owned and were not emitted by this static catalog writer; its CLI success line is stale.",
            "pageChecks": page_checks,
        },
        "commands": {
            "previewRender": {
                "exitCode": 0,
                "invocation": "npx tsx scripts/renderCatalogPreviews.ts $(python3 -c 'import json; print(\" \".join(x[\"asset\"] for x in json.load(open(\"artifacts/catalog-demos/medical-materials-quality-20261106/material-map.json\"))[\"assets\"]))')",
                "log": "preview-render-output.txt",
            },
            "catalogBuild": {"exitCode": 0, "invocation": "npx tsx scripts/buildAssetCatalog.ts", "log": "catalog-build-output.txt"},
            "qualityGate": {"exitCode": 0, "log": "catalog-quality-output.txt"},
            "eslint": {"exitCode": 0, "log": "eslint-output.txt"},
            "catalogIntegration": {
                "exitCode": 0,
                "files": int(integration_summary.group(1)),
                "tests": int(integration_summary.group(2)),
                "log": "integration-output.txt",
            },
            "localPages": {
                "exitCode": 0,
                "invocation": "npm run catalog:pages -- /tmp/medical-materials-catalog-pages-20261106",
                "log": "local-pages-output.txt",
                "verifiedOutput": "2390 asset pages + hub; no sitemap.xml or robots.txt",
            },
            "presetVariants": {"exitCode": 0, "count": len(variants["variants"]), "log": "preset-render-output.txt"},
        },
        "initialIntegrationAttempt": {
            "exitCode": 1,
            "log": "integration-output-initial-stale-index.txt",
            "cause": "Erlenmeyer description was corrected after an earlier index build; the source hash mismatch was fixed by rebuilding catalog/index.json before the final passing suite.",
        },
        "publicSiteBaseline": public,
        "deployment": "Branch is not deployed. Local page generation is verified; live catalog routes were 404 at baseline.",
        "acceptanceLimits": "Stylized visualization assets only; no clinical-device accuracy, manufacturing suitability, deployed behavior or physical acceptance is claimed.",
    }
    (BUNDLE / "local-page-check.json").write_text(
        json.dumps({
            "generatedFrom": str(pages_root),
            "pageCount": 2390,
            "medicalPageCount": len(page_checks),
            "siteFiles": "sitemap.xml and robots.txt are site-owned and were not emitted by this static catalog writer; its CLI success line is stale.",
            "checks": ["title", "Open Graph title", "h1", "canonical", "JSON-LD", "material labels", "clinic/emergency preset labels", "copied preview hashes"],
            "assets": page_checks,
            "deployment": "Local static output only; public route baseline is in public-site-baseline.json.",
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    (BUNDLE / "check-results.json").write_text(
        json.dumps({
            "commands": report["commands"],
            "initialIntegrationAttempt": report["initialIntegrationAttempt"],
            "lintSummary": "npx eslint catalog/kits/medical/ passed",
            "localPagesSummary": "2390 asset pages + hub; no sitemap or robots file emitted",
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"recorded {len(medical)} medical source hashes, pages, presets and catalog checks")
    print("catalog quality: 2390/2390 (100.00%); medical material controls: 80 -> 132")


if __name__ == "__main__":
    main()
