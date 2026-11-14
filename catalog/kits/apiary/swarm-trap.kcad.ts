// SPDX-License-Identifier: CC0-1.0
// Swarm trap: a bait hive strapped to a tree, set out in spring so a passing
// swarm of scout bees picks it as their new home.
// What makes it a swarm trap rather than a box: it is mounted high on a tree
// trunk, not set on the ground; it is a tall timber box of about the volume
// scouts prefer (~40 litres) with a single small round entrance near the
// bottom of the front and a short landing perch under it; a pent roof with a
// sheet covering sheds rain forward; it hangs on a galvanized hanger plate
// lag-screwed to the trunk, and a ratchet strap round the trunk holds it
// tight against the bark. A side door lets the beekeeper check for a swarm.
// Generic visualization geometry at real size (300 x 300 x 500 mm box on a
// 1.6 m trunk section), millimetres, Z up, ground on z = 0, entrance facing -Y.

meta({
  name: "swarm-trap",
  license: 'CC0-1.0',
  title: "Swarm trap box",
  description: "Bait hive swarm trap strapped to a tree: tall timber box of about 40 litres with one small round entrance and landing perch near the bottom of the front, side inspection door with turn buttons, pent roof with sheet covering, galvanized hanger plate lag-screwed to the trunk, ratchet strap round the trunk. Material controls: box timber, tree bark, roof sheet, galvanized steel, strap webbing. Mount choice (tree or free-standing); freshApiary, weatheredYard and greenRoof presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'swarm trap', 'bait hive', 'tree', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const mount = param('mount', 'tree', { choices: ['tree', 'none'], label: 'Mounted on a tree trunk' });

const timber = param('timber', '#b8874a', { label: 'Trap box and perch (timber)' });
const bark = param('bark', '#5b4a3a', { label: 'Tree trunk (bark)' });
const roofSheet = param('roofSheet', '#3e4446', { label: 'Roof covering (sheet)' });
const steel = param('steel', '#9aa3a2', { label: 'Hanger, screws and buckle (galvanized steel)' });
const webbing = param('webbing', '#d0682a', { label: 'Ratchet strap (webbing)' });

presets({
  freshApiary: { timber: '#d4a462', bark: '#6b5844', roofSheet: '#5a6266', steel: '#c3cbca', webbing: '#e08a2a' },
  weatheredYard: { timber: '#7a6650', bark: '#4a3e33', roofSheet: '#2f3436', steel: '#716d63', webbing: '#4f6a3a' },
  greenRoof: { timber: '#c9a06a', bark: '#5b4a3a', roofSheet: '#4d6b3c', steel: '#9aa3a2', webbing: '#2f5a8a' },
});

const p = assembly("swarm-trap");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);
// Revolve an (r, z) profile about Z.
const lathe = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const onTree = mount.value === 'tree';
const TR = 150; // trunk radius at the trap
const BW = 300;
const BD = 300;
const BH = 500;
const Z0 = onTree ? 900 : 0; // bottom of the trap box
const BY = onTree ? -(TR + 18 + BD / 2) : 0; // box centre, standing off the bark

// Trunk section with root flare and a sawn-off branch stub.
if (onTree) {
  add('trunk', lathe([[0, 0], [215, 0], [175, 90], [160, 300], [150, 1100], [142, 1600], [0, 1600]]).color(bark));
  add('branch-stub', cylinder(240, 55, 16).rotateY(70).translate(80, 0, 1480).color(bark));
  add('trunk-cut', cylinder(3, 141, 32).translate(0, 0, 1600).color('#c8a878'));
  add('branch-cut', cylinder(4, 55, 16).rotateY(70).translate(80 + 240 * Math.sin((70 * Math.PI) / 180), 0, 1480 + 240 * Math.cos((70 * Math.PI) / 180)).color('#c8a878'));
}

// Trap box: hollow-looking body with a dark round entrance and a perch.
add('box', b(0, BY, Z0, BW, BD, BH).color(timber));
add('floor-board', b(0, BY, Z0 - 20, BW + 20, BD + 20, 20).color(timber));
add('entrance', cylinder(4, 16, 20).rotateX(90).translate(0, BY - BD / 2 + 2, Z0 + 70).color('#1d1a16'));
add('perch', cylinder(60, 6, 10).rotateX(90).translate(0, BY - BD / 2, Z0 + 45).color(timber));
add('perch-block', b(0, BY - BD / 2 - 6, Z0 + 20, 70, 12, 30).color(timber));

// Side inspection door on +X with turn buttons.
add('side-door', b(BW / 2 + 3, BY, Z0 + 60, 6, BD - 60, BH - 120).color(timber));
for (const z of [Z0 + 90, Z0 + BH - 90]) add(`turn-button-${z}`, box(8, 50, 14, true).rotateX(30).translate(BW / 2 + 10, BY + BD / 2 - 40, z).color(timber));
add('door-handle', b(BW / 2 + 10, BY, Z0 + BH / 2 - 20, 10, 60, 16).color(steel));

// Pent roof, high at the back and low at the front, with a sheet covering.
const RZ = Z0 + BH;
const roof = [[-BD / 2 - 50, 0], [BD / 2 + 30, 0], [BD / 2 + 30, 80], [-BD / 2 - 50, 30]];
add('roof', extrudePolygon(roof, BW + 60).rotateX(90).rotateZ(90).translate(-(BW + 60) / 2, BY, RZ).color(timber));
const sheet = [[-BD / 2 - 54, 30], [BD / 2 + 34, 80], [BD / 2 + 34, 86], [-BD / 2 - 54, 36]];
add('roof-sheet', extrudePolygon(sheet, BW + 70).rotateX(90).rotateZ(90).translate(-(BW + 70) / 2, BY, RZ).color(roofSheet));

// Galvanized hanger plate on the back, hooked over a lag screw in the trunk.
const HY = BY + BD / 2;
add('hanger-plate', b(0, HY + 3, Z0 + 260, 120, 6, 300).color(steel));
add('hanger-hook', b(0, HY + 10, Z0 + 540, 120, 18, 6).color(steel));
if (onTree) {
  for (const x of [-35, 35]) add(`lag-screw-${x}`, cylinder(40, 9, 6).rotateX(-90).translate(x, HY + 6, Z0 + 520).color(steel));
}

// Ratchet strap round box and trunk.
const SZ = Z0 + 300;
if (onTree) {
  // Back half of the loop hugs the bark; the sides run forward to the box.
  const ring = cylinder(35, TR + 4, 32).subtract(cylinder(37, TR + 1, 32).translate(0, 0, -1));
  add('strap-trunk', ring.intersect(b(0, (TR + 10) / 2, -2, 2 * TR + 20, TR + 10, 40)).translate(0, 0, SZ).color(webbing));
  const y0 = BY - BD / 2 - 2;
  for (const s of [-1, 1]) add(`strap-side-${s}`, b(s * (BW / 2 + 2), y0 / 2, SZ, 4, -y0, 35).color(webbing));
} else {
  for (const s of [-1, 1]) add(`strap-side-${s}`, b(s * (BW / 2 + 2), BY, SZ, 4, BD + 4, 35).color(webbing));
  add('strap-back', b(0, BY + BD / 2 + 2, SZ, BW + 8, 4, 35).color(webbing));
}
add('strap-front', b(0, BY - BD / 2 - 2, SZ, BW + 8, 4, 35).color(webbing));
add('buckle', b(60, BY - BD / 2 - 10, SZ - 10, 50, 12, 55).color(steel));

return p.model();
