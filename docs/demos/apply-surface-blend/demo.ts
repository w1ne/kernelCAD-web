// Reproducible local tool invocation; writes a result receipt for the demo.
import { writeFile } from 'node:fs/promises';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { applySurfaceBlendTool } from '../../../src/agent/mcp/tools/applySurfaceBlend';

await initOcct();
const code = 'const body = box(20, 20, 20);\nreturn body;';
const result = await applySurfaceBlendTool({
  code,
  shape_binding: 'body',
  radius: 2,
  selector: { face: 'top' },
  continuity: 'G2',
});
await writeFile('docs/demos/apply-surface-blend/result.json', JSON.stringify({
  invocation: { shape_binding: 'body', operation: 'fillet', radius: 2, selector: { face: 'top' }, continuity: 'G2' },
  ok: result.ok,
  operation: result.operation,
  new_code: result.new_code,
  sceneSummary: result.sceneSummary,
  diagnostics: result.diagnostics,
  provenance: 'Local source checkout evaluation; no deployment or hardware acceptance implied.',
}, null, 2) + '\n');
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
