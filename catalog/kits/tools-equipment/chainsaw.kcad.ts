// Original kernelCAD low-poly chainsaw standing on its engine housing: a
// bevelled motor body with filter cover, closed rear handle, wrap-around top
// handle, hand guard and a guide bar ringed by its chain. Millimetres, Z up,
// base on z = 0 centred on x = y = 0, bar pointing +X.

meta({
  name: 'chainsaw',
  license: 'CC0-1.0',
  title: 'Chainsaw',
  description: 'Petrol chainsaw resting on its engine body with rear and wrap-around handles, hand guard and a guide bar with chain, for forestry, lumberjack and horror scenes. Knobs: bar length, chain teeth, body, trim, bar and chain colours.',
  tags: ['chainsaw', 'chain saw', 'saw', 'power tool', 'lumberjack', 'forestry', 'logging', 'tool', 'item'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['outdoor', 'forest', 'workshop', 'garage', 'construction', 'farm'],
  triangleBudget: 380,
});

const barLen = param('barLen', '450', { choices: ['350', '450', '600'], label: 'Bar length (mm)' });
const teeth = param('teeth', 'toothed', { choices: ['plain', 'toothed'], label: 'Chain' });
const body = param('body', '#e8641c', { label: 'Body' });
const trim = param('trim', '#2b2b2e', { label: 'Handles and cover' });
const bar = param('bar', '#a3a9b0', { label: 'Guide bar' });
const chain = param('chain', '#4a4d52', { label: 'Chain' });

presets({
  green: { body: '#3f8a3a', trim: '#e3b41f' },
  red: { body: '#c22a24', trim: '#e8e8e8' },
  rusty: { body: '#8a5a3a', bar: '#7a6a5a', chain: '#5a3e2c' },
});

const BL = Number(barLen.value);
const xEnd = 50 + BL; // end of the straight bar
const X0 = -(xEnd + 30 - 340) / 2; // centres rear handle to nose on x = 0
// Side profile (x, z) extruded across Y, centred on y = yc.
const side = (pts: [number, number][], w: number, yc = 0) =>
  extrudePolygon(pts.map(([x, z]) => [x + X0, z] as [number, number]), w).rotateX(90).translate(0, yc + w / 2, 0);

const c = assembly('chainsaw');
c.part('body', side([[-180, 0], [60, 0], [72, 40], [62, 170], [12, 230], [-130, 230], [-180, 180]], 160).color(body));
c.part('cover', side([[-140, 222], [0, 222], [-20, 252], [-120, 252]], 130).color(trim));
// Closed rear handle loop behind the body.
c.part('rear-handle', side([[-170, 20], [-320, 32], [-342, 80], [-325, 125], [-170, 150]], 40)
  .subtract(side([[-300, 60], [-205, 55], [-205, 118], [-300, 102]], 120))
  .color(trim));
// Wrap-around top handle: a three-bar hoop across the body at x = 20.
const hx = 20 + X0;
c.part('top-handle', box(30, 30, 250, true).translate(hx, -82, 175)
  .union(box(30, 150, 30, true).translate(hx, -22, 300))
  .union(box(30, 30, 100, true).translate(hx, 38, 250))
  .color(trim));
// Hand guard: a slanted plate in front of the top handle.
c.part('guard', side([[66, 130], [84, 130], [122, 310], [104, 310]], 140, -10).color(trim));
// Guide bar inside a slightly bigger, thinner chain loop.
c.part('bar', side([[30, 50], [xEnd, 58], [xEnd + 20, 80], [xEnd, 102], [30, 110]], 10, 20).color(bar));
// Chain loop: straight runs from the body to the nose, optionally with
// shark-fin cutters every ~75 mm along the top and bottom runs.
const zb = (x: number) => 44 + (7 * (x - 40)) / (xEnd - 40);
const zt = (x: number) => 116 - (7 * (x - 40)) / (xEnd - 40);
const lo: [number, number][] = [[40, 44]];
const hi: [number, number][] = [[40, 116]];
if (teeth.value === 'toothed') {
  const n = Math.round(BL / 75);
  for (let i = 0; i < n; i++) {
    const x = 60 + ((xEnd - 110) * i) / (n - 1);
    lo.push([x, zb(x)], [x + 40, zb(x + 40) - 9], [x + 40, zb(x + 40)]);
    hi.push([x, zt(x)], [x + 40, zt(x + 40) + 9], [x + 40, zt(x + 40)]);
  }
}
const cp: [number, number][] = [...lo, [xEnd, 51], [xEnd + 30, 80], [xEnd, 109], ...hi.reverse()];
c.part('chain', side(cp, 5, 20).color(chain));

return c.model();
