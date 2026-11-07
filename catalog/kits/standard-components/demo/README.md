# Standard Components workflow demo

`workflow.mp4` records the local catalog workflow for the original
`angle-bracket` source: edit the `.kcad.ts` model and its model-size/finish
knobs, run per-asset validation, and inspect the generated low-poly preview.
The remaining cards show representative fittings, motion parts and mounting
hardware from the same 50-asset kit.

## Reproduce

Run from the repository root:

```sh
bash catalog/kits/standard-components/demo/validate-assets.sh
npm run catalog:build
npm run catalog:previews
npm run catalog:pages
npx vitest run tests/integration/catalog/catalogIndex.test.ts
python3 catalog/kits/standard-components/demo/check-static-pages.py
bash catalog/kits/standard-components/demo/make-demo.sh
```

The source is [`angle-bracket.kcad.ts`](../angle-bracket.kcad.ts). Shared
settings and the exact loop invocation are in [`settings.json`](settings.json)
and [`validate-assets.sh`](validate-assets.sh). The per-asset output is in
[`asset-checks.log`](asset-checks.log); catalog build and preview commands are
recorded in [`catalog-build.log`](catalog-build.log) and
[`catalog-previews.log`](catalog-previews.log). The integration-gate output is
in [`integration-gate.log`](integration-gate.log); generated-page checks are
in [`catalog-pages-check.log`](catalog-pages-check.log).

## Claim boundaries

The recorded checks cover local source evaluation, triangle/material/origin
metadata, generated catalog output, and locally generated catalog pages. They
do not establish deployed website behavior or physical hardware acceptance.
The public page check follows PR merge and deployment; no physical part was
built or accepted for this demo.

All asset shapes are original parametric kernelCAD source. The video shows the
native catalog workflow and generated previews.
