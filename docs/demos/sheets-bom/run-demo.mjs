import { readFile, writeFile } from 'node:fs/promises';
import { writeBomTool } from '../../../src/agent/mcp/tools/writeBom.ts';

const handoff = JSON.parse(await readFile(new URL('../../../tests/fixtures/argon/handoff-drawbot.json', import.meta.url), 'utf8'));
const result = await writeBomTool({
  handoff,
  catalog_parts: [
    { ref: 'U1', name: 'ESP32 DevKitC V4', partNumber: 'ESP32-DEVKITC-32E', vendor: 'KernelCAD catalog', price: 9.5, currency: 'USD' },
    { ref: 'M1', name: 'NEMA 17 stepper motor', partNumber: 'NEMA17-42BYGH', vendor: 'KernelCAD catalog', price: 12.5, currency: 'USD' },
    { id: 'm3-heat-set-insert', name: 'M3 heat-set insert', partNumber: 'M3-HSI', vendor: 'KernelCAD catalog', price: 0.08, currency: 'USD' },
    { id: 'm3-screw', name: 'M3 × 8 mm screw', partNumber: 'ISO 7380 M3x8', vendor: 'KernelCAD catalog', price: 0.03, currency: 'USD' },
  ],
  output_path: new URL('./bom.csv', import.meta.url).pathname,
});
if (!result.ok) throw new Error(result.error);
await writeFile(new URL('./result.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ok: result.ok, destination: result.destination, rows: result.rows.length, path: result.path }));
