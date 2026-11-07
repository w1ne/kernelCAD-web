// Pole-mount transformer: the distribution transformer that steps a feeder down
// to service voltage where a solar plant or rooftop array ties into the grid.
// What makes it a pole-mount "can" rather than a cylinder on a stick: a tapered
// timber pole with a braced crossarm, porcelain pin insulators carrying the line,
// a fused cutout with jumpers down to a lid bushing, a round tank with a domed
// lid and stiffener ring hung on a bracket, side low-voltage bushings with the
// service drop, a nameplate and a ground wire running down the pole.
// Generic visualization geometry at real size (pole about 7.6 m above grade),
// millimetres, Z up, pole butt on z = 0.
meta({
  name: 'pole-mount-transformer',
  license: 'CC0-1.0',
  title: 'Pole-mount transformer',
  description: 'Overhead distribution transformer on a tapered timber pole: braced crossarm with porcelain pin insulators and line conductors, fused cutout with jumpers, round tank with domed lid, stiffener ring, hanger bracket, lid HV bushing, side LV bushings with service drop, nameplate and pole ground wire. Material controls: treated wood, tank paint, porcelain, galvanized hardware. Tank size 25, 50 or 100 kVA; fieldService and highVisibility presets.',
  tags: ['pole-mount transformer', 'distribution transformer', 'utility pole', 'grid tie', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 2000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const rating = param('rating', '50kva', { choices: ['25kva', '50kva', '100kva'], label: 'Tank size' });
const wood = param('wood', '#856849', { label: 'Treated wood pole and crossarm' });
const powderCoat = param('powderCoat', '#8f9a98', { label: 'Transformer tank paint' });
const ceramic = param('ceramic', '#eee8d8', { label: 'Porcelain insulators and bushings' });
const hardware = param('hardware', '#5c6366', { label: 'Galvanized brackets, braces and wires' });
presets({
  fieldService: { wood: '#755b43', powderCoat: '#7a807b', ceramic: '#e7e0ce', hardware: '#4f5659' },
  highVisibility: { wood: '#8a6440', powderCoat: '#a9b8b4', ceramic: '#8a4b2c', hardware: '#6c7477' },
});

const p = assembly("pole-mount-transformer");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Round polygon of n points.
const circle = (r, n = 10) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Closed path round a circle, for lofting.
const ring = (r, n) => {
  const pts = circle(r, n);
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) pb = pb.lineTo(x, y);
  return pb.close();
};
// Porcelain pin insulator with two skirts, base at z = 0.
const pinInsulator = () => turned([[0, 0], [22, 0], [64, 50], [30, 72], [56, 100], [28, 120], [0, 146]]);

// Tapered timber pole and its top cap.
const TOP = 7600;
add('utility-pole', ring(140, 14).loft(ring(104, 14), { spacing: TOP, ruled: true }).color(wood));
add('pole-top-cap', turned([[0, TOP], [108, TOP], [96, TOP + 24], [0, TOP + 34]]).color(hardware));

// Crossarm across the line on the -Y face, with two diagonal braces to the pole.
const ARM = 7180;
add('crossarm', box(2400, 90, 115, true).translate(0, -160, ARM).color(wood));
add('crossarm-through-bolt', rod([0, -215, ARM], [0, 120, ARM], 9, 6).color(hardware));
for (const s of [-1, 1]) {
  add(`crossarm-brace-${s < 0 ? 'left' : 'right'}`, rod([s * 700, -160, ARM - 55], [0, -125, ARM - 620], 14, 6).color(hardware));
}

// Line insulators: two on the arm, one pole-top pin, each carrying a conductor.
const LINE = [[-1050, -160, ARM + 58], [1050, -160, ARM + 58], [0, 0, TOP + 34]];
LINE.forEach(([x, y, z], i) => {
  add(`insulator-${i}-pin`, rod([x, y, z], [x, y, z + 40], 12, 6).color(hardware));
  add(`insulator-${i}`, pinInsulator().translate(x, y, z + 20).color(ceramic));
  add(`line-conductor-${i}`, rod([x, -1600, z + 160], [x, 1600, z + 160], 9, 6).color(hardware));
});

// Tank size by kVA rating; the tank hangs on the +Y face of the pole.
const [R, H] = rating.value === '25kva' ? [260, 820] : rating.value === '100kva' ? [380, 1180] : [320, 1000];
const TY = 125 + 60 + R;
const TB = 5400;
const TT = TB + H;
add('transformer-tank', turned([[0, TB - 20], [R - 30, TB - 20], [R, TB + 20], [R, TT], [R + 14, TT + 8], [R + 14, TT + 36], [R - 20, TT + 44], [R * 0.55, TT + 110], [0, TT + 124]]).translate(0, TY, 0).color(powderCoat));
add('tank-stiffener-ring', rod([0, TY, TB + H * 0.42], [0, TY, TB + H * 0.42 + 30], R + 12, 18).color(powderCoat));
add('hanger-bracket', box(220, 70, H * 0.8, true).translate(0, 150, TB + H * 0.5).color(hardware));
for (const [k, z] of [['upper', TB + H * 0.8], ['lower', TB + H * 0.25]]) {
  add(`hanger-bolt-${k}`, rod([0, -150, z], [0, 190, z], 11, 6).color(hardware));
}
add('nameplate', box(170, 8, 110, true).translate(0, TY + R + 4, TB + H * 0.62).color(ceramic));
add('drain-valve', rod([0, TY + R - 10, TB + 90], [0, TY + R + 50, TB + 90], 18, 6).color(hardware));

// High-voltage bushing on the lid, fed through the cutout from the left line.
const HV = [0, TY, TT + 118];
add('hv-bushing', turned([[0, 0], [34, 0], [58, 44], [36, 64], [52, 96], [24, 128], [0, 138]]).translate(...HV).color(ceramic));
add('hv-terminal', rod([HV[0], HV[1], HV[2] + 132], [HV[0], HV[1], HV[2] + 182], 10, 6).color(hardware));
add('cutout-bracket', box(80, 360, 70, true).translate(-560, -340, ARM - 430).color(hardware));
add('cutout-body', turned([[0, -230], [40, -230], [54, -120], [40, -20], [54, 80], [40, 190], [0, 230]]).rotateX(-14).translate(-560, -470, ARM - 430).color(ceramic));
add('cutout-fuse-tube', rod([-560, -560, ARM - 660], [-560, -470, ARM - 200], 22, 8).color(powderCoat));
add('cutout-top-jumper', rod([-1050, -160, ARM + 218], [-560, -470, ARM - 180], 8, 6).color(hardware));
add('cutout-to-bushing-jumper', rod([-560, -560, ARM - 660], [HV[0], HV[1], HV[2] + 182], 8, 6).color(hardware));
const AR = [R * 0.8, TY - R * 0.2, TT - 160];
add('surge-arrester', rod(AR, [AR[0], AR[1], AR[2] + 220], 30, 8).color(ceramic));
[50, 110, 170].forEach((dz, i) => {
  add(`surge-arrester-shed-${i}`, rod([AR[0], AR[1], AR[2] + dz], [AR[0], AR[1], AR[2] + dz + 14], 46, 10).color(ceramic));
});
add('arrester-bracket', box(60, R * 0.5, 40, true).translate(R * 0.8, TY - R * 0.45, TT - 170).color(hardware));

// Low-voltage bushings on the +X side and the triplex service drop leaving them.
[-110, 0, 110].forEach((dz, i) => {
  const z = TB + H * 0.75 + dz;
  add(`lv-bushing-${i}`, rod([R - 8, TY, z], [R + 72, TY, z], 24, 8).color(ceramic));
  add(`lv-bushing-${i}-skirt`, rod([R + 40, TY, z], [R + 54, TY, z], 36, 8).color(ceramic));
  add(`lv-terminal-${i}`, rod([R + 70, TY, z], [R + 120, TY, z], 9, 6).color(hardware));
});
add('service-drop', rod([R + 120, TY, TB + H * 0.75], [2000, TY + 300, TB + H * 0.6], 18, 6).color(hardware));

// Ground wire from the tank to grade, stapled down the pole.
add('ground-wire', rod([-120, 60, TB], [-152, 40, 12], 6, 5).color(hardware));
add('ground-wire-guard', box(60, 50, 2400, true).translate(-160, 40, 1200).color(hardware));

return p.model();
