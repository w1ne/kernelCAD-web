meta({
  "name": "stethoscope",
  "license": "CC0-1.0",
  "title": "Stethoscope",
  "description": "Low-poly stethoscope with flexible Y-shaped tubing, paired earpieces and round chestpiece for a doctor or nurse prop. Material controls: Silicone tubing, Rubber earpieces, Stainless-steel chestpiece.",
  "tags": [
    "stethoscope",
    "doctor tool",
    "medical instrument",
    "clinic",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "item",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 350
});

// A stethoscope is recognizable by its split flexible tube, paired earpieces and circular chestpiece.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const siliconeTubing = param('siliconeTubing', '#384b56', { label: 'Silicone tubing' });
const rubber = param('rubber', '#303b40', { label: 'Rubber earpieces' });
const stainlessSteel = param('stainlessSteel', '#bfc8cb', { label: 'Stainless-steel chestpiece' });
presets({
  clinic: { siliconeTubing: '#425b63', rubber: '#526568', stainlessSteel: '#c6d0d1' },
  emergency: { siliconeTubing: '#4e5050', rubber: '#594f4a', stainlessSteel: '#c2bbb2' },
});
const p = assembly('stethoscope');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('tubing', poly([[-78, 105], [-62, 105], [-62, -4], [-42, -42], [0, -64], [42, -42], [62, -4], [62, 88], [78, 88], [78, -4], [53, -56], [0, -84], [-53, -56], [-78, -4]], 0, 10).color(siliconeTubing).scale(overallScale));
p.part('earpiece-left', c(-70, 102, 0, 34, 8, 8).color(rubber).scale(overallScale));
p.part('earpiece-right', c(70, 88, 0, 34, 8, 8).color(rubber).scale(overallScale));
p.part('chestpiece', c(0, -74, 0, 12, 28, 12).color(stainlessSteel).scale(overallScale));
p.part('diaphragm', c(0, -74, 12, 5, 22, 12).color(stainlessSteel).scale(overallScale));

return p.model();
