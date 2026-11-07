// SPDX-License-Identifier: CC0-1.0
// Floor-to-ceiling laboratory service turret (utility pole).
// What makes it a service turret rather than a pillar: a rounded aluminium
// column running from a flared floor shroud to a ceiling trim collar, with
// duplex power outlets and a data plate on the bench-facing side, and on
// each flank a ladder of chrome laboratory cocks with serrated hose barbs,
// lever handles and colour-coded service index buttons for gas, compressed
// air and vacuum. Generic visualization geometry at real size (2.7 m floor
// to ceiling), millimetres, Z up, outlets facing -Y, floor on z = 0.
meta({
  name: 'laboratory-utility-turret',
  license: 'CC0-1.0',
  title: 'Laboratory utility turret',
  description: 'Floor-to-ceiling service turret: rounded column between a flared floor shroud and ceiling collar, duplex power outlets and data plate facing the bench, and chrome laboratory cocks with hose barbs, colour-coded lever handles, index buttons and labels for gas, air and vacuum on both flanks. Material controls: column enamel, fitting chrome, faceplate polymer, gas, air and vacuum service codes. Cleanroom, high-visibility and European-code presets.',
  tags: ['service turret', 'utility pole', 'service column', 'gas cock', 'outlet', 'laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 3200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Column enamel' });
const chrome = param('chrome', '#b8c7ca', { label: 'Cock, barb and collar chrome' });
const faceplate = param('faceplate', '#3a464d', { label: 'Outlet faceplate polymer' });
const gasCode = param('gasCode', '#2d62b5', { label: 'Gas service code' });
const airCode = param('airCode', '#e5a331', { label: 'Compressed-air service code' });
const vacuumCode = param('vacuumCode', '#e8d21f', { label: 'Vacuum service code' });
presets({
  cleanroom: { enamel: '#e7f0ed', chrome: '#d0d9d8', faceplate: '#f2f4f2', gasCode: '#3d78c8', airCode: '#23a5a2', vacuumCode: '#c9c94a' },
  highVisibility: { enamel: '#f0f2e8', chrome: '#6f8488', faceplate: '#1f2a30', gasCode: '#1b4fd0', airCode: '#ff7a00', vacuumCode: '#ffe000' },
  europeanCode: { enamel: '#d8d4c8', chrome: '#a9b2b3', faceplate: '#e9e7e0', gasCode: '#e8c51f', airCode: '#2f8fd0', vacuumCode: '#4d9a45' },
});

const p = assembly('laboratory-utility-turret');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Round bar from p0 to p1.
const rod = (p0, p1, r, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Rounded rectangle centred on the origin.
const roundRect = (w, h, r, n = 3) => {
  const pts = [];
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i += 1) {
      const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
};

const W = 300;
const D = 220;
const H = 2700;

// Column between a flared floor shroud and a ceiling trim collar.
add('floor-shroud', extrudePolygon(roundRect(W + 120, D + 120, 70), 30).color(faceplate));
add('shroud-cap', extrudePolygon(roundRect(W + 60, D + 60, 55), 90).translate(0, 0, 30).color(enamel));
add('column', extrudePolygon(roundRect(W, D, 40), H - 180).translate(0, 0, 120).color(enamel));
add('ceiling-collar', extrudePolygon(roundRect(W + 90, D + 90, 60), 60).translate(0, 0, H - 60).color(chrome));
for (const s of [-1, 1]) {
  add(`front-reveal-${s}`, box(6, 4, H - 300, true).translate(s * (W / 2 - 50), -D / 2 - 1, H / 2 + 30).color(faceplate));
}

// Bench-facing electrical: two duplex outlets and a data plate.
const FY = -D / 2;
for (const z of [1080, 1300]) {
  add(`outlet-plate-${z}`, extrudePolygon(roundRect(120, 190, 10, 1), 10).rotateX(90).translate(0, FY, z - 95).color(faceplate));
  for (const dz of [-45, 45]) {
    add(`receptacle-${z}-${dz}`, extrudePolygon(roundRect(70, 60, 14, 1), 6).rotateX(90).translate(0, FY - 10, z + dz - 30).color(enamel));
  }
}
add('data-plate', extrudePolygon(roundRect(110, 120, 10, 1), 10).rotateX(90).translate(0, FY, 1500).color(faceplate));
for (const dx of [-25, 25]) add(`data-jack-${dx}`, box(34, 6, 30, true).translate(dx, FY - 12, 1560).color(chrome));

// Laboratory cocks on both flanks with colour-coded index buttons.
const services = [[1450, gasCode], [1250, airCode], [1050, vacuumCode]];
for (const s of [-1, 1]) {
  const fx = s * (W / 2);
  for (const [z, code] of services) {
    const tag = `${s}-${z}`;
    add(`cock-flange-${tag}`, turned([[0, 0], [34, 0], [34, 10], [20, 16], [0, 16]]).rotateY(90 * s).translate(fx, 0, z).color(chrome));
    add(`cock-body-${tag}`, rod([fx, 0, z], [fx + s * 85, 0, z], 16, 10).color(chrome));
    add(`cock-bonnet-${tag}`, turned([[0, 0], [20, 0], [20, 36], [12, 44], [0, 44]]).translate(fx + s * 60, 0, z + 10).color(chrome));
    add(`cock-handle-${tag}`, box(20, 130, 16, true).translate(fx + s * 60, -30, z + 58).color(code));
    add(`index-button-${tag}`, turned([[0, 0], [17, 0], [17, 8], [0, 9]]).translate(fx + s * 60, 0, z + 62).color(code));
    add(`hose-barb-${tag}`, turned([[0, 0], [12, 0], [12, 10], [8, 14], [12, 18], [8, 24], [12, 28], [7, 42], [0, 42]]).rotateY(180).translate(fx + s * 85, 0, z - 8).color(chrome));
    add(`service-label-${tag}`, box(6, 150, 56, true).translate(fx + s * 3, 0, z - 80).color(code));
  }
}

return p.model();
