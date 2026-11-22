meta({
  "name": "hospital-bed",
  "license": "CC0-1.0",
  "title": "Hospital bed",
  "description": "Low-poly hospital bed with raised headboard, side rails, mattress, undercarriage and caster wheels for ward scenes. Material controls: Vinyl upholstery, Painted steel, Molded rail polymer, Rubber casters.",
  "tags": [
    "hospital bed",
    "ward",
    "clinic furniture",
    "patient room",
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
  "triangleBudget": 600
});

// A hospital bed has a padded mattress, raised polymer rails, steel support frame and casters.
const vinylUpholstery = param('vinylUpholstery', '#eef1f2', { label: 'Vinyl upholstery' });
const paintedSteel = param('paintedSteel', '#687880', { label: 'Painted steel' });
const medicalPolymer = param('medicalPolymer', '#4c9c9b', { label: 'Molded rail polymer' });
const rubber = param('rubber', '#394245', { label: 'Rubber casters' });
presets({
  clinic: { vinylUpholstery: '#f5f4ef', paintedSteel: '#7d8b90', medicalPolymer: '#2d9893', rubber: '#4d5a5c' },
  emergency: { vinylUpholstery: '#efe9df', paintedSteel: '#78746e', medicalPolymer: '#c9413b', rubber: '#514d4a' },
});
const railCount = param('rails', '2', { choices: ['1', '2'], label: 'Side rails' });
const p = assembly('hospital-bed');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('mattress', b(0, 0, 505, 760, 220, 130).color(vinylUpholstery));
p.part('frame', b(0, 0, 423, 690, 165, 34).color(paintedSteel));
p.part('headboard', b(-335, 0, 555, 26, 250, 260).color(paintedSteel));
p.part('footboard', b(335, 0, 530, 24, 235, 210).color(paintedSteel));
for (const side of [-1, 1]) for (let i = 0; i < Number(railCount.value); i++) {
  p.part('rail-' + side + '-' + i, b((i ? 220 : -220), side * 112, 465, 220, 14, 70).color(medicalPolymer));
}
for (const x of [-300, 300]) for (const y of [-96, 96]) {
  p.part('support-' + x + '-' + y, b(x, y, 218, 32, 32, 374).color(paintedSteel));
  p.part('caster-' + x + '-' + y, c(0, 0, 0, 18, 16, 10).rotate([0, 1, 0], 90).translate(x - 9, y, 16).color(rubber));
}

return p.model();
