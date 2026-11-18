// Original kernelCAD low-poly tall grass: a waist-high clump of long arching
// blades with feathery seed plumes on slim stalks rising above them.

meta({
  name: 'tall-grass',
  license: 'CC0-1.0',
  title: 'Tall grass',
  description: 'Waist-high clump of long arching grass blades with feathery seed plumes on slim stalks, like pampas or wild oats. Knobs: height, blades, plumes, blade, stalk and plume colours.',
  tags: ['grass', 'tall grass', 'pampas', 'wild grass', 'reeds', 'meadow', 'field', 'savanna', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'meadow', 'savanna', 'farm', 'garden', 'swamp'],
  triangleBudget: 500,
});

const heightM = param('heightM', '1.2', { choices: ['0.8', '1.2', '1.8'], label: 'Height (m)' });
const blades = param('blades', '12', { choices: ['8', '12', '16'], label: 'Blades' });
const plumes = param('plumes', '5', { choices: ['0', '3', '5', '7'], label: 'Seed plumes' });
const blade = param('blade', '#7a9a48', { label: 'Blades' });
const stalk = param('stalk', '#a89a62', { label: 'Stalks' });
const plume = param('plume', '#e8dcbc', { label: 'Plumes' });

presets({
  dry: { blade: '#b8a660', stalk: '#c8b478' },
  pink: { plume: '#e8b8c8' },
  autumn: { blade: '#b8823a', plume: '#d8c8a0' },
});

const h = Number(heightM.value) * 1000;
const nb = Number(blades.value);
const np = Number(plumes.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Arching blade: a bent strip in its XZ plane (lower straight half, upper
// half leaning further out), thin slab.
const strip = (len: number, w: number, bend: number) => {
  const b = bend * len;
  return extrudePolygon([
    [-w, 0], [w, 0], [w * 0.7 + b * 0.3, len * 0.55], [b, len], [w * -0.2 + b * 0.25, len * 0.55],
  ], 8).translate(0, 0, -4).rotateX(90);
};

const clump = assembly('tall-grass');
for (let i = 0; i < nb; i++) {
  const az = i * 137.5;
  const len = h * (0.6 + 0.25 * ((i * 0.618) % 1));
  const tilt = 8 + 10 * (i % 3);
  // Lift by the tilted base corner's dip so nothing goes below z = 0.
  const lift = h * 0.022 * Math.sin((tilt * Math.PI) / 180);
  clump.part(`blade-${i + 1}`, strip(len, h * 0.022, 0.35).rotateY(tilt).rotateZ(az).translate(0, 0, lift).color(blade));
}
for (let i = 0; i < np; i++) {
  const az = i * 101 + 30;
  const tilt = 4 + 6 * (i % 3);
  const sh = h * (0.85 + 0.15 * ((i * 0.618) % 1));
  const pl = h * 0.22;
  const pr = h * 0.03;
  const sl = h * 0.006 * Math.sin((tilt * Math.PI) / 180);
  clump.part(`stalk-${i + 1}`, ngon(h * 0.006, 3).extrude(sh).rotateY(tilt).rotateZ(az).translate(0, 0, sl).color(stalk));
  const head = ngon(pr * 0.4, 5).loft([ngon(pr, 5, 0.6), ngon(pr * 0.1, 5)], {
    planes: [
      { plane: 'XY', origin: [0, 0, sh - pl * 0.3] },
      { plane: 'XY', origin: [0, 0, sh + pl * 0.15] },
      { plane: 'XY', origin: [0, 0, sh + pl * 0.7] },
    ],
    ruled: true,
  });
  clump.part(`plume-${i + 1}`, head.rotateY(tilt).rotateZ(az).color(plume));
}

return clump.model();
