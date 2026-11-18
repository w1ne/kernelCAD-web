// Original kernelCAD low-poly claw hammer lying on its side as a pickup item:
// an octagonal striking face, a curved or straight rip claw and a tapered
// handle with a rubber grip. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, handle along X with the head at +X and the face toward -Y.

meta({
  name: 'claw-hammer',
  license: 'CC0-1.0',
  title: 'Claw hammer',
  description: 'Claw hammer lying flat as a pickup or workshop prop, with a steel head, curved or straight rip claw and a wooden or fibreglass handle with grip. Knobs: claw style, size, head, handle and grip colours.',
  tags: ['hammer', 'claw hammer', 'tool', 'hand tool', 'carpentry', 'workshop', 'item', 'pickup'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'workshop', 'garage', 'construction'],
  triangleBudget: 220,
});

const claw = param('claw', 'curved', { choices: ['curved', 'rip'], label: 'Claw style' });
const size = param('size', '16oz', { choices: ['12oz', '16oz', '20oz'], label: 'Size' });
const head = param('head', '#5b6066', { label: 'Head' });
const handle = param('handle', '#c08a4e', { label: 'Handle' });
const grip = param('grip', '#2a2a2c', { label: 'Grip' });

presets({
  fibreglass: { handle: '#e0b21e', grip: '#1f1f21' },
  framing: { claw: 'rip', size: '20oz', handle: '#2b2d31', grip: '#c83a2a' },
});

const s = size.value === '12oz' ? 0.88 : size.value === '20oz' ? 1.12 : 1;
const L = 330 * s; // overall handle length
const T = 30 * s; // head thickness (Z)
const zc = T / 2;
const hx = L / 2 - 18 * s; // head centre line along X
const a = assembly('claw-hammer');

// Handle: tapered outline seen from above, flared at the butt, thinner than the head.
const ht = 22 * s;
const hp: [number, number][] = [
  [-L / 2, -17 * s], [-L / 2 + 120 * s, -12 * s], [hx, -13 * s], [hx, 13 * s],
  [-L / 2 + 120 * s, 12 * s], [-L / 2, 17 * s],
];
a.part('handle', extrudePolygon(hp, ht).translate(0, 0, zc - ht / 2).color(handle));
// Rubber grip sleeve over the butt end.
const gp: [number, number][] = [
  [-L / 2 - 3, -19 * s], [-L / 2 + 110 * s, -14 * s], [-L / 2 + 110 * s, 14 * s], [-L / 2 - 3, 19 * s],
];
a.part('grip', extrudePolygon(gp, ht + 6).translate(0, 0, zc - ht / 2 - 3).color(grip));

// Head: block around the eye, an octagonal neck and face toward -Y, claw toward +Y.
const w = 30 * s;
let h = box(w, 46 * s, T, true).translate(hx, -2 * s, zc)
  .union(cylinder(48 * s, 13 * s, 8).rotateX(90).translate(hx, -20 * s, zc))
  .union(cylinder(12 * s, 15 * s, 8).rotateX(90).translate(hx, -62 * s, zc));
const cp: [number, number][] = claw.value === 'rip'
  ? [[hx - w / 2, 15 * s], [hx + w / 2, 15 * s], [hx + 9 * s, 92 * s], [hx - 3 * s, 98 * s], [hx - 11 * s, 90 * s]]
  : [[hx - w / 2, 15 * s], [hx + w / 2, 15 * s], [hx + 10 * s, 50 * s], [hx - 10 * s, 78 * s], [hx - 40 * s, 92 * s],
    [hx - 28 * s, 72 * s], [hx - 14 * s, 46 * s]];
const ct = T - 8 * s;
h = h.union(extrudePolygon(cp, ct).translate(0, 0, zc - ct / 2));
a.part('head', h.color(head));

return a.model();
