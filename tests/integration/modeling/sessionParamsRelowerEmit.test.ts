import { describe, it, expect } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';

/**
 * Slice 2E integration test: session.params.update fires onRelower on the
 * per-session engine attached by buildModel. Subscribers added AFTER the
 * initial build still receive events on subsequent updates.
 *
 * The script DSL uses globals (`param`, `box`) injected by `runScript`;
 * no `import` statement is needed inside the script body.
 */
describe('session.params.update emits onRelower', () => {
  it('subscribers receive affectedIds on update', async () => {
    const model = await buildModel({
      fileName: 'slice2e-box.kcad.ts',
      code: `
        const w = param('width', 50, { min: 10, max: 100 });
        return box(w, 30, 12);
      `,
    });

    const engine = model.session.engine;
    expect(engine).toBeDefined();

    const events: string[][] = [];
    const unsub = engine!.onRelower((ids) => { events.push([...ids]); });

    await model.session.params.update([{ name: 'width', value: 70 }]);

    expect(events.length).toBe(1);
    expect(events[0].length).toBeGreaterThan(0);

    unsub();
  });
});
