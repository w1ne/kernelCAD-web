# Standard Components quality-promotion demo

`workflow.mp4` follows source-to-preview examples from the 50-asset kit: the
caster and jaw coupling material zones, a handwheel palette, and a polymer cap
seated in its grooved aluminum profile. The final frame shows a panel-clamp
preview beside the local quality and preview/index checks.

## Reproduce

From the repository root:

```sh
bash catalog/kits/standard-components/demo/validate-assets.sh
python3 scripts/checkCatalogQuality.py --kit standard-components
npx eslint catalog/kits/standard-components/
# Copy catalogPreviewInvocation from settings.json and run that exact command.
npx tsx scripts/buildAssetCatalog.ts
npm run catalog:pages
npx vitest run tests/integration/catalog/
python3 catalog/kits/standard-components/demo/check-static-pages.py
bash catalog/kits/standard-components/demo/make-demo.sh
```

The source files remain in `catalog/kits/standard-components/`. The [settings](settings.json),
[asset validation command](validate-assets.sh), [video source](make-demo.sh),
captions, generated previews, and verification logs are retained with this bundle.
The [quality promotion handoff](../QUALITY-PROMOTION.md) links the results and
evidence.

## Claim boundaries

The video shows local `.kcad.ts` authoring, source checks, and generated catalog
previews. Material names label visual color zones; they do not certify physical
properties. This follow-up has not been deployed, and no physical hardware
acceptance was performed.
