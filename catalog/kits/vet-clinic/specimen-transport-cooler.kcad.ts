// SPDX-License-Identifier: CC0-1.0
// Specimen transport cooler: the insulated box a clinic uses to send blood,
// tissue and vaccine samples to the lab cold. A moulded body with rounded
// corners tapers slightly towards its feet. A domed lid sits on a rubber
// gasket and is held by two front draw latches. A digital temperature
// display is set into the front, and grip pockets are moulded into the ends.
// The lid is carried by a swing bail handle or a shoulder strap. The
// two-tone domed lid, latches and display are what make it a cooler.
// Generic visualization geometry at real size (about 20 L), millimetres,
// Z up, feet on z = 0, display facing -Y.
meta({
  name: "specimen-transport-cooler",
  license: 'CC0-1.0',
  title: "Specimen transport cooler",
  description: "Insulated specimen transport cooler: a rounded tapered moulded body on rubber feet with end grip pockets, a domed contrasting lid on a rubber gasket with two front draw latches, a recessed digital temperature display, and a swing bail handle or shoulder strap. Material controls: moulded body, moulded lid, display glass, rubber gasket and fittings. Carry choice; clinicClean and softTeal presets.",
  tags: ["veterinary", "animal clinic", "animal health", "specimen", "transport", "cooler", "laboratory", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const carry = param('carry', 'bail', { choices: ['bail', 'strap'], label: 'Carry handle' });
const polymerColor = param('polymerColor', '#e6ebe8', { label: 'Moulded body' });
const lidColor = param('lidColor', '#2f7fa8', { label: 'Moulded lid and handle' });
const glassColor = param('glassColor', '#1f3d47', { label: 'Display glass' });
const rubberColor = param('rubberColor', '#30383b', { label: 'Rubber gasket and fittings' });

presets({
  clinicClean: { polymerColor: '#f4f6f3', lidColor: '#8fb7c4', glassColor: '#2a4e58', rubberColor: '#56646a' },
  softTeal: { polymerColor: '#9bbfc0', lidColor: '#2f5f66', glassColor: '#183238', rubberColor: '#263235' },
});

const p = assembly("specimen-transport-cooler");
const add = (name, shape) => p.part(name, shape.scale(scale));

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
// Round polygon of n points.
const circle = (r, n = 8) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Chain of rods through a polyline.
const chain = (name, pts, r, n, colour) => {
  for (let i = 0; i < pts.length - 1; i += 1) add(`${name}-${i + 1}`, rod(pts[i], pts[i + 1], r, n).color(colour));
};

// Rubber feet under the corners.
for (const [x, y] of [[-160, -100], [160, -100], [-160, 100], [160, 100]]) {
  add(`foot-${x < 0 ? 'left' : 'right'}-${y < 0 ? 'front' : 'rear'}`, box(50, 40, 10, true).translate(x, y, 5).color(rubberColor));
}

// Moulded body tapering towards the feet, with grip pockets in both ends.
let body = shell([[8, 396, 276, 40], [30, 410, 290, 44], [300, 420, 300, 46]]);
for (const s of [-1, 1]) body = body.subtract(box(40, 150, 46, true).translate(s * 210, 0, 236));
add('body', body.color(polymerColor));
add('gasket', shell([[298, 428, 308, 48], [310, 428, 308, 48]]).color(rubberColor));

// Domed lid with an overhanging skirt.
add('lid', shell([[308, 436, 316, 50], [334, 436, 316, 50], [352, 404, 284, 48], [362, 340, 222, 44]]).color(lidColor));

// Two draw latches across the gasket on the front.
for (const x of [-120, 120]) {
  const tag = x < 0 ? 'left' : 'right';
  add(`latch-keeper-${tag}`, box(46, 10, 22, true).translate(x, -162, 322).color(lidColor));
  add(`latch-lever-${tag}`, box(40, 10, 64, true).translate(x, -156, 282).color(rubberColor));
}

// Digital temperature display recessed into the front.
add('display-bezel', box(130, 10, 74, true).translate(0, -148, 190).color(rubberColor));
add('display-glass', box(102, 4, 46, true).translate(0, -154, 194).color(glassColor));
add('display-button', box(18, 6, 10, true).translate(42, -154, 164).color(lidColor));

// Hinge pivots on the ends carry the bail or the strap lugs.
for (const s of [-1, 1]) {
  add(`pivot-${s < 0 ? 'left' : 'right'}`, rod([s * 208, 0, 282], [s * 228, 0, 282], 20, 10).color(lidColor));
}
if (carry.value === 'bail') {
  const bail = [[-226, 0, 282], [-226, 0, 360], [-200, 0, 404], [-140, 0, 420], [140, 0, 420], [200, 0, 404], [226, 0, 360], [226, 0, 282]];
  chain('bail', bail, 10, 8, lidColor);
  add('bail-grip', rod([-90, 0, 421], [90, 0, 421], 17, 10).color(rubberColor));
} else {
  const strap = [[-232, 0, 282], [-232, 0, 420], [-200, 0, 560], [-120, 0, 650], [0, 0, 680], [120, 0, 650], [200, 0, 560], [232, 0, 420], [232, 0, 282]];
  chain('strap', strap, 12, 4, rubberColor);
  add('strap-pad', box(150, 50, 12, true).translate(0, 0, 690).color(rubberColor));
}

return p.model();
