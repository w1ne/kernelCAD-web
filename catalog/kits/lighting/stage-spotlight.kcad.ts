// Original kernelCAD low-poly theatre spotlight: a faceted lamp can with a
// glowing lens and optional four-leaf barn doors, tilted in a U yoke on a
// three-legged telescopic stand.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, beam toward -Y.

meta({
  name: 'stage-spotlight',
  license: 'CC0-1.0',
  title: 'Stage spotlight',
  description: 'Theatre stage spotlight: a lamp can with glowing lens and optional barn doors, tilted in a yoke on a tripod stand. Knobs: stand height, barn doors, tilt, body, lens and stand colours.',
  tags: ['spotlight', 'stage light', 'theatre light', 'fresnel', 'film light', 'studio light', 'tripod', 'concert'],
  kit: 'lighting',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'theatre', 'stage', 'studio', 'concert', 'film-set'],
  triangleBudget: 460,
});

const height = param('heightM', '1.6', { choices: ['1.2', '1.6', '2'], label: 'Stand height (m)' });
const doors = param('doors', 'on', { choices: ['on', 'off'], label: 'Barn doors' });
const tilt = param('tilt', '15', { choices: ['0', '15', '30'], label: 'Tilt down (deg)' });
const body = param('body', '#2a2a2c', { label: 'Body' });
const lens = param('lens', '#fff2b0', { label: 'Lens' });
const stand = param('stand', '#4a4e54', { label: 'Stand and yoke' });

presets({
  silver: { body: '#b8c0c4', stand: '#2a2a2c' },
  blue: { lens: '#7ab8ff' },
  red: { body: '#8a1a1a', lens: '#ff8a6a' },
});

const Hs = Number(height.value) * 1000;
const tl = Number(tilt.value);
const ngon = (r: number, k: number) => {
  let p = path().moveTo(r, 0);
  for (let i = 1; i < k; i++) p = p.lineTo(r * Math.cos((2 * Math.PI * i) / k), r * Math.sin((2 * Math.PI * i) / k));
  return p.close();
};
// Hexagonal rod from p0 to p1.
const rod = (p0: [number, number, number], p1: [number, number, number], r: number) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return ngon(r, 6).extrude(len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const s = assembly('stage-spotlight');
// Tripod: three splayed legs from a hub, each ending in a rubber foot.
const hub = Hs * 0.35;
const spread = Hs * 0.32;
for (let i = 0; i < 3; i++) {
  const a = (2 * Math.PI * i) / 3 + Math.PI / 2;
  const fx = spread * Math.cos(a);
  const fy = spread * Math.sin(a);
  s.part(`leg-${i + 1}`, rod([0, 0, hub + 30], [fx, fy, 22], 13).union(box(50, 50, 30, true).translate(fx, fy, 15)).color(stand));
}
// Telescopic pole: a thick lower tube and a thinner upper tube.
const split = hub + (Hs - hub) * 0.55;
s.part('pole', ngon(22, 8).extrude(split - hub).translate(0, 0, hub)
  .union(ngon(15, 8).extrude(Hs - split + 40).translate(0, 0, split - 40)).color(stand));

// Yoke (its cross bar sits on the pole top) and can around the pivot above it.
const pz = Hs + 180;
const R = 130;
const yoke = box(R * 2 + 70, 40, 30, true).translate(0, 0, pz - R - 40)
  .union(box(24, 40, R + 60, true).translate(-R - 23, 0, pz - R / 2 - 20))
  .union(box(24, 40, R + 60, true).translate(R + 23, 0, pz - R / 2 - 20));
s.part('yoke', yoke.color(stand));

// Can built along -Y around the pivot, then tilted down about X.
const can = () => ngon(R, 10).loft([ngon(R, 10), ngon(R * 0.85, 10)], {
  planes: [{ plane: 'XY', origin: [0, 0, 0] }, { plane: 'XY', origin: [0, 0, 300] }, { plane: 'XY', origin: [0, 0, 380] }],
  ruled: true,
}).rotateX(-90).translate(0, -180, 0);
s.part('can', can().rotateX(-tl).translate(0, 0, pz).color(body));
s.part('lens', ngon(R * 0.85, 10).extrude(12).rotateX(90).translate(0, -178, 0).rotateX(-tl).translate(0, 0, pz).color(lens));
if (doors.value === 'on') {
  // Four flaps splayed open around the front of the can.
  const flap = (w: number, rotDeg: number, axis: 'x' | 'z', off: [number, number, number]) => {
    const f = box(w, 150, 6, true).translate(0, -75, 3);
    return (axis === 'x' ? f.rotateX(rotDeg) : f.rotateY(rotDeg)).translate(off[0], off[1], off[2]);
  };
  s.part('door-top', flap(R * 1.7, -25, 'x', [0, -186, R + 2]).rotateX(-tl).translate(0, 0, pz).color(body));
  s.part('door-bottom', flap(R * 1.7, 25, 'x', [0, -186, -R - 8]).rotateX(-tl).translate(0, 0, pz).color(body));
  s.part('door-left', flap(R * 1.2, 90, 'z', [-R - 2, -186, 0]).rotateZ(-20).rotateX(-tl).translate(0, 0, pz).color(body));
  s.part('door-right', flap(R * 1.2, 90, 'z', [R + 2, -186, 0]).rotateZ(20).rotateX(-tl).translate(0, 0, pz).color(body));
}

return s.model();
