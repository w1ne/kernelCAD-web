meta({
  "name": "erlenmeyer-flask",
  "license": "CC0-1.0",
  "title": "Erlenmeyer flask",
  "description": "Low-poly Erlenmeyer flask with a tapered body, narrow neck, visible liquid level and graduation marks. Material controls: Borosilicate glass, liquid solution, graduation ink.",
  "tags": [
    "erlenmeyer flask",
    "laboratory glassware",
    "science",
    "beaker",
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
  "triangleBudget": 260
});

// A laboratory flask has a broad conical body, narrow neck and visible liquid and graduation marks.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const borosilicateGlass = param('borosilicateGlass', '#b8d6d1', { label: 'Borosilicate glass' });
const solution = param('solution', '#4b8790', { label: 'Liquid solution' });
const graduationInk = param('graduationInk', '#315357', { label: 'Graduation ink' });
presets({
  clinic: { borosilicateGlass: '#c3dfda', solution: '#56a49b', graduationInk: '#43716d' },
  emergency: { borosilicateGlass: '#c7d8d5', solution: '#cf7663', graduationInk: '#704f4b' },
});
const p = assembly('erlenmeyer-flask');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const levels = [0, 24, 68, 104, 110];
const radii = [42, 42, 18, 14, 17];
const profile = (r: number) => {
  let shape = path().moveTo(r, 0);
  for (let i = 1; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    shape = shape.lineTo(r * Math.cos(angle), r * Math.sin(angle));
  }
  return shape.close();
};
const profiles = radii.map(profile);
const flaskBody = profiles[0].loft(profiles.slice(1), {
  planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});
p.part('flask-body', flaskBody.color(borosilicateGlass).scale(overallScale));
p.part('rim', c(0, 0, 111, 8, 17, 10).color(borosilicateGlass).scale(overallScale));
p.part('liquid-window', b(0, -39, 20, 28, 2, 4).color(solution).scale(overallScale));
for (const [z, y] of [[36, -33.7], [48, -27.8], [60, -21.5]]) {
  p.part('graduation-' + z, b(0, y, z, 12, 2, 2).color(graduationInk).scale(overallScale));
}

return p.model();
