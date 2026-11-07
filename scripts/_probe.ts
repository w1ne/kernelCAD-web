import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../src/agent/catalog/buildCatalog';
await initOcct();
try { const r = await buildCatalogAssetWithGlb('/home/andrii/worktrees/kernelCAD-web/catalog-2000', process.argv[2]); console.log('OK', r.asset.stats.triangles); }
catch (e) { console.log(String(e.message).slice(0, 600)); }
