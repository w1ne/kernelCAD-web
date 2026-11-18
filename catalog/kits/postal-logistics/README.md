# Postal logistics kit

[Watch the local quality-promotion workflow demo](../../../artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/postal-logistics-quality-promotion.mp4)

The 52 existing source models cover parcel induction, scanning, sortation, mail handling, route preparation, and dispatch. Each keeps its existing ID and editable scale control, uses material-named color controls, and offers `weathered` and `highVisibility` finish presets. Lofted chamfer profiles, round conveyor rollers and handling wheels, and the satchel's tapered body, sloped flap, front straps, and metal buckles improve the silhouettes while retaining the existing asset IDs and scale.

### Crossbelt carrier material update

`crossbelt-sorter-section` separates each molded-polymer carrier from its thin rubber crossbelt surface. The new `beltRubber` control is included in both existing presets; the track layout and overall envelope stay the same. The [five-preview semantic review, before/after renders, GLB regression, regenerated index, and inspected walkthrough](../../../artifacts/catalog-demos/postal-crossbelt-sorter-belt-material-review-20261111/README.md) document this local correction. This is native kernelCAD scene geometry, not a vendor-specific sorter design or operating specification.

The [promotion bundle](../../../artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/README.md) retains the source transformation, exact commands/settings, before/after previews, preset render, generated preview/index and page evidence, lint and integration results, and inspected MP4. These are local rendered visualization assets; no parcel throughput, machinery safety, postal compliance, production engineering suitability, or physical acceptance is claimed.

## Assets

