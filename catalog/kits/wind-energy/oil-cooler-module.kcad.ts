// SPDX-License-Identifier: CC0-1.0
// Gearbox oil cooler: the oil-to-air radiator that keeps a turbine gearbox's
// lubricating oil in range, usually mounted on the nacelle roof or rear frame.
// What makes it one: a finned aluminium core in a channel frame, two axial fans
// in bell-mouth shrouds behind wire guards, round oil headers along the top and
// bottom with flanged inlet and outlet lines, and a fan terminal box.
// Stylized catalog geometry, millimetres, Z up, fans on the -Y face.
meta({
  name: "oil-cooler-module",
  license: 'CC0-1.0',
  title: "Gearbox oil cooler module",
  description: "Oil-to-air cooler with a finned aluminium radiator core in a powder-coated channel frame, two axial fans with pitched blades, hub motors, bell-mouth shrouds and concentric wire guards, top and bottom oil headers with flanged inlet and outlet lines, fan terminal box and four legs on base plates. Material controls: frame steel, aluminium, fan blade and pipework; weathered, high-visibility and nacelle-white presets.",
  tags: ['wind', 'energy', 'renewable', 'oil cooler', 'radiator', 'heat exchanger', 'fan', 'nacelle', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel = param('powderCoatedSteel', '#287082', { label: 'Frame steel' });
const aluminium = param('aluminium', '#aab7bb', { label: 'Aluminium core' });
const fanBlade = param('fanBlade', '#24292c', { label: 'Fan blades' });
const pipework = param('pipework', '#9a5a32', { label: 'Oil pipework' });

presets({
  weathered: { powderCoatedSteel: '#1f5765', aluminium: '#959f9f', fanBlade: '#33383b', pipework: '#7a5236' },
  highVisibility: { powderCoatedSteel: '#d8a62b', aluminium: '#c4cfd2', fanBlade: '#1c2022', pipework: '#c4402f' },
  nacelleWhite: { powderCoatedSteel: '#dfe2df', aluminium: '#9ea9ac', fanBlade: '#2c3134', pipework: '#5d6a70' },
});

const p = assembly("oil-cooler-module");
const add = (name, shape) => p.part(name, shape.scale(scale));
const frame = (name, shape) => add(name, shape.color(powderCoatedSteel));
const alu = (name, shape) => add(name, shape.color(aluminium));
const blade = (name, shape) => add(name, shape.color(fanBlade));
const pipe = (name, shape) => add(name, shape.color(pipework));
const bar = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);
// (radius, s) outline revolved about a Y-direction axis; s grows towards -Y.
const facing = (pts, x, y, z) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, s] of pts.slice(1)) outline = outline.lineTo(r, s);
  return outline.close().revolve().rotateX(90).translate(x, y, z);
};

const W = 1500;
const H = 900;
const z0 = 420; // core bottom
const D = 200; // core depth

// Core: aluminium block with horizontal tubes and fin edges on the face.
alu('radiator-core', bar(0, 0, z0, W - 80, D, H));
for (let k = 1; k < 12; k += 1) alu('core-tube-' + k, bar(0, -D / 2 - 6, z0 + (k * H) / 12 - 8, W - 100, 12, 16));

// Channel frame and legs.
frame('frame-left', bar(-W / 2, 0, z0 - 60, 80, D + 60, H + 120));
frame('frame-right', bar(W / 2, 0, z0 - 60, 80, D + 60, H + 120));
frame('frame-top', bar(0, 0, z0 + H, W + 80, D + 60, 60));
frame('frame-bottom', bar(0, 0, z0 - 60, W + 80, D + 60, 60));
for (const x of [-W / 2, W / 2]) {
  for (const y of [-80, 80]) {
    const id = (x < 0 ? '-left' : '-right') + (y < 0 ? '-front' : '-rear');
    frame('leg' + id, bar(x, y, 30, 70, 70, z0 - 90));
    frame('base-plate' + id, bar(x, y, 0, 180, 180, 30));
  }
}

// Fans: bell-mouth shroud, hub motor, pitched blades and wire guard.
const fy = -D / 2;
const fz = z0 + H / 2;
for (const [i, fx] of [-W / 4 - 10, W / 4 + 10].entries()) {
  const f = 'fan-' + (i + 1);
  frame(f + '-shroud', facing([[300, 0], [330, 0], [330, 110], [380, 160], [380, 180], [350, 180], [300, 130]], fx, fy, fz));
  blade(f + '-motor', facing([[0, 30], [95, 30], [95, 170], [70, 210], [0, 210]], fx, fy, fz));
  for (let b = 0; b < 6; b += 1) {
    blade(f + '-blade-' + (b + 1), box(210, 14, 120, true).rotateX(28).translate(185, 0, 0).rotateY(b * 60 + i * 30).translate(fx, fy - 90, fz));
  }
  for (const [k, r] of [110, 200, 290, 370].entries()) alu(f + '-guard-ring-' + (k + 1), torus(r, 6, 8).rotateX(90).translate(fx, fy - 230, fz));
  for (let s = 0; s < 4; s += 1) alu(f + '-guard-spoke-' + (s + 1), box(380, 10, 10, true).translate(190, 0, 0).rotateY(s * 90 + 45).translate(fx, fy - 230, fz));
}
frame('fan-terminal-box', bar(0, fy - 60, z0 + H - 220, 180, 120, 160));
blade('fan-cable', bar(0, fy - 60, z0 + H - 60, 24, 24, 80));

// Oil headers along top and bottom, flanged inlet and outlet on the right.
const header = (name, z) => pipe(name, cylinder(W - 40, 70, 14).rotateY(90).translate(-(W - 40) / 2, 0, z));
header('header-top', z0 + H + 120);
header('header-bottom', z0 - 130);
for (const [name, z] of [['inlet', z0 + H + 120], ['outlet', z0 - 130]]) {
  pipe(name + '-line', cylinder(380, 45, 12).rotateY(90).translate(W / 2 - 20, 0, z));
  frame(name + '-flange', cylinder(30, 90, 14).rotateY(90).translate(W / 2 + 360, 0, z));
  frame(name + '-end-cap', cylinder(30, 80, 14).rotateY(-90).translate(-(W - 40) / 2, 0, z));
}
pipe('thermostatic-bypass', cylinder(H + 250, 30, 10).translate(W / 2 + 180, 0, z0 - 130));
frame('bypass-valve', bar(W / 2 + 180, 0, z0 + H / 2 - 80, 140, 120, 160));

return p.model();
