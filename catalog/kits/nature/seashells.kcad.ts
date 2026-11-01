// Original kernelCAD low-poly seashells: a little beach scatter of ribbed
// scallop fans, spiral conch shells and a starfish on a patch of sand.

meta({
  name: 'seashells',
  license: 'CC0-1.0',
  title: 'Seashells',
  description: 'Beach scatter of ribbed scallop shells, spiral conches and a starfish on a low patch of sand. Knobs: shell count, starfish, sand patch, shell, conch and starfish colours.',
  tags: ['seashell', 'shells', 'scallop', 'conch', 'starfish', 'beach', 'coast', 'sea', 'ocean', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'beach', 'water'],
  triangleBudget: 400,
});

const count = param('count', '4', { choices: ['2', '4', '6'], label: 'Shells' });
const starfish = param('starfish', 'yes', { choices: ['yes', 'no'], label: 'Starfish' });
const sand = param('sand', 'yes', { choices: ['yes', 'no'], label: 'Sand patch' });
const shell = param('shell', '#f0dcc8', { label: 'Scallops' });
const conch = param('conch', '#e8b89a', { label: 'Conches' });
const star = param('star', '#e8743a', { label: 'Starfish' });
const sandColor = param('sandColor', '#e2cfa0', { label: 'Sand' });

presets({
  tropical: { shell: '#f4c8d0', conch: '#f0d8a8', star: '#d84a6a' },
  pale: { star: '#f0c27a' },
});

const n = Number(count.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const beach = assembly('seashells');
const base = sand.value === 'yes' ? 10 : 0;
if (base > 0) {
  const pts: [number, number][] = [];
  for (let k = 0; k < 9; k++) {
    const a = (2 * Math.PI * k) / 9;
    const rr = 260 * (0.85 + 0.15 * Math.sin(k * 2.1));
    pts.push([rr * Math.cos(a), rr * 0.8 * Math.sin(a)]);
  }
  beach.part('sand', extrudePolygon(pts, base).color(sandColor));
}

// Scallop: a domed fan — a ribbed fan outline lofted to a smaller copy.
const fan = (r: number) => {
  let p = path().moveTo(0, -r * 0.15);
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * 0.15 + (Math.PI * 0.7 * k) / 8;
    const rr = k % 2 === 0 ? r : r * 0.9;
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a) - r * 0.15);
  }
  return p.close();
};
const scallop = (r: number) => fan(r).loft(fan(r * 0.7), { spacing: r * 0.3, ruled: true });
// Conch: a spire of shrinking turned rings lying on its side.
const conchShape = (r: number) => ngon(r * 0.45, 6).loft([ngon(r, 6, 0.5), ngon(r * 0.5, 6, 1), ngon(r * 0.06, 6, 1.5)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [r * 0.15, 0, r * 0.7] },
    { plane: 'XY', origin: [0, r * 0.12, r * 2] },
    { plane: 'XY', origin: [0, 0, r * 3.4] },
  ],
  ruled: true,
}).rotateY(80);

for (let i = 0; i < n; i++) {
  const a = i * 2.39996 + 0.4;
  const d = 70 + 50 * Math.sqrt(i);
  const x = d * Math.cos(a);
  const y = d * 0.8 * Math.sin(a);
  if (i % 2 === 0) {
    beach.part(`scallop-${i + 1}`, scallop(55 + 10 * (i % 3)).rotateZ(i * 70).translate(x, y, base).color(shell));
  } else {
    // The conch's widest ring has radius r; lift it so it rests on the sand.
    const r = 32;
    beach.part(`conch-${i + 1}`, conchShape(r).rotateZ(i * 50).translate(x, y, base + r * 0.95).color(conch));
  }
}

if (starfish.value === 'yes') {
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = (Math.PI * k) / 5 + 0.3;
    const rr = k % 2 === 0 ? 85 : 30;
    pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  beach.part('starfish', extrudePolygon(pts, 16).translate(-90, -40, base).color(star));
}

return beach.model();
