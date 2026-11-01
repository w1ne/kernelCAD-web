// Original kernelCAD low-poly rowboat: a planked hull lofted from a narrow
// keel outline up to a pointed-bow gunwale outline, hollowed by a smaller
// loft, with a rubbing strake, thwart seats and a pair of oars laid inside.
// Beached: Millimetres, Z up, keel on z = 0 centred on x = y = 0, bow at +Y.

meta({
  name: 'rowboat',
  license: 'CC0-1.0',
  title: 'Rowboat',
  description: 'Small wooden rowboat with pointed bow, transom stern, thwart seats and oars, beached on its keel. Knobs: length, seats, oars, hull, trim, interior and oar colours.',
  tags: ['rowboat', 'boat', 'dinghy', 'skiff', 'oars', 'lake', 'river', 'harbour', 'fishing', 'beach'],
  kit: 'props',
  category: 'vehicle',
  origin: 'base',
  compat: ['outdoor', 'harbour', 'lake', 'river', 'beach', 'medieval', 'fantasy'],
  triangleBudget: 420,
});

const lengthM = param('lengthM', '3.6', { choices: ['2.8', '3.6', '4.4'], label: 'Length (m)' });
const seats = param('seats', '2', { choices: ['1', '2', '3'], label: 'Seats' });
const oars = param('oars', 'yes', { choices: ['yes', 'no'], label: 'Oars' });
const hull = param('hull', '#2f6a8a', { label: 'Hull' });
const trim = param('trim', '#efe9dc', { label: 'Gunwale trim' });
const inside = param('inside', '#b08050', { label: 'Interior and seats' });
const oar = param('oar', '#c49a5c', { label: 'Oars' });

presets({
  red: { hull: '#a8302a' },
  natural: { hull: '#9a6a3c', trim: '#6e4a2c' },
  white: { hull: '#efe9dc', trim: '#2f5a8a' },
});

const L = Number(lengthM.value) * 1000;
const B = L * 0.36; // beam
const H = 480;
const ns = Number(seats.value);

// Boat outline at a given scale: pointed bow at +Y, flat transom at -Y.
const outline = (l: number, b: number, transom: number) => {
  const pts: [number, number][] = [
    [0, l / 2], [b * 0.32, l * 0.34], [b * 0.48, l * 0.1], [b / 2, -l * 0.15], [b * 0.44, -l * 0.38], [transom / 2, -l / 2],
    [-transom / 2, -l / 2], [-b * 0.44, -l * 0.38], [-b / 2, -l * 0.15], [-b * 0.48, l * 0.1], [-b * 0.32, l * 0.34],
  ];
  let p = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) p = p.lineTo(x, y);
  return p.close();
};

const bt = assembly('rowboat');
bt.part('hull', outline(L * 0.82, B * 0.45, B * 0.3).loft(outline(L, B, B * 0.62), { spacing: H, ruled: true })
  .subtract(outline(L * 0.8, B * 0.38, B * 0.25).loft(outline(L - 90, B - 70, B * 0.62 - 70), { spacing: H, ruled: true }).translate(0, 0, 60))
  .color(hull));
bt.part('floor', outline(L * 0.8, B * 0.38, B * 0.25).extrude(20).translate(0, 0, 59).color(inside));
// Rubbing strake: a thin band round the outside just under the gunwale.
bt.part('strake', outline(L + 20, B + 30, B * 0.62 + 30).extrude(50).subtract(outline(L - 60, B - 40, B * 0.62 - 40).extrude(80).translate(0, 0, -10)).translate(0, 0, H - 60).color(trim));
// Thwarts across the boat; width follows the hull at that station.
const ys = ns === 1 ? [0] : ns === 2 ? [L * 0.12, -L * 0.2] : [L * 0.22, -L * 0.02, -L * 0.3];
ys.forEach((y, i) => {
  const halfB = (B / 2) * (y > L * 0.1 ? 1 - ((y - L * 0.1) / (L * 0.4)) * 0.45 : 1) - 25;
  bt.part(`seat-${i + 1}`, box(2 * halfB, 220, 30, true).translate(0, y, H - 120).color(inside));
});
if (oars.value === 'yes') {
  // Two oars lying lengthwise on the seats, blades towards the stern.
  for (const sx of [-1, 1]) {
    const ol = L * 0.72;
    bt.part(`oar-${sx < 0 ? 'left' : 'right'}`, box(36, ol, 36, true).translate(sx * B * 0.22, L * 0.02, H - 87)
      .union(box(130, ol * 0.25, 16, true).translate(sx * B * 0.22, L * 0.02 - ol * 0.5 + ol * 0.125, H - 90))
      .rotateZ(sx * 3).color(oar));
  }
}

return bt.model();
