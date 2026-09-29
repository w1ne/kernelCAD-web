import { it } from 'vitest';
import { dirname } from 'node:path';
import { buildUsecase, exportAs, stlStats } from './usecaseChecks';
import { runAndExportParts } from '../src/agent/script-runtime/export';
it('stl', async () => {
  const b = await buildUsecase(process.env.F!);
  const e = await exportAs(b, 'stl');
  console.log('##', e.ok, e.bytes.length, e.diagnostics.map(d => d.severity + ':' + d.code + ':' + d.message.slice(0, 300)), JSON.stringify(stlStats(e.bytes)));
  const each = await runAndExportParts({ code: b.code, fileName: b.scriptPath, scriptDir: dirname(b.scriptPath) });
  for (const p of each.parts) console.log('## part', p.name, JSON.stringify(stlStats(p.bytes)), p.report.ok, p.report.openEdgeCount);
}, 600000);
