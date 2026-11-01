// Original kernelCAD low-poly ladder: either a straight wooden rung ladder
// or a folding A-frame step ladder with a top cap and spreader bars.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'ladder',
  license: 'CC0-1.0',
  title: 'Ladder',
  description: 'Straight wooden rung ladder or folding A-frame step ladder. Knobs: style, rung count, rail and rung colours.',
  tags: ['ladder', 'step ladder', 'rungs', 'climb', 'workshop', 'construction', 'barn'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'workshop', 'farm', 'medieval', 'construction'],
  triangleBudget: 360,
});

const style = param('style', 'straight', { choices: ['straight', 'step'], label: 'Style' });
const rungs = param('rungs', '8', { choices: ['4', '6', '8', '10'], label: 'Rungs' });
const rail = param('rail', '#b4844f', { label: 'Rails' });
const rung = param('rung', '#d2a56a', { label: 'Rungs' });

presets({
  aluminium: { rail: '#b9bec4', rung: '#8e959c' },
  old: { rail: '#7d6449', rung: '#94795a' },
});

const n = Number(rungs.value);
const pitch = 280;
const lad = assembly('ladder');
// Hexagonal dowel along X.
const dowel = (len: number, r: number) => {
  let hp = path().moveTo(r, 0);
  for (let k = 1; k < 6; k++) hp = hp.lineTo(r * Math.cos((Math.PI * k) / 3), r * Math.sin((Math.PI * k) / 3));
  return hp.close().extrude(len).rotateY(90);
};

if (style.value === 'straight') {
  const H = pitch * (n + 1);
  const W = 420;
  const rw = 45;
  for (const [i, x] of [[1, -W / 2], [2, W / 2 - rw]] as [number, number][]) {
    lad.part(`rail-${i}`, box(rw, 70, H).translate(x, -35, 0).color(rail));
  }
  for (let i = 0; i < n; i++) {
    lad.part(`rung-${i + 1}`, dowel(W - 2 * rw + 30, 20).translate(-W / 2 + rw - 15, 0, pitch * (i + 1)).color(rung));
  }
} else {
  // A-frame: front legs carry flat treads, rear legs brace; legs lean in.
  const steps = Math.max(3, Math.round(n / 2));
  const H = 250 * (steps + 1);
  const spread = H * 0.32; // half the foot spread along Y
  const tilt = (Math.atan2(spread, H) * 180) / Math.PI;
  const legLen = Math.hypot(H, spread);
  const W = 460;
  const lw = 60;
  const lift = 15 * Math.sin((tilt * Math.PI) / 180); // keep the tilted leg corners above z = 0
  for (const [side, name] of [[-1, 'front'], [1, 'rear']] as [number, string][]) {
    for (const [j, x] of [[1, -W / 2], [2, W / 2 - lw]] as [number, number][]) {
      lad.part(`${name}-leg-${j}`, box(lw, 30, legLen).translate(x, -15, 0).rotateX(side * tilt).translate(0, side * spread, lift).color(rail));
    }
  }
  for (let i = 0; i < steps; i++) {
    const z = 250 * (i + 1);
    const y = -spread * (1 - z / H);
    lad.part(`step-${i + 1}`, box(W - 2 * lw + 10, 110, 25, true).translate(0, y + 20, z).color(rung));
  }
  lad.part('top-cap', box(W + 20, 160, 50, true).translate(0, 0, H + 10).color(rung));
  lad.part('spreader', box(W - 2 * lw + 10, spread, 18, true).translate(0, spread * 0.25, H * 0.45).color(rail));
}

return lad.model();
