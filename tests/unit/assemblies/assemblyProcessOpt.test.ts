// tests/unit/assemblies/assemblyProcessOpt.test.ts
//
// Slice S1 of the BOM order feature: `arm.part(name, shape, { process })`
// declares the part's fabrication process. Stored on the part record so the
// order pack and BOM can group by it; an unknown value is refused at capture
// time with a `feature.invalid-args` naming `opts.process`.

import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../src/composition/runScript';
import type { Assembly } from '../../../src/modeling/capture/assembly';

let initOcct: () => Promise<void>;
beforeAll(async () => {
  ({ initOcct } = await import('../../../src/kernel/backends/occt/occtBackend'));
  await initOcct();
}, 60000);

const SCRIPT = `
const arm = assembly('demo');
arm.part('bracket', box(10, 10, 10), { process: 'cnc' });
arm.part('spacer', box(4, 4, 4));
arm.part('cover', box(6, 6, 6), { process: 'sheet-cut' });
return arm.model();
`;

describe('assembly.part process option', () => {
  it('stores the declared process on the part record', async () => {
    const r = await runScript({ code: SCRIPT, fileName: 'demo.kcad.ts' });
    const arm = [...(r.session.assemblies as Map<string, Assembly>).values()][0] as Assembly;
    const byName = new Map(arm.__parts().map((p) => [p.name, p]));
    expect(byName.get('bracket')?.process).toBe('cnc');
    expect(byName.get('cover')?.process).toBe('sheet-cut');
    expect(byName.get('spacer')?.process).toBeUndefined();
  }, 60000);

  it('rejects an unknown process with a feature.invalid-args diagnostic', async () => {
    const bad = SCRIPT.replace("'cnc'", "'welding'");
    let thrown: unknown;
    try {
      await runScript({ code: bad, fileName: 'demo.kcad.ts' });
    } catch (e) {
      thrown = e;
    }
    expect(thrown, 'an unknown process must be rejected at capture time').toBeDefined();
    expect((thrown as { code?: string }).code).toBe('feature.invalid-args');
    expect(String((thrown as Error).message)).toMatch(/opts\.process/);
  }, 60000);
});
