meta({
  "name": "walking-cane",
  "license": "CC0-1.0",
  "title": "Walking cane",
  "description": "Simple walking cane with a long shaft, hooked handle and rubber foot for a medical or recovery scene. Material controls: Hardwood shaft, Molded hand grip, Rubber ferrule.",
  "tags": [
    "walking cane",
    "mobility aid",
    "cane",
    "recovery",
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
  "triangleBudget": 220
});

// A walking cane pairs a hardwood shaft with a shaped hand grip and broad rubber ferrule.
const hardwood = param('hardwood', '#8a6748', { label: 'Hardwood shaft' });
const medicalPolymer = param('medicalPolymer', '#2a555d', { label: 'Molded hand grip' });
const rubber = param('rubber', '#303b3e', { label: 'Rubber ferrule' });
presets({
  clinic: { hardwood: '#957653', medicalPolymer: '#4b8c85', rubber: '#4b5658' },
  emergency: { hardwood: '#785a42', medicalPolymer: '#c9413b', rubber: '#514c49' },
});
const p = assembly('walking-cane');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('shaft', c(0, 0, 0, 790, 12, 8).color(hardwood));
p.part('handle-stem', c(0, 0, 775, 44, 11, 8).color(medicalPolymer));
p.part('crook', b(-18, 0, 815, 52, 18, 16).color(medicalPolymer));
p.part('foot', c(0, 0, 0, 34, 17, 8).color(rubber));

return p.model();
