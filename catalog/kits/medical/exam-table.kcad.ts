meta({
  "name": "exam-table",
  "license": "CC0-1.0",
  "title": "Examination table",
  "description": "Low-poly examination table with padded top, adjustable-looking base and paper roll support for clinic scenes. Material controls: Vinyl upholstery, Powder-coated steel, Stainless-steel paper bar.",
  "tags": [
    "exam table",
    "clinic furniture",
    "medical bed",
    "treatment room",
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

// An examination table reads through its padded vinyl top, steel legs and separate paper roll.
const vinylUpholstery = param('vinylUpholstery', '#edf0f2', { label: 'Vinyl upholstery' });
const powderCoatedSteel = param('powderCoatedSteel', '#63727a', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#aeb8ba', { label: 'Stainless-steel paper bar' });
presets({
  clinic: { vinylUpholstery: '#f4f4f0', powderCoatedSteel: '#78878c', stainlessSteel: '#bac3c5' },
  emergency: { vinylUpholstery: '#eee9e1', powderCoatedSteel: '#77736d', stainlessSteel: '#aeb2b2' },
});
const p = assembly('exam-table');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('padded-top', b(0, 0, 655, 660, 230, 100).color(vinylUpholstery));
p.part('underframe', b(0, 0, 592, 570, 170, 28).color(powderCoatedSteel));
for (const x of [-235, 235]) for (const y of [-62, 62]) {
  p.part('leg-' + x + '-' + y, b(x, y, 296, 38, 38, 592).color(powderCoatedSteel));
}
p.part('head-cushion', b(0, -106, 657, 190, 16, 68).color(vinylUpholstery));
p.part('paper-bar', c(0, 116, 598, 20, 14, 8).color(stainlessSteel));

return p.model();
