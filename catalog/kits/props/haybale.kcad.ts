// Original kernelCAD low-poly hay bale: a rectangular straw bale with
// bevelled edges and two twine bands, or a big round bale lying on its side.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'haybale',
  license: 'CC0-1.0',
  title: 'Hay bale',
  description: 'Straw hay bale, small rectangular with twine bands or big round lying on its side, single or stacked. Knobs: shape, stack, hay, cut end and twine colours.',
  tags: ['hay', 'hay bale', 'straw', 'bale', 'farm', 'barn', 'field', 'harvest'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'farm', 'field', 'medieval', 'barn'],
  triangleBudget: 480,
});

const shape = param('shape', 'square', { choices: ['square', 'round'], label: 'Shape' });
const stack = param('stack', '1', { choices: ['1', '3'], label: 'Bales' });
const hay = param('hay', '#d9b75a', { label: 'Hay' });
const ends = param('ends', '#c8a346', { label: 'Cut ends' });
const twine = param('twine', '#b8432f', { label: 'Twine' });

presets({
  fresh: { hay: '#c9c25a', ends: '#b5ad48' },
  old: { hay: '#a8935e', ends: '#96814f' },
});

const n = Number(stack.value);
const bv = 30; // bevel

// Bevelled block centred on (x, y), base at z, long side along X.
const bale = (x: number, y: number, z: number, L: number, W: number, H: number) => {
  const prof: [number, number][] = [[-W / 2 + bv, 0], [W / 2 - bv, 0], [W / 2, bv], [W / 2, H - bv], [W / 2 - bv, H], [-W / 2 + bv, H], [-W / 2, H - bv], [-W / 2, bv]];
  return extrudePolygon(prof, L).rotateX(90).rotateZ(90).translate(x - L / 2, y, z);
};

const hb = assembly('haybale');
if (shape.value === 'square') {
  const L = 900;
  const W = 460;
  const H = 360;
  const spots: [number, number, number][] = n === 1 ? [[0, 0, 0]] : [[0, -W / 2 - 5, 0], [0, W / 2 + 5, 0], [40, 0, H - 2]];
  spots.forEach(([x, y, z], i) => {
    const id = i + 1;
    hb.part(`bale-${id}`, bale(x, y, z, L - 40, W, H).color(hay));
    hb.part(`end-${id}-a`, bale(x - L / 2 + 10, y, z + 8, 20, W - 30, H - 16).color(ends));
    hb.part(`end-${id}-b`, bale(x + L / 2 - 10, y, z + 8, 20, W - 30, H - 16).color(ends));
    for (const [k, tx] of [[1, -L * 0.25], [2, L * 0.25]] as [number, number][]) {
      hb.part(`twine-${id}-${k}`, bale(x + tx, y, z, 24, W + 12, H + 6).color(twine));
    }
  });
} else {
  const R = 650;
  const Wd = 1200;
  const ngon = (r: number) => {
    let p = path().moveTo(r, 0);
    for (let k = 1; k < 10; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / 10), r * Math.sin((2 * Math.PI * k) / 10));
    return p.close();
  };
  const spots: [number, number][] = n === 1 ? [[0, 0]] : [[-Wd / 2 - 20, 0], [Wd / 2 + 20, 0], [0, 2 * R * 0.95]];
  spots.forEach(([x, zc], i) => {
    const id = i + 1;
    const disc = (r: number, w: number, x0: number) => ngon(r).extrude(w).rotateZ(18).rotateY(90).translate(x0, 0, (R + 8) * Math.cos(Math.PI / 10) + zc); // the twine band touches the ground
    hb.part(`bale-${id}`, disc(R, Wd - 40, x - Wd / 2 + 20).color(hay));
    hb.part(`end-${id}-a`, disc(R - 25, 20, x - Wd / 2 + 1).color(ends));
    hb.part(`end-${id}-b`, disc(R - 25, 20, x + Wd / 2 - 21).color(ends));
    hb.part(`twine-${id}`, disc(R + 8, 40, x - 20).color(twine));
  });
}

return hb.model();
