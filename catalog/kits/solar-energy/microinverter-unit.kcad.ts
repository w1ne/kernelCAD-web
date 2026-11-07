// Microinverter unit: a module-level inverter that clips under one PV panel
// and turns its DC into grid AC.
// What makes it one rather than a box: a flat potted aluminium case with
// rounded corners and a chamfered lid, a raised label plate, a steel mounting
// flange with a bolt slot that grabs a short section of racking rail, two
// short DC leads ending in paired MC4 connectors (male and female), and an AC
// lead running to a trunk-cable connector.
// Generic visualization geometry at real size (case about 212 x 175 x 30 mm),
// millimetres, Z up, rail resting on z = 0.
meta({
  name: 'microinverter-unit',
  license: 'CC0-1.0',
  title: 'Microinverter unit',
  description: 'Module-level PV microinverter at real size, bolted to a short section of racking rail: flat rounded aluminium case with a chamfered lid and label plate, steel mounting flange with bolt, two DC leads ending in MC4 connectors, AC lead to a trunk-cable connector. Lead choice single or dual (two-module) DC inputs. Material controls: case aluminium, mounting steel, cable rubber, connector polymer, label; enphaseGrey, silverCase and weathered presets.',
  tags: ['microinverter', 'module-level inverter', 'MC4', 'PV racking', 'photovoltaic', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const inputs = param('inputs', 'single', { choices: ['single', 'dual'], label: 'DC inputs' });
const caseAluminum = param('caseAluminum', '#3b4246', { label: 'Case aluminium' });
const mountingSteel = param('mountingSteel', '#b9c1c4', { label: 'Mounting flange, bolt and rail' });
const cableRubber = param('cableRubber', '#1d2124', { label: 'Cable rubber' });
const connectorPolymer = param('connectorPolymer', '#2b3033', { label: 'Connector polymer' });
const label = param('label', '#e08a2c', { label: 'Label plate' });
presets({
  enphaseGrey: { caseAluminum: '#55595c', label: '#f08a24', connectorPolymer: '#3a3f42' },
  silverCase: { caseAluminum: '#b3babd', label: '#1f5d8f', mountingSteel: '#8d979a' },
  weathered: { caseAluminum: '#4c4f4c', mountingSteel: '#8f9289', cableRubber: '#2e302d', label: '#a8784a' },
});

const p = assembly('microinverter-unit');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Rounded rectangle outline in XY.
const rrect = (w, d, r, seg = 4) => {
  const pts = [];
  for (const [cx, cy, a0] of [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, 90], [-w / 2 + r, -d / 2 + r, 180], [w / 2 - r, -d / 2 + r, 270]]) {
    for (let i = 0; i <= seg; i += 1) {
      const a = ((a0 + (i * 90) / seg) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
};
// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Lead from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// MC4 connector body lying along X: hex nut, ribbed sleeve, nose.
const mc4 = (x, y, z, dir, male) => {
  const prof = male
    ? [[0, 0], [7, 0], [7, 18], [9.5, 18], [9.5, 34], [6, 34], [6, 52], [0, 52]]
    : [[0, 0], [7, 0], [7, 18], [10, 18], [10, 46], [8, 52], [0, 52]];
  return turned(prof).rotateY(dir > 0 ? 90 : -90).translate(x, y, z);
};

// Short section of strut rail the unit is bolted to: 41 mm top-hat channel along Y.
const RAIL = [[-20, 0], [20, 0], [20, 35], [12, 35], [12, 41], [6, 41], [6, 30], [-6, 30], [-6, 41], [-12, 41], [-12, 35], [-20, 35]];
add('rail', extrudePolygon(RAIL, 320).rotateX(90).translate(-150, 160, 0).color(mountingSteel));

// Mounting flange: bent steel tab with a bolt slot, clamped to the rail.
const ZC = 46;
add('flange', box(70, 52, 4, true).translate(-145, 0, 43).color(mountingSteel));
add('flange-web', box(4, 52, ZC - 41, true).translate(-112, 0, 41 + (ZC - 41) / 2).color(mountingSteel));
add('flange-bolt-head', turned([[0, 0], [9, 0], [9, 6], [0, 6]]).translate(-150, 0, 45).color(mountingSteel));
add('flange-washer', cylinder(1.6, 12, 12).translate(-150, 0, 45).color(mountingSteel));

// Potted case: rounded plan, straight walls, chamfered lid, raised label plate.
const CW = 212;
const CD = 175;
add('case-body', extrudePolygon(rrect(CW, CD, 16), 22).translate(0, 0, ZC).color(caseAluminum));
add('case-lid', extrudePolygon(rrect(CW - 12, CD - 12, 12), 8).translate(0, 0, ZC + 22).color(caseAluminum));
add('case-skirt', extrudePolygon(rrect(CW + 4, CD + 4, 18), 3).translate(0, 0, ZC).color(caseAluminum));
add('label-plate', extrudePolygon(rrect(96, 58, 6), 1.2).translate(10, 0, ZC + 30).color(label));
for (const [i, y] of [-40, 40].entries()) {
  add(`lid-rib-${i}`, alongX([[y - 2, 0], [y + 2, 0], [y + 1, 2], [y - 1, 2]], -80, 160).translate(0, 0, ZC + 30).color(caseAluminum));
}

// DC leads out of the +X end, each ending in an MC4 pair.
const leads = inputs.value === 'dual' ? [-50, -18, 18, 50] : [-22, 22];
leads.forEach((y, i) => {
  const male = i % 2 === 0;
  add(`dc-gland-${i}`, cylinder(10, 8, 8).rotateY(90).translate(CW / 2 - 2, y, ZC + 11).color(connectorPolymer));
  add(`dc-lead-${i}`, rod([CW / 2 + 8, y, ZC + 11], [CW / 2 + 120, y * 1.4, ZC - 4], 3.2, 6).color(cableRubber));
  add(`mc4-${i}`, mc4(CW / 2 + 120, y * 1.4, ZC - 4, 1, male).color(connectorPolymer));
});

// AC lead out of the -Y side to a trunk-cable connector on the trunk cable below.
add('ac-gland', cylinder(12, 10, 8).rotateX(90).translate(40, -CD / 2 + 2, ZC + 11).color(connectorPolymer));
add('ac-lead', rod([40, -CD / 2 - 10, ZC + 11], [72, -CD / 2 - 132, 14], 4.5, 6).color(cableRubber));
add('ac-connector', box(56, 30, 26, true).rotateZ(20).translate(80, -CD / 2 - 150, 13).color(connectorPolymer));
add('ac-connector-latch', box(26, 18, 6, true).rotateZ(20).translate(80, -CD / 2 - 150, 29).color(label));
add('trunk-cable', rod([-180, -CD / 2 - 178, 6], [300, -CD / 2 - 122, 6], 6, 8).color(cableRubber));

return p.model();
