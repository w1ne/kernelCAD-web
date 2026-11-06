meta({
  "name": "oxygen-cylinder",
  "license": "CC0-1.0",
  "title": "Oxygen cylinder",
  "description": "Portable oxygen cylinder with rounded-looking stepped body, valve neck and protective top guard for emergency scenes. Material controls: Painted cylinder steel, Brass valve, Gauge glass, Rubber base ring.",
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

// A medical oxygen cylinder has a painted steel tank, brass valve, gauge glass and protective foot ring.
const paintedSteel = param('paintedSteel', '#7c9299', { label: 'Painted cylinder steel' });
const brass = param('brass', '#c29442', { label: 'Brass valve' });
const gaugeGlass = param('gaugeGlass', '#e2e9e6', { label: 'Gauge glass' });
const rubber = param('rubber', '#3b4548', { label: 'Rubber base ring' });
presets({
  clinic: { paintedSteel: '#668e94', brass: '#c7a35e', gaugeGlass: '#b8d9d4', rubber: '#4c595b' },
  emergency: { paintedSteel: '#e5e8e7', brass: '#d0a347', gaugeGlass: '#dfd5c7', rubber: '#504a47' },
});
const p = assembly('oxygen-cylinder');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('tank', c(0, 0, 0, 420, 72, 12).color(paintedSteel));
p.part('base-ring', c(0, 0, 0, 20, 78, 12).color(rubber));
p.part('neck', c(0, 0, 420, 50, 25, 10).color(paintedSteel));
p.part('valve', b(0, 0, 492, 48, 44, 24).color(brass));
p.part('gauge', c(0, 0, 0, 10, 22, 10).rotate([1, 0, 0], 90).translate(0, -28, 508).color(gaugeGlass));
p.part('outlet', b(42, 0, 490, 42, 20, 18).color(brass));

return p.model();
