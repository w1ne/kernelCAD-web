// Original kernelCAD low-poly sawhorse: a timber top beam on four splayed
// A-frame legs held by steel brackets, with end gussets and an optional
// lower tool shelf. Millimetres, Z up, base on z = 0 centred on x = y = 0,
// beam along X.

meta({
  name: 'sawhorse',
  license: 'CC0-1.0',
  title: 'Sawhorse',
  description: 'Carpenter sawhorse trestle with a timber top beam, four splayed legs, steel corner brackets, end gussets and an optional tool shelf. Knobs: length, shelf, top, legs and bracket colours.',
  tags: ['sawhorse', 'trestle', 'saw horse', 'carpentry', 'woodworking', 'workshop', 'construction site', 'barrier'],
  kit: 'tools-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'workshop', 'garage', 'construction'],
  triangleBudget: 340,
});

const length = param('length', '900', { choices: ['600', '900', '1200'], label: 'Length (mm)' });
const shelf = param('shelf', 'none', { choices: ['none', 'shelf'], label: 'Tool shelf' });
const top = param('top', '#d2a86a', { label: 'Top beam and shelf' });
const legs = param('legs', '#c4955a', { label: 'Legs' });
const metal = param('metal', '#5d6268', { label: 'Brackets' });

presets({
  painted: { top: '#e3b41f', legs: '#e3b41f', metal: '#2a2a2c' },
  barrier: { top: '#e8e8e8', legs: '#c8322a', metal: '#3a3c40' },
  weathered: { top: '#9a8a70', legs: '#8a7a60', metal: '#6a4a36' },
});

const L = Number(length.value);
const H = 750; // working height
const xt = L / 2 - 110; // leg top x
const splayX = 70; // outward lean along X at the foot
const splayY = 225; // A-frame spread at the foot
const yt = 35; // leg top y

// One splayed leg from its foot to the top, clipped flat on the floor.
const leg = (sx: number, sy: number) => {
  const foot: [number, number, number] = [sx * (xt + splayX), sy * (yt + splayY), 0];
  const head: [number, number, number] = [sx * xt, sy * yt, H - 75];
  const v = [head[0] - foot[0], head[1] - foot[1], head[2] - foot[2]];
  const len = Math.hypot(v[0], v[1], v[2]);
  const ax = (Math.asin(-v[1] / len) * 180) / Math.PI;
  const ay = (Math.atan2(v[0], v[2]) * 180) / Math.PI;
  return box(70, 38, len + 60, true).rotateX(ax).rotateY(ay)
    .translate((foot[0] + head[0]) / 2, (foot[1] + head[1]) / 2, (foot[2] + head[2]) / 2)
    .subtract(box(L * 2, 1200, 400, true).translate(0, 0, -200));
};
const zg = 300; // gusset and shelf height
const f = zg / (H - 75); // fraction of the way up a leg from its foot
const xg = xt + splayX * (1 - f);
const yg = yt + splayY * (1 - f);
// End-frame: both legs at one end and the gusset board joining them.
const endFrame = (sx: number) => leg(sx, -1).union(leg(sx, 1))
  .union(box(20, 2 * yg + 80, 90, true).translate(sx * (xg + 35), 0, zg));

const s = assembly('sawhorse');
s.part('top', box(L, 45, 90, true).translate(0, 0, H - 45).color(top));
if (shelf.value === 'shelf') {
  s.part('legs', endFrame(-1).union(endFrame(1))
    .union(box(2 * xg, 30, 40, true).translate(0, -yg, zg))
    .union(box(2 * xg, 30, 40, true).translate(0, yg, zg))
    .color(legs));
  s.part('shelf', box(2 * xg - 60, 2 * yg + 10, 18, true).translate(0, 0, zg + 29).color(top));
} else {
  s.part('legs-left', endFrame(-1).color(legs));
  s.part('legs-right', endFrame(1).color(legs));
}
for (const sx of [-1, 1]) {
  s.part(sx < 0 ? 'bracket-left' : 'bracket-right', box(120, 130, 70, true).translate(sx * xt, 0, H - 75).color(metal));
}

return s.model();
