// SPDX-License-Identifier: CC0-1.0
// Nucleus hive box: a five-frame Langstroth nuc, the half-width hive a small
// colony is started, sold or moved in.
// What makes it a nuc rather than a crate: it is a full-length deep hive box
// cut down to five frames wide, so it is long and narrow; it stands on its
// own bottom board with a landing lip at the front entrance, the front carries
// a round polymer entrance disc (closed, queen-excluder, vent and open
// positions), the long sides have recessed hand holds, the back end has a
// screened travel vent, the painted body shows its box-joint corners, and a
// telescoping cover with a folded galvanized top sits on it. A ratchet strap
// ties the lid, box and floor together for transport.
// Generic visualization geometry at real size (505 x 245 mm, 330 mm tall),
// millimetres, Z up, ground on z = 0, long axis along X, entrance facing -X.

meta({
  name: "nuc-hive-box",
  license: 'CC0-1.0',
  title: "Nucleus hive box",
  description: "Five-frame Langstroth nucleus hive: long narrow painted deep box with box-joint corners and recessed hand holds, bottom board with landing lip and entrance slot, round polymer entrance disc, screened travel vent on the back, telescoping cover with folded galvanized top, transport ratchet strap with buckle. Material controls: box paint, timber, galvanized steel, polymer. Strap choice; freshApiary, weatheredYard and pastelYard presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'beehive', 'nuc', 'nucleus hive', 'langstroth', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const strapOn = param('strap', 'yes', { choices: ['yes', 'no'], label: 'Transport ratchet strap' });

const paint = param('paint', '#e9e1c8', { label: 'Box body (exterior paint)' });
const timber = param('timber', '#b8874a', { label: 'Bottom board, cover rim and joints (hive timber)' });
const steel = param('steel', '#b3bcbb', { label: 'Cover sheet, vent and buckle (galvanized steel)' });
const polymer = param('polymer', '#d9a520', { label: 'Entrance disc and strap (polymer)' });

presets({
  freshApiary: { paint: '#f4efe0', timber: '#d4a462', steel: '#d3dad8', polymer: '#e2b52a' },
  weatheredYard: { paint: '#a9a28e', timber: '#68543d', steel: '#7a7f7c', polymer: '#5d6b44' },
  pastelYard: { paint: '#9cc3d5', timber: '#c39a63', steel: '#c8cfcd', polymer: '#d4553a' },
});

const p = assembly("nuc-hive-box");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);

const L = 505;
const W = 245;
const BZ = 26; // top of the bottom board
const BH = 243; // deep box height
const TZ = BZ + BH;

// Bottom board on two cleats, with a landing lip past the front.
for (const y of [-90, 90]) add(`cleat-${y}`, b(-20, y, 0, L + 30, 40, 8).color(timber));
add('bottom-board', b(0, 0, 8, L, W, BZ - 8).color(timber));
add('landing-lip', extrudePolygon([[0, 0], [70, 0], [70, BZ - 8], [10, BZ - 8]], W).rotateX(90).translate(-L / 2 - 70, W / 2, 8).color(timber));

// Painted deep box with recessed hand holds and the entrance slot.
let body = b(0, 0, BZ, L, W, BH);
for (const s of [-1, 1]) body = body.subtract(b(0, s * (W / 2), BZ + BH - 90, 120, 24, 36));
for (const s of [-1, 1]) body = body.subtract(b(s * (L / 2), 0, BZ + BH - 90, 24, 100, 36));
body = body.subtract(b(-L / 2, 0, BZ - 1, 24, 160, 20));
add('box', body.color(paint));
add('entrance-shadow', b(-L / 2 + 10, 0, BZ, 2, 158, 18).color('#1d1a16'));

// Box-joint fingers at the four vertical corners, timber showing through.
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    for (let k = 0; k < 6; k += 1) {
      add(`finger-${sx}-${sy}-${k}`, b(sx * (L / 2 - 10), sy * (W / 2 + 0.6), BZ + 10 + k * 40, 20, 1.5, 20).color(timber));
    }
  }
}

// Round entrance disc on the front, its slot turned to the open position.
const DZ = BZ + 30;
add('entrance-disc', cylinder(5, 50, 32).rotateY(-90).translate(-L / 2 - 1, 0, DZ + 50).color(polymer));
add('disc-slot', b(-L / 2 - 7, 0, DZ + 50 - 26, 2, 70, 12).color('#1d1a16'));
for (const [y, z] of [[-30, 70], [30, 70], [0, 92]]) {
  add(`disc-hole-${y}-${z}`, cylinder(2, 4, 12).rotateY(-90).translate(-L / 2 - 6, y, DZ + z).color('#1d1a16'));
}
add('disc-screw', cylinder(4, 6, 12).rotateY(-90).translate(-L / 2 - 6, 0, DZ + 50).color(steel));

// Screened travel vent on the back end.
add('vent-frame', b(L / 2 + 1, 0, BZ + 90, 4, 170, 70).subtract(b(L / 2 + 1, 0, BZ + 100, 6, 150, 50)).color(timber));
add('vent-screen', b(L / 2, 0, BZ + 100, 2, 150, 50).color(steel));

// Telescoping cover: timber rim and a galvanized sheet folded over it.
add('cover-rim', b(0, 0, TZ - 30, L + 30, W + 30, 50).subtract(b(0, 0, TZ - 32, L + 2, W + 2, 40)).color(timber));
add('cover-sheet', b(0, 0, TZ + 20, L + 36, W + 36, 3).color(steel));
for (const s of [-1, 1]) {
  add(`sheet-fold-x-${s}`, b(s * (L / 2 + 16.5), 0, TZ, 3, W + 36, 23).color(steel));
  add(`sheet-fold-y-${s}`, b(0, s * (W / 2 + 16.5), TZ, L + 36, 3, 23).color(steel));
}

// Ratchet strap round the whole nuc, over the cover and under the floor.
if (strapOn.value === 'yes') {
  const sx = 120;
  const top = TZ + 23;
  add('strap-top', b(sx, 0, top, 30, W + 44, 2).color(polymer));
  add('strap-bottom', b(sx, 0, 0, 30, W + 44, 2).color(polymer));
  for (const s of [-1, 1]) add(`strap-side-${s}`, b(sx, s * (W / 2 + 21), 0, 30, 2, top + 2).color(polymer));
  add('buckle-body', b(sx, -(W / 2 + 26), 120, 44, 10, 70).color(steel));
  add('buckle-handle', box(36, 8, 60, true).rotateX(20).translate(sx, -(W / 2 + 34), 170).color(steel));
}

return p.model();
