#!/usr/bin/env python3
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
out = Path(sys.argv[1]).resolve()
idx=json.loads((ROOT/'catalog/index.json').read_text())
rows=[a for a in idx['assets'] if a['kit']=='space-exploration']
missing=[]
for a in rows:
    base=out/'catalog'/a['kit']/a['id']
    for p in (base/'index.html',base/'preview.png'):
        if not p.is_file(): missing.append(str(p))
    if (base/'index.html').is_file():
        html=(base/'index.html').read_text()
        for token in (a['title'],*(p['name'] for p in a['params'])):
            if token not in html: missing.append(f'{base}: missing {token}')
hub=out/'catalog/index.html'
if not hub.is_file() or 'space-exploration' not in hub.read_text(): missing.append('hub does not list space-exploration')
result={'command':'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-space-pages','kitPages':len(rows),'assetsInIndex':len(idx['assets']),'pageAndPreviewPairs':len(rows)-sum(1 for x in missing if x.endswith('index.html') or x.endswith('preview.png')),'hubListsKit':hub.is_file() and 'space-exploration' in hub.read_text(),'missing':missing,'passed':not missing}
(ROOT/'artifacts/catalog-demos/space-exploration-wave-20261103/catalog-pages-check.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
if missing: raise SystemExit(1)
