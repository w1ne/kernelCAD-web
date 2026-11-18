// SPDX-License-Identifier: CC0-1.0
// Wind turbine generator: the doubly-fed induction machine that sits behind the
// gearbox in a geared nacelle. What makes it one: a finned cylindrical stator
// frame cooled along its length, cast end shields, a drive-end shaft with the
// coupling hub facing the gearbox, a slip-ring compartment hung off the
// non-drive end, a terminal box on top, and a base frame on anti-vibration
// mounts. Stylized catalog geometry, millimetres, Z up, shaft along X
// (drive end at -X).
meta({
  name: "generator-cover",
  license: 'CC0-1.0',
  title: "Wind turbine generator",
  description: "Doubly-fed induction generator with a finned cylindrical stator frame, cast drive-end and non-drive-end shields, shaft with coupling hub, louvred slip-ring compartment, terminal box with cable glands, lifting lugs, cast feet and a base frame on elastomer anti-vibration mounts. Material controls: painted steel, cast steel, shaft steel and elastomer; weathered, high-visibility and factory-blue presets.",
  tags: ['wind', 'energy', 'renewable', 'generator', 'drivetrain', 'nacelle', 'electric machine', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#4f7280', { label: 'Painted steel frame' });
const castSteel = param('castSteel', '#6a777c', { label: 'Cast steel shields' });
const shaftSteel = param('shaftSteel', '#c3cbce', { label: 'Shaft steel' });
const elastomer = param('elastomer', '#2b2f31', { label: 'Elastomer mounts' });

presets({
  weathered: { paintedSteel: '#415961', castSteel: '#606e74', shaftSteel: '#9aa1a2', elastomer: '#363a3b' },
  highVisibility: { paintedSteel: '#d8a62b', castSteel: '#5d686c', shaftSteel: '#d6dcde', elastomer: '#1f2224' },
  factoryBlue: { paintedSteel: '#2f4f8c', castSteel: '#26407a', shaftSteel: '#cfd5d7', elastomer: '#2a2d2f' },
});

const p = assembly("generator-cover");
const add = (name, shape) => p.part(name, shape.scale(scale));
const painted = (name, shape) => add(name, shape.color(paintedSteel));
const cast = (name, shape) => add(name, shape.color(castSteel));
const steel = (name, shape) => add(name, shape.color(shaftSteel));
const rubber = (name, shape) => add(name, shape.color(elastomer));
const bar = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);

const AX = 820; // shaft height
const R = 560; // stator frame radius
// (radius, x) outline revolved about the shaft axis.
const axial = (pts) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, s] of pts.slice(1)) outline = outline.lineTo(r, s);
  return outline.close().revolve().rotateY(90).translate(0, 0, AX);
};

// Stator frame with axial cooling fins all round.
painted('stator-frame', axial([[0, -700], [R, -700], [R, 640], [0, 640]]));
for (let i = 0; i < 20; i += 1) {
  const deg = (i * 360) / 20 + 9;
  painted('cooling-fin-' + (i + 1), box(1260, 26, 90, true).translate(-30, 0, R + 40).rotateX(deg).translate(0, 0, AX));
}
for (const [i, s] of [-640, 560].entries()) painted('frame-band-' + (i ? 'rear' : 'front'), axial([[R, s], [R + 95, s], [R + 95, s + 70], [R, s + 70]]));

// End shields, shaft and coupling hub.
cast('drive-end-shield', axial([[0, -860], [210, -860], [420, -790], [R + 20, -720], [R + 20, -700], [0, -700]]));
cast('drive-end-bearing-cap', axial([[0, -900], [170, -900], [170, -860], [0, -860]]));
steel('shaft', axial([[0, -1180], [120, -1180], [120, -900], [0, -900]]));
cast('coupling-hub', axial([[0, -1280], [240, -1280], [240, -1150], [150, -1110], [0, -1110]]));
cast('non-drive-end-shield', axial([[0, 640], [R + 20, 640], [R + 20, 660], [440, 740], [0, 740]]));

// Slip-ring compartment with louvres hung off the non-drive end.
painted('slip-ring-housing', bar(960, 0, AX - 360, 440, 760, 720));
painted('slip-ring-roof', bar(960, 0, AX + 360, 480, 800, 30));
for (let k = 0; k < 5; k += 1) cast('louvre-' + (k + 1), bar(960, -395, AX - 260 + k * 110, 340, 30, 40));
cast('slip-ring-access-door', bar(1185, 0, AX - 300, 30, 560, 600));

// Terminal box and cable glands on top.
painted('terminal-box', bar(-60, 0, AX + R + 60, 560, 480, 330));
cast('terminal-box-lid', bar(-60, 0, AX + R + 390, 600, 520, 30));
for (let i = 0; i < 4; i += 1) rubber('cable-gland-' + (i + 1), cylinder(90, 38, 10).rotateX(-90).translate(-240 + i * 120, 240, AX + R + 180));
for (const x of [-480, 380]) steel('lifting-lug-' + (x < 0 ? 'front' : 'rear'), torus(100, 26, 12).rotateX(90).translate(x, 0, AX + R + 110));

// Cast feet, base frame and anti-vibration mounts.
for (const x of [-480, 400]) {
  for (const side of [-1, 1]) {
    const id = (x < 0 ? '-front' : '-rear') + (side < 0 ? '-left' : '-right');
    cast('foot' + id, bar(x, side * 430, 220, 260, 200, AX - R + 40 - 220 + 120));
    rubber('anti-vibration-mount' + id, cylinder(80, 110, 14).translate(x, side * 430, 60));
  }
}
for (const side of [-1, 1]) {
  painted('base-rail' + (side < 0 ? '-left' : '-right'), bar(-40, side * 430, 140, 1700, 240, 80));
  painted('base-web' + (side < 0 ? '-left' : '-right'), bar(-40, side * 430, 0, 1700, 60, 60));
}
painted('base-cross-front', bar(-760, 0, 140, 160, 860, 80));
painted('base-cross-rear', bar(680, 0, 140, 160, 860, 80));

return p.model();