| id | asset | material controls | presets | triangles |
| --- | --- | --- | --- | ---: |
| `automated-label-applicator` | Automated label applicator | `paintedSteel`, `structuralSteel`, `stainlessSteel`, `paper` | `weathered`, `highVisibility` | 844 |
| `barcode-tunnel-scanner` | Barcode tunnel scanner | `paintedSteel`, `structuralSteel`, `stainlessSteel`, `instrumentGlass` | `weathered`, `highVisibility` | 720 |
| `bulk-mail-hamper` | Bulk mail hamper | `paintedSteel`, `timber`, `structuralSteel`, `fabric` | `weathered`, `highVisibility` | 720 |
| `bulk-mail-sack` | Bulk mail sack | `fabric`, `structuralSteel`, `paper` | `weathered`, `highVisibility` | 436 |
| `carrier-caseload-sorter` | Carrier caseload sorter | `paintedSteel`, `structuralSteel` | `weathered`, `highVisibility` | 660 |
| `carrier-route-sequence-rack` | Carrier route sequence rack | `paintedSteel`, `paper` | `weathered`, `highVisibility` | 720 |
| `carrier-satchel` | Carrier satchel | `fabric`, `stainlessSteel`, `polymer` | `weathered`, `highVisibility` | 600 |
| `conveyor-drive-unit` | Conveyor drive unit | `paintedSteel`, `stainlessSteel`, `structuralSteel` | `weathered`, `highVisibility` | 660 |
| `conveyor-guard-section` | Conveyor guard section | `paintedSteel`, `structuralSteel` | `weathered`, `highVisibility` | 660 |
| `conveyor-merge-module` | Conveyor merge module | `paintedSteel`, `stainlessSteel`, `structuralSteel` | `weathered`, `highVisibility` | 768 |
| `conveyor-transfer-bridge` | Conveyor transfer bridge | `paintedSteel`, `structuralSteel`, `stainlessSteel`, `safetyAmber` | `weathered`, `highVisibility` | 724 |
| `crossbelt-sorter-section` | Crossbelt sorter section | `paintedSteel`, `structuralSteel`, `polymer`, `beltRubber`, `stainlessSteel` | `weathered`, `highVisibility` | 960 |
| `delivery-sequence-case` | Delivery sequence case | `paintedSteel`, `polymer` | `weathered`, `highVisibility` | 660 |
| `gravity-roller-conveyor` | Gravity roller conveyor | `paintedSteel`, `stainlessSteel`, `structuralSteel` | `weathered`, `highVisibility` | 816 |
| `handheld-postal-scanner` | Handheld postal scanner | `paintedSteel`, `safetyAmber`, `stainlessSteel`, `instrumentGlass` | `weathered`, `highVisibility` | 540 |
| `high-capacity-mail-cart` | High-capacity mail cart | `paintedSteel`, `rubber`, `structuralSteel`, `safetyAmber` | `weathered`, `highVisibility` | 724 |
| `in-motion-weigh-deck` | In-motion weigh deck | `paintedSteel`, `stainlessSteel`, `structuralSteel`, `instrumentGlass` | `weathered`, `highVisibility` | 724 |
| `mail-tray-dispatch-cart` | Mail tray dispatch cart | `paintedSteel`, `rubber`, `structuralSteel`, `safetyAmber` | `weathered`, `highVisibility` | 724 |
| `mail-tray-stack` | Mail tray stack | `paintedSteel`, `polymer` | `weathered`, `highVisibility` | 480 |
| `mailbag-closing-machine` | Mailbag closing machine | `paintedSteel`, `structuralSteel`, `stainlessSteel`, `fabric` | `weathered`, `highVisibility` | 660 |
| `mailpiece-thickness-gauge` | Mailpiece thickness gauge | `paintedSteel`, `structuralSteel`, `safetyAmber` | `weathered`, `highVisibility` | 540 |
| `mailroom-workbench` | Mailroom workbench | `paintedSteel`, `structuralSteel`, `polymer` | `weathered`, `highVisibility` | 780 |
| `overhead-scan-gantry` | Overhead scan gantry | `paintedSteel`, `structuralSteel`, `instrumentGlass` | `weathered`, `highVisibility` | 720 |
| `package-induction-conveyor` | Package induction conveyor | `paintedSteel`, `structuralSteel`, `stainlessSteel` | `weathered`, `highVisibility` | 800 |
| `parcel-belt-diverter` | Parcel belt diverter | `paintedSteel`, `structuralSteel`, `stainlessSteel` | `weathered`, `highVisibility` | 828 |
| `parcel-dimensioning-arch` | Parcel dimensioning arch | `paintedSteel`, `structuralSteel`, `stainlessSteel` | `weathered`, `highVisibility` | 768 |
| `parcel-overflow-container` | Parcel overflow container | `polymer`, `structuralSteel` | `weathered`, `highVisibility` | 780 |
| `parcel-singulator` | Parcel singulator | `paintedSteel`, `stainlessSteel`, `structuralSteel`, `safetyAmber` | `weathered`, `highVisibility` | 720 |
| `parcel-staging-rack` | Parcel staging rack | `paintedSteel`, `structuralSteel` | `weathered`, `highVisibility` | 780 |
| `parcel-tray-transfer-cart` | Parcel tray transfer cart | `structuralSteel`, `rubber`, `safetyAmber`, `polymer` | `weathered`, `highVisibility` | 724 |
| `parcel-weigh-station` | Parcel weigh station | `paintedSteel`, `structuralSteel`, `stainlessSteel`, `instrumentGlass` | `weathered`, `highVisibility` | 540 |
| `postage-meter-workstation` | Postage meter workstation | `paintedSteel`, `polymer`, `structuralSteel`, `stainlessSteel` | `weathered`, `highVisibility` | 556 |
| `postal-dispatch-cage` | Postal dispatch cage | `timber`, `structuralSteel` | `weathered`, `highVisibility` | 780 |
| `postal-dispatch-seal-station` | Postal dispatch seal station | `paintedSteel`, `structuralSteel`, `stainlessSteel`, `fabric` | `weathered`, `highVisibility` | 660 |
| `postal-label-printer` | Postal label printer | `paintedSteel`, `structuralSteel`, `stainlessSteel`, `polymer` | `weathered`, `highVisibility` | 556 |
| `postal-pallet-roller-deck` | Postal pallet roller deck | `paintedSteel`, `stainlessSteel`, `safetyAmber`, `structuralSteel` | `weathered`, `highVisibility` | 800 |
| `postal-route-marker-board` | Postal route marker board | `polymer`, `structuralSteel`, `paper`, `stainlessSteel` | `weathered`, `highVisibility` | 600 |
| `postal-sack-loader` | Postal sack loader | `paintedSteel`, `stainlessSteel`, `safetyAmber`, `structuralSteel` | `weathered`, `highVisibility` | 724 |
| `postal-sack-rack` | Postal sack rack | `paintedSteel`, `fabric`, `structuralSteel` | `weathered`, `highVisibility` | 840 |
| `postal-sortation-tray-cabinet` | Postal sortation tray cabinet | `structuralSteel`, `stainlessSteel` | `weathered`, `highVisibility` | 780 |
| `powered-roller-conveyor` | Powered roller conveyor | `paintedSteel`, `stainlessSteel`, `structuralSteel` | `weathered`, `highVisibility` | 936 |
| `powered-sack-dumper` | Powered sack dumper | `paintedSteel`, `structuralSteel`, `stainlessSteel` | `weathered`, `highVisibility` | 720 |
| `rolling-postal-container` | Rolling postal container | `structuralSteel`, `rubber` | `weathered`, `highVisibility` | 844 |
| `scanner-sensor-post` | Scanner sensor post | `paintedSteel`, `structuralSteel`, `instrumentGlass` | `weathered`, `highVisibility` | 540 |
| `sliding-shoe-sorter-section` | Sliding shoe sorter section | `paintedSteel`, `safetyAmber`, `structuralSteel`, `stainlessSteel` | `weathered`, `highVisibility` | 780 |
| `sorter-chute-bank` | Sorter chute bank | `paintedSteel`, `structuralSteel`, `paper` | `weathered`, `highVisibility` | 780 |
| `sorter-emergency-stop-pedestal` | Sorter emergency-stop pedestal | `paintedSteel`, `structuralSteel`, `stainlessSteel`, `safetyAmber` | `weathered`, `highVisibility` | 540 |
| `sorter-maintenance-platform` | Sorter maintenance platform | `paintedSteel`, `structuralSteel` | `weathered`, `highVisibility` | 840 |
| `sorting-operator-console` | Sorting operator console | `paintedSteel`, `instrumentGlass`, `structuralSteel` | `weathered`, `highVisibility` | 720 |
| `spiral-parcel-chute` | Spiral parcel chute | `paintedSteel`, `structuralSteel` | `weathered`, `highVisibility` | 660 |
| `telescopic-parcel-conveyor` | Telescopic parcel conveyor | `paintedSteel`, `structuralSteel`, `rubber` | `weathered`, `highVisibility` | 600 |
| `tray-induction-loader` | Tray induction loader | `paintedSteel`, `stainlessSteel`, `polymer`, `structuralSteel` | `weathered`, `highVisibility` | 660 |

## Quality progress

Before this round: 1,400/2,390 pass (59%), 990 thin (41%). After: 1,452/2,390 pass (61%), 938 thin (39%). This round promoted 52 existing assets to pass; it added no IDs.

## Rebuild and verify

Run from the repository root:

```sh
# The promotion generator was run once against baselineCommit in settings.json; these source outputs are already present.
mapfile -t asset_ids < artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/preview-asset-ids.txt
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit postal-logistics
npx eslint catalog/kits/postal-logistics/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-postal-logistics-quality-promotion-20261105
python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/verify_postal_pages.py /tmp/kernelcad-postal-logistics-quality-promotion-20261105
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/record_postal_audit.py
npx tsx artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/render_postal_variant.ts
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/write_postal_readme.py
python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/capture_postal_demo.py
python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/inspect_postal_video.py
```
