// Original kernelCAD touring kayak with two deck hatches and a selectable cockpit layout.

meta({
  name: 'kayak', license: 'CC0-1.0', title: 'Touring kayak',
  description: 'Narrow touring kayak with a tapered bow, two deck hatches and single or tandem cockpit layout. Knobs: length, cockpit, hull, deck and accent colours.',
  tags: ['kayak', 'touring', 'paddle', 'watercraft', 'lake', 'coastal'], kit: 'watercraft', category: 'vehicle', origin: 'base',
  compat: ['water', 'lake', 'coastal', 'harbor', 'outdoor'], triangleBudget: 520,
});

const length = param('length', '3400', { choices: ['2800', '3400', '3900'], label: 'Length (mm)' });
const cockpit = param('cockpit', 'single', { choices: ['single', 'tandem'], label: 'Cockpit layout' });
const hullColor = param('hull', '#d0653e', { label: 'Hull' });
const deckColor = param('deck', '#e0b958', { label: 'Deck' });
const accent = param('accent', '#253b45', { label: 'Hatches and cockpit' });
presets({ coast: { hull: '#d0653e', deck: '#e0b958' }, arctic: { hull: '#347f9d', deck: '#dce6dc' } });

const L = Number(length.value);
const B = L * 0.19;
const plan = (l: number, b: number, depth: number, z: number) => extrudePolygon([
  [0, l / 2], [b * 0.34, l * 0.34], [b / 2, l * 0.12], [b * 0.44, -l * 0.28],
  [b * 0.32, -l * 0.43], [0, -l / 2], [-b * 0.32, -l * 0.43], [-b * 0.44, -l * 0.28],
  [-b / 2, l * 0.12], [-b * 0.34, l * 0.34],
], depth).translate(0, 0, z);
const boat = assembly('kayak');
boat.part('lower-hull', plan(L, B, 76, 0).color(hullColor));
boat.part('deck-shell', plan(L * 0.97, B * 0.94, 35, 76).color(deckColor));
boat.part('keel-line', box(34, L * 0.76, 20, true).translate(0, 0, 10).color(accent));
for (const [index, y] of [-L * 0.34, L * 0.34].entries()) {
  boat.part('hatch-rim-' + (index + 1), cylinder(18, B * 0.23, 10).subtract(cylinder(20, B * 0.14, 10).translate(0, 0, -1)).translate(0, y, 111).color(accent));
}
const cockpitStations = cockpit.value === 'single' ? [-L * 0.08] : [-L * 0.23, L * 0.18];
for (const [index, y] of cockpitStations.entries()) {
  boat.part('cockpit-rim-' + (index + 1), cylinder(20, B * 0.31, 10).subtract(cylinder(22, B * 0.22, 10).translate(0, 0, -1)).translate(0, y, 111).color(accent));
  boat.part('seat-' + (index + 1), box(B * 0.32, 150, 24, true).translate(0, y - 30, 88).color(accent));
}
return boat.model();
