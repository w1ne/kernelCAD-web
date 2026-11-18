meta({
  "name": "lab-incubator",
  "license": "CC0-1.0",
  "title": "Laboratory incubator",
  "description": "Small laboratory incubator with square chamber door, viewing panel, top controls and short feet for bench scenes. Material controls: Painted steel, Borosilicate viewing glass, Control polymer, Silicone seal and grip.",
  "tags": [
    "lab incubator",
    "laboratory equipment",
    "science",
    "medical lab",
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
  "triangleBudget": 500
});

// A laboratory incubator combines a metal cabinet, glass viewing window and sealed control door.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const paintedSteel = param('paintedSteel', '#e6eaeb', { label: 'Painted steel' });
const borosilicateGlass = param('borosilicateGlass', '#92bfbd', { label: 'Borosilicate viewing glass' });
const medicalPolymer = param('medicalPolymer', '#4c8f93', { label: 'Control polymer' });
const silicone = param('silicone', '#56666b', { label: 'Silicone seal and grip' });
presets({
  clinic: { paintedSteel: '#eef1f2', borosilicateGlass: '#a9cfca', medicalPolymer: '#2d9893', silicone: '#6f7e80' },
  emergency: { paintedSteel: '#e9e5dc', borosilicateGlass: '#a8c2c1', medicalPolymer: '#c9413b', silicone: '#665d58' },
});
const p = assembly('lab-incubator');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);

p.part('cabinet', b(0, 0, 145, 240, 190, 290).color(paintedSteel).scale(overallScale));
p.part('door', b(0, -99, 150, 200, 8, 245).color(paintedSteel).scale(overallScale));
p.part('window', b(0, -105, 166, 140, 4, 150).color(borosilicateGlass).scale(overallScale));
p.part('handle', b(82, -108, 150, 12, 12, 84).color(silicone).scale(overallScale));
p.part('control-panel', b(0, 0, 305, 100, 130, 24).color(medicalPolymer).scale(overallScale));
p.part('screen', b(0, -67, 310, 54, 4, 14).color(borosilicateGlass).scale(overallScale));
for (const x of [-76, 76]) p.part('foot-' + x, b(x, 70, 10, 36, 36, 20).color(paintedSteel).scale(overallScale));

return p.model();
