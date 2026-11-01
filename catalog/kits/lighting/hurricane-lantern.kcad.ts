// Original kernelCAD low-poly hurricane lantern: a round kerosene tank, a
// bulging glass globe inside a wire guard, twin side air tubes up to a vented
// top cap and an arched bail handle. Millimetres, Z up, base on z = 0
// centred on x = y = 0, tubes and bail in the XZ plane.

meta({
  name: 'hurricane-lantern',
  license: 'CC0-1.0',
  title: 'Hurricane lantern',
  description: 'Kerosene hurricane storm lantern with a fuel tank, glowing glass globe in a wire guard, side air tubes, vented cap and bail handle, lit or unlit. Knobs: lit, size, guard bars, body, globe, wire and handle colours.',
  tags: ['hurricane lantern', 'storm lantern', 'kerosene lamp', 'lantern', 'camping lantern', 'oil lantern', 'farm', 'light'],
  kit: 'lighting',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'camp', 'farm', 'western', 'survival', 'horror'],
  triangleBudget: 580,
});

const lit = param('lit', 'on', { choices: ['on', 'off'], label: 'Lit' });
const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const bars = param('bars', '4', { choices: ['3', '4', '5'], label: 'Guard bars' });
const body = param('body', '#b8302a', { label: 'Tank and cap' });
const globe = param('globe', '#ffe07a', { label: 'Globe (lit)' });
const globeOff = param('globeOff', '#c8d4cc', { label: 'Globe (unlit)' });
const wire = param('wire', '#2c2c2e', { label: 'Wire guard and handle' });

presets({
  galvanised: { body: '#a6abb0', wire: '#6a6e72' },
  green: { body: '#2f5a3a' },
  rusty: { body: '#7a4a2c', wire: '#4a3426', globe: '#ffb04a' },
});

const s = size.value === 'small' ? 0.75 : size.value === 'large' ? 1.35 : 1;
const nb = Number(bars.value);
const N = 8;
const ngon = (r: number, n = N, rot = Math.PI / 8) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};
const rings = (rs: [number, number][], n = N) =>
  ngon(rs[0][0] * s, n).loft(rs.slice(1).map(([r]) => ngon(r * s, n)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
    ruled: true,
  });
const seg = (x0: number, z0: number, x1: number, z1: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box((len + t) * s, t * s, t * s, true).rotateY(-a).translate(((x0 + x1) / 2) * s, 0, ((z0 + z1) / 2) * s);
};

const l = assembly('hurricane-lantern');
// Fuel tank: a squat round drum with a crowned top.
l.part('tank', rings([[72, 0], [80, 8], [80, 40], [62, 58], [40, 62]]).color(body));
// Globe: bulging glass between the tank and the cap.
l.part('globe', rings([[38, 58], [58, 120], [54, 170], [36, 205]]).color(lit.value === 'on' ? globe : globeOff));
// Guard: vertical bow bars hugging the globe, plus a mid ring.
for (let i = 0; i < nb; i++) {
  const a = Math.PI / 2 + (2 * Math.PI * i) / nb;
  const pts: [number, number][] = [[46, 62], [64, 120], [60, 170], [42, 204]];
  for (let k = 0; k < pts.length - 1; k++) {
    l.part(`guard-${i + 1}-${k + 1}`, seg(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 6).rotateZ((a * 180) / Math.PI).color(wire));
  }
}
l.part('guard-ring', ngon(66 * s).extrude(6 * s).subtract(ngon(58 * s).extrude(10 * s).translate(0, 0, -2 * s)).translate(0, 0, 130 * s).color(wire));
// Side air tubes from the tank to the cap, then the vented cone cap.
for (const sx of [-1, 1]) {
  l.part(`tube-${sx > 0 ? 'r' : 'l'}`, ngon(9 * s, 6).extrude(200 * s).translate(sx * 82 * s, 0, 30 * s).color(body));
}
l.part('cap', rings([[60, 200], [88, 224], [32, 262], [20, 270], [20, 292]]).color(body));
// Bail handle: an arch from the tube tops over the cap.
const bail: [number, number][] = [[-82, 232], [-76, 300], [-36, 340], [36, 340], [76, 300], [82, 232]];
bail.slice(1).forEach(([x, z], i) => l.part(`bail-${i + 1}`, seg(bail[i][0], bail[i][1], x, z, 7).color(wire)));

return l.model();
