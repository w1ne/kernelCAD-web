// SPDX-License-Identifier: CC0-1.0
// Aerosol-can safety drum: the 205-litre steel drum a recovery site uses to
// depressurise spent aerosol cans before the steel is recycled. What makes it
// an aerosol drum rather than any drum: a can-puncturing unit screwed into
// the 2-inch bung of the lid, with a can holder sleeve, a lever-and-pin
// puncturer and a grounding wire, plus a carbon filter cartridge in the
// small bung that catches the propellant. The drum has rolled chimes and two
// rolling hoops, a flammable diamond and a waste label, and stands on a
// yellow polyethylene spill pallet with a grated deck.
// Generic visualization geometry at about real size (drum 585 mm dia x
// 880 mm), millimetres, Z up, labels on -Y.

meta({
  name: "aerosol-can-safety-drum",
  license: 'CC0-1.0',
  title: "Aerosol-can safety drum",
  description: "Aerosol can puncturing drum at about real size: 205-litre steel drum with rolled chimes and rolling hoops, lid-mounted can puncturing unit with holder sleeve, lever and grounding wire, carbon filter cartridge in the small bung, flammable diamond and waste label, on a yellow polyethylene spill pallet with grated deck. Material controls: drum paint, spill pallet, puncturer and filter. Optional can loaded in the puncturer. safetyRed, steelGrey and weathered presets.",
  tags: ['aerosol', 'aerosol can', 'puncturing drum', 'drum', '205 litre drum', 'spill pallet', 'hazardous waste', 'containers', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const drumPaint = param('drumPaint', '#b8322a', { label: 'Drum (painted steel)' });
const spillPallet = param('spillPallet', '#e6b622', { label: 'Spill pallet (polyethylene)' });
const puncturer = param('puncturer', '#9aa3a6', { label: 'Puncturing unit (aluminium)' });
const filter = param('filter', '#2c3034', { label: 'Filter cartridge and seals' });
const canLoaded = param('canLoaded', true, { label: 'Can loaded in puncturer' });

presets({
  safetyRed: { drumPaint: '#b8322a', spillPallet: '#e6b622', puncturer: '#9aa3a6', filter: '#2c3034' },
  steelGrey: { drumPaint: '#5f6b72', spillPallet: '#2f6db0', puncturer: '#c3c8c9', filter: '#e2e0d8' },
  weathered: { drumPaint: '#7c3a2c', spillPallet: '#b8953a', puncturer: '#7d8079', filter: '#3a3632' },
});

const p = assembly("aerosol-can-safety-drum");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Spill pallet: moulded sump with a sloped lip, four feet and a grated deck.
const PW = 760;
const PH = 300;
add("sump", extrudeRoundedRect(PW, PW, 60, PH - 40).translate(0, 0, 40).subtract(extrudeRoundedRect(PW - 70, PW - 70, 40, PH).translate(0, 0, 80)).color(spillPallet));
add("sump-lip", extrudeRoundedRect(PW + 30, PW + 30, 70, 24).translate(0, 0, PH - 24).subtract(extrudeRoundedRect(PW - 70, PW - 70, 40, 60).translate(0, 0, PH - 40)).color(spillPallet));
for (const [x, y] of [[-260, -260], [260, -260], [-260, 260], [260, 260]]) add(`pallet-foot-${x}-${y}`, blk(x, y, 0, 140, 140, 50).color(spillPallet));
add("fork-channel", blk(0, 0, 0, PW - 200, 120, 40).color(spillPallet));
for (let i = -4; i <= 4; i++) add(`grate-x-${i}`, blk(i * 80, 0, PH - 40, 18, PW - 70, 24).color(spillPallet));
for (const y of [-240, 0, 240]) add(`grate-y-${y}`, blk(0, y, PH - 40, PW - 70, 18, 24).color(spillPallet));

// The drum: rolled chimes top and bottom, two rolling hoops, slightly domed lid.
const DZ = PH - 16;
const R = 292;
const H = 880;
add("drum-body", cylinder(H, R, 28).translate(0, 0, DZ).color(drumPaint));
for (const z of [0, H - 22]) add(`chime-${z}`, cylinder(22, R + 8, 28).translate(0, 0, DZ + z).color(drumPaint));
for (const z of [H * 0.33, H * 0.66]) add(`rolling-hoop-${Math.round(z)}`, torus(R + 4, 12, 24).translate(0, 0, DZ + z).color(drumPaint));
add("lid-dome", turned([[0, 0], [R - 20, 0], [R - 40, 10], [0, 18]]).translate(0, 0, DZ + H - 4).color(drumPaint));

// Small bung: carbon filter cartridge with a ribbed body and cap.
const TOPZ = DZ + H + 10;
add("filter-bung", cylinder(20, 40, 16).translate(180, 120, TOPZ).color(puncturer));
add("filter-cartridge", turned([[0, 0], [62, 0], [70, 20], [70, 260], [60, 280], [0, 280]]).translate(180, 120, TOPZ + 20).color(filter));
for (const z of [70, 140, 210]) add(`filter-rib-${z}`, cylinder(12, 74, 14).translate(180, 120, TOPZ + 14 + z).color(puncturer));
add("filter-label", blk(180, 50, TOPZ + 110, 70, 6, 90).rotateZ(-30).color('#e9e6dc'));

// Large bung: the puncturing unit, can holder, lever, pin housing.
const PX = -120;
const PY = -60;
add("puncturer-base", turned([[0, 0], [70, 0], [70, 30], [55, 50], [0, 50]]).translate(PX, PY, TOPZ).color(puncturer));
add("puncturer-housing", blk(PX, PY, TOPZ + 50, 160, 120, 90).color(puncturer));
add("can-sleeve", turned([[0, 0], [52, 0], [52, 230], [60, 240], [60, 250], [44, 250], [44, 10], [0, 10]]).translate(PX, PY, TOPZ + 140).color(puncturer));
add("lever-pivot", cylinder(60, 18, 12).rotateX(90).translate(PX + 80, PY + 30, TOPZ + 110).color(filter));
add("lever-arm", blk(0, 0, 0, 320, 26, 26).rotateY(-28).translate(PX + 220, PY, TOPZ + 160).color(puncturer));
add("lever-grip", cylinder(110, 20, 12).rotateY(90).rotateY(-28).translate(PX + 330, PY, TOPZ + 210).color(filter));
add("seal-ring", cylinder(10, 62, 16).translate(PX, PY, TOPZ + 134).color(filter));
if (canLoaded.value) {
  add("aerosol-can", turned([[0, 0], [33, 0], [33, 170], [26, 190], [10, 200], [10, 214], [0, 214]]).rotateX(180).translate(PX, PY, TOPZ + 380).color('#d9d9d2'));
  add("can-band", cylinder(60, 34, 16).translate(PX, PY, TOPZ + 290).color('#3f7fb8'));
}
// Grounding strap from the lower chime to a clip on the pallet lip.
add("ground-clip", blk(-PW / 2 - 10, 0, PH - 40, 30, 60, 60).color(puncturer));
add("ground-strap", blk(-(R + PW / 2) / 2 - 4, 0, PH + 4, R - PW / 2 + 40, 20, 6).color('#3a8a3a'));

// Labels on the front face: flammable diamond and a waste label.
add("flammable-diamond-border", box(170, 4, 170, true).rotateY(45).translate(0, -R - 2, DZ + 600).rotateZ(-15).color('#f2f0ea'));
add("flammable-diamond", box(150, 4, 150, true).rotateY(45).translate(0, -R - 5, DZ + 600).rotateZ(-15).color('#d6372b'));
add("waste-label", blk(0, -R - 3, DZ + 380, 200, 4, 150).rotateZ(-55).color('#f2f0ea'));
add("waste-label-band", blk(0, -R - 6, DZ + 490, 200, 4, 34).rotateZ(-55).color('#e6b622'));

return p.model();
