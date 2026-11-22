// SPDX-License-Identifier: CC0-1.0
// Hard-sided pet carrier: the airline-style crate clinics see every day. A
// deep base tray and a tapered top shell clamp together at a lipped seam with
// wing-nut bolts; the top shell carries vent slots down both sides and an
// arched carry handle. The front is a recessed doorway closed by a chromed
// wire grille door with a squeeze latch. The two-tone split shell, slotted
// sides and wire door are what make it a carrier rather than a crate or box.
// Generic visualization geometry at real size, millimetres, Z up, base on
// z = 0, door facing -Y. Size choice follows common small/medium/large crates.
meta({
  name: "hard-sided-pet-carrier",
  license: 'CC0-1.0',
  title: "Hard-sided pet carrier",
  description: "Airline-style hard pet carrier: a deep base tray and tapered top shell joined at a lipped seam with wing-nut bolts, vent slots along both sides, a recessed doorway with a chromed wire grille door and squeeze latch, and an arched carry handle. Material controls: top shell, base tray, chromed wire door, rubber handle and fittings. Size choice; clinicClean and softTeal presets.",
  tags: ["veterinary", "animal clinic", "animal health", "hard-sided", "pet", "carrier", "crate", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Carrier size' });
const polymerColor = param('polymerColor', '#d9dcd6', { label: 'Top shell' });
const baseColor = param('baseColor', '#5f6d72', { label: 'Base tray' });
const stainlessSteelColor = param('stainlessSteelColor', '#c3cbc9', { label: 'Chromed wire door' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber handle and fittings' });

presets({
  clinicClean: { polymerColor: '#f1f3ef', baseColor: '#8fa3a8', stainlessSteelColor: '#d8dfdd', rubberColor: '#46545a' },
  softTeal: { polymerColor: '#9bbfc0', baseColor: '#3f6064', stainlessSteelColor: '#b7c2c0', rubberColor: '#263235' },
});

// Medium crate is 390 x 580 x 370 mm; small and large stretch it per axis.
const k = { small: [0.82, 0.8, 0.82], medium: [1, 1, 1], large: [1.18, 1.22, 1.2] }[size.value];
const p = assembly("hard-sided-pet-carrier");
const add = (name, shape) => p.part(name, shape.scale(k).scale(scale));

// Rounded rectangle w x d with corner radius r, as a closed path.
const rrect = (w, d, r) => {
  const pts = [];
  for (const [cx, cy, a0] of [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, 90], [-w / 2 + r, -d / 2 + r, 180], [w / 2 - r, -d / 2 + r, 270]]) {
    for (let i = 0; i <= 3; i += 1) {
      const a = ((a0 + i * 30) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) pb = pb.lineTo(x, y);
  return pb.close();
};
// Stack rounded rectangles: stations are [z, w, d, r].
const shell = (st) =>
  rrect(st[0][1], st[0][2], st[0][3]).loft(st.slice(1).map(([, w, d, r]) => rrect(w, d, r)), {
    planes: st.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })),
    ruled: true,
  });
// Round rod from p0 to p1.
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  let pb = path().moveTo(r, 0);
  for (let i = 1; i < n; i += 1) pb = pb.lineTo(r * Math.cos((i / n) * Math.PI * 2), r * Math.sin((i / n) * Math.PI * 2));
  const ring = pb.close();
  let pc = path().moveTo(r, 0);
  for (let i = 1; i < n; i += 1) pc = pc.lineTo(r * Math.cos((i / n) * Math.PI * 2), r * Math.sin((i / n) * Math.PI * 2));
  return ring
    .loft([pc.close()], { planes: [{ plane: 'XY', origin: [0, 0, 0] }, { plane: 'XY', origin: [0, 0, len] }], ruled: true })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Doorway recess cut into the front of both shells.
const doorway = box(270, 60, 250, true).translate(0, -290, 170);

// Base tray with a feet rim, and the seam lip it shares with the top shell.
add('base-tray', shell([[0, 360, 550, 40], [10, 378, 568, 44], [176, 390, 580, 48]]).subtract(doorway).color(baseColor));
add('seam-lip', shell([[168, 412, 602, 54], [184, 412, 602, 54]]).subtract(doorway).color(baseColor));

// Top shell tapering into a rounded roof, with vent slots down both sides.
let top = shell([[180, 390, 580, 48], [300, 374, 564, 50], [348, 330, 512, 60], [370, 270, 450, 60]]).subtract(doorway);
for (const s of [-1, 1]) {
  for (let i = 0; i < 6; i += 1) {
    top = top.subtract(box(30, 34, 74, true).translate(s * 192, -170 + i * 68, 252));
  }
}
add('top-shell', top.color(polymerColor));

// Chromed wire grille door: frame, nine uprights and two cross wires.
const yd = -294;
add('door-frame-top', rod([-128, yd, 290], [128, yd, 290], 5).color(stainlessSteelColor));
add('door-frame-bottom', rod([-128, yd, 50], [128, yd, 50], 5).color(stainlessSteelColor));
add('door-frame-left', rod([-128, yd, 50], [-128, yd, 290], 5).color(stainlessSteelColor));
add('door-frame-right', rod([128, yd, 50], [128, yd, 290], 5).color(stainlessSteelColor));
for (let i = 0; i < 9; i += 1) {
  const x = -100 + i * 25;
  add(`door-wire-${i + 1}`, rod([x, yd, 50], [x, yd, 290], 2.5).color(stainlessSteelColor));
}
for (const z of [130, 210]) add(`door-cross-${z}`, rod([-128, yd - 3, z], [128, yd - 3, z], 2.5).color(stainlessSteelColor));
add('door-hinge-pin', rod([-136, yd, 40], [-136, yd, 300], 4).color(stainlessSteelColor));
add('squeeze-latch', box(26, 22, 70, true).translate(140, yd - 4, 170).color(rubberColor));

// Arched carry handle on two roof mounts.
const arch = [[0, -120, 368], [0, -95, 410], [0, -40, 428], [0, 40, 428], [0, 95, 410], [0, 120, 368]];
for (let i = 0; i < arch.length - 1; i += 1) add(`handle-${i + 1}`, rod(arch[i], arch[i + 1], 11, 8).color(rubberColor));
add('handle-mount-front', box(60, 50, 12, true).translate(0, -120, 370).color(rubberColor));
add('handle-mount-rear', box(60, 50, 12, true).translate(0, 120, 370).color(rubberColor));

// Wing-nut bolts clamping the seam, two per side.
for (const s of [-1, 1]) {
  for (const y of [-180, 180]) {
    add(`wing-nut-${s < 0 ? 'left' : 'right'}-${y < 0 ? 'front' : 'rear'}`, box(18, 44, 22, true).translate(s * 212, y, 176).color(rubberColor));
  }
}

return p.model();
