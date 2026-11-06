meta({
  "name": "blood-pressure-monitor",
  "license": "CC0-1.0",
  "title": "Blood pressure monitor",
  "description": "Portable blood pressure monitor with digital readout, control buttons, attached cuff and connecting tube for clinic scenes. Material controls: Medical-grade polymer, Display glass, Cuff fabric, Silicone and rubber.",
  "tags": [
    "blood pressure monitor",
    "sphygmomanometer",
    "cuff",
    "healthcare",
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
  "triangleBudget": 400
});

// A portable pressure monitor separates its molded case, dark display, fabric cuff and flexible tube.
const medicalPolymer = param('medicalPolymer', '#e9eef0', { label: 'Medical-grade polymer' });
const displayGlass = param('displayGlass', '#29484b', { label: 'Display glass' });
const cuffFabric = param('cuffFabric', '#397c86', { label: 'Cuff fabric' });
const siliconeRubber = param('siliconeRubber', '#66777b', { label: 'Silicone and rubber' });
presets({
  clinic: { medicalPolymer: '#f1f3f4', displayGlass: '#2b6564', cuffFabric: '#2d9893', siliconeRubber: '#708486' },
  emergency: { medicalPolymer: '#ebe8df', displayGlass: '#33474b', cuffFabric: '#c9413b', siliconeRubber: '#665f5e' },
});
const p = assembly('blood-pressure-monitor');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('monitor', b(0, -38, 50, 138, 44, 92).color(medicalPolymer));
p.part('foot-left', c(-50, -38, 0, 10, 12, 8).color(siliconeRubber));
p.part('foot-right', c(50, -38, 0, 10, 12, 8).color(siliconeRubber));
p.part('screen', b(0, -62, 69, 96, 4, 38).color(displayGlass));
for (const x of [-34, 0, 34]) p.part('button-' + x, c(x, -64, 30, 6, 7, 8).color(medicalPolymer));
p.part('cuff', b(0, 106, 45, 118, 80, 72).color(cuffFabric));
p.part('tube', box(128, 8, 8, true).rotate([0, 0, 1], 24).translate(62, 35, 43).color(siliconeRubber));

return p.model();
