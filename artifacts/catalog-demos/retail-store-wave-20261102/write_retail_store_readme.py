#!/usr/bin/env python3
"""Write the public kit README from the generated index and audit evidence."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
checks = json.loads((BUNDLE / 'asset-check-results.json').read_text())
assets = [asset for asset in index['assets'] if asset['kit'] == 'retail-store']
if len(assets) != 48 or checks['passed'] != 48 or checks['total'] != 48 or not checks['integration']['passed']:
    raise SystemExit('README requires the complete passing 48-asset local catalog audit')
rows = [
    '| `{id}` | {title} | {description} | scale · color | {triangles} |'.format(
        id=asset['id'], title=asset['title'], description=asset['description'].replace('|', '\\|'),
        triangles=asset['stats']['triangles'],
    )
    for asset in assets
]
readme = f'''# Retail store kit

Forty-eight original low-poly fixtures and service props cover checkout and payment, shelving, chilled displays, shopping, stock handling and customer-service areas. Sources use millimetres, Z up, a floor origin at z = 0 and editable `scale` and `color` controls. The audited exports range from {checks['triangleRange'][0]} to {checks['triangleRange'][1]} triangles, remain within each asset's budget and use one material per mesh.

The [retail-store wave demo bundle](../../../artifacts/catalog-demos/retail-store-wave-20261102/README.md) retains the generator, local audit evidence, rendered previews, static-page check, capture settings and visually inspected MP4. The local page builder produced one page per asset. On 2026-11-02 the public `/catalog/` route returned HTTP 404, so deployed behavior remains unverified for this branch.

| id | asset | description | knobs | triangles |
| --- | --- | --- | --- | ---: |
{chr(10).join(rows)}

## Rebuild and verify

```sh
python3 artifacts/catalog-demos/retail-store-wave-20261102/generate_retail_store_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/retail-store-wave-20261102/render_retail_store_previews.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-retail-store-pages
python3 artifacts/catalog-demos/retail-store-wave-20261102/verify_retail_store_pages.py /tmp/kernelcad-retail-store-pages
```

## Licence and scope

Every asset is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is authored from kernelCAD primitives. These are stylized scene props; they do not claim commercial-store dimensions, accessibility compliance, operating performance or physical acceptance.
'''
(ROOT / 'catalog' / 'kits' / 'retail-store' / 'README.md').write_text(readme)
print(f'wrote retail-store README for {len(assets)} audited assets')
