meta({
  "name": "oxygen-cylinder",
  "license": "CC0-1.0",
  "title": "Oxygen cylinder",
  "description": "Portable oxygen cylinder with rounded-looking stepped body, valve neck and protective top guard for emergency scenes.",
  "tags": [
    "oxygen cylinder",
    "medical gas",
    "hospital prop",
    "emergency",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "prop",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 350
});

const shell = param('shell', '#7c9299', { label: 'Shell' });
const accent = param('accent', '#d35b54', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('oxygen-cylinder');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('tank', c(0, 0, 0, 420, 72, 12).color(shell));
p.part('base-ring', c(0, 0, 0, 20, 78, 12).color(accent));
p.part('neck', c(0, 0, 420, 50, 25, 10).color(shell));
p.part('valve', b(0, 0, 492, 48, 44, 24).color(accent));
p.part('gauge', c(0, 0, 0, 10, 22, 10).rotate([1, 0, 0], 90).translate(0, -28, 508).color(shell));
p.part('outlet', b(42, 0, 490, 42, 20, 18).color(accent));

return p.model();
