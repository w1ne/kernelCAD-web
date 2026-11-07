meta({
  "name": "instrument-trolley",
  "license": "CC0-1.0",
  "title": "Instrument trolley",
  "description": "Narrow instrument trolley with a stainless-looking top tray, lower utility shelf, push handle and casters for clinic scenes.",
  "tags": [
    "instrument trolley",
    "medical cart",
    "hospital tray",
    "clinic",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "furniture",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 500
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#eef1f2', { label: 'Shell' });
const accent = param('accent', '#71838b', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('instrument-trolley');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('lower-shelf', b(0, 0, 210, 360, 240, 20).color(shell).scale(overallScale));
p.part('top-tray', b(0, 0, 610, 400, 280, 22).color(shell).scale(overallScale));
p.part('tray-lip', b(0, -131, 630, 400, 18, 18).color(accent).scale(overallScale));
for (const x of [-160, 160]) {
  p.part('upright-' + x, c(x, 0, 0, 720, 9, 8).color(accent).scale(overallScale));
  p.part('wheel-' + x, c(x, 0, 0, 18, 15, 8).color(shell).scale(overallScale));
}
p.part('handle', b(-174, 0, 680, 18, 260, 18).color(accent).scale(overallScale));

return p.model();
