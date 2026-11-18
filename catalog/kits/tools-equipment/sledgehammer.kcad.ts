// Original kernelCAD low-poly sledgehammer standing upright on its head: an
// octagonal steel head with bevelled striking faces and a tapered handle with
// a grip sleeve. Millimetres, Z up, base on z = 0 centred on x = y = 0, head
// along X, handle up +Z.

meta({
  name: 'sledgehammer',
  license: 'CC0-1.0',
  title: 'Sledgehammer',
  description: 'Sledgehammer standing on its octagonal steel head with a long wooden or fibreglass handle, from short club hammer to heavy demolition sledge. Knobs: weight, head, handle and grip colours.',
  tags: ['sledgehammer', 'sledge', 'hammer', 'mallet', 'demolition', 'construction', 'tool', 'item'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['outdoor', 'workshop', 'garage', 'construction', 'mine', 'farm'],
  triangleBudget: 140,
});

const weight = param('weight', '8lb', { choices: ['3lb', '8lb', '12lb'], label: 'Weight' });
const head = param('head', '#4a4e54', { label: 'Head' });
const handle = param('handle', '#c49556', { label: 'Handle' });
const grip = param('grip', '#d8a520', { label: 'Grip' });

presets({
  rusty: { head: '#6b4632', handle: '#8f6a43', grip: '#5a3e2a' },
  orange: { head: '#2d2f33', handle: '#e06a1c', grip: '#232323' },
});

const w = weight.value;
const HL = w === '3lb' ? 140 : w === '12lb' ? 230 : 200; // head length (X)
const R = w === '3lb' ? 30 : w === '12lb' ? 46 : 40; // head octagon radius
const HH = w === '3lb' ? 280 : w === '12lb' ? 900 : 860; // handle length above the head

// Regular n-gon rotated so a flat face sits at the bottom.
const ngon = (r: number, n = 8) => {
  const a0 = Math.PI / n;
  let p = path().moveTo(r * Math.cos(a0), r * Math.sin(a0));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(a0 + (2 * Math.PI * k) / n), r * Math.sin(a0 + (2 * Math.PI * k) / n));
  return p.close();
};
const ap = R * Math.cos(Math.PI / 8); // apothem: head centre height
const bev = HL * 0.08;

const a = assembly('sledgehammer');
// Head: octagonal bar along X with bevelled striking faces.
a.part('head', ngon(R * 0.82).loft([ngon(R), ngon(R), ngon(R * 0.82)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, bev] },
    { plane: 'XY', origin: [0, 0, HL - bev] },
    { plane: 'XY', origin: [0, 0, HL] },
  ],
  ruled: true,
}).rotateY(90).translate(-HL / 2, 0, ap).color(head));

// Handle: slightly tapered hexagonal shaft from inside the head eye upward.
const z0 = ap;
const zTop = ap + R + HH;
const hr = Math.max(R * 0.5, 18);
const GL = w === '3lb' ? 100 : 140; // grip sleeve length
a.part('handle', ngon(hr, 6).loft(ngon(hr * 0.8, 6), { spacing: zTop - GL + 20 - z0, ruled: true })
  .translate(0, 0, z0).color(handle));
// Grip sleeve and a flared knob at the top end.
a.part('grip', ngon(hr * 0.95, 6).loft([ngon(hr * 0.95, 6), ngon(hr * 1.15, 6)], {
  planes: [
    { plane: 'XY', origin: [0, 0, zTop - GL] },
    { plane: 'XY', origin: [0, 0, zTop - 20] },
    { plane: 'XY', origin: [0, 0, zTop] },
  ],
  ruled: true,
}).color(grip));

return a.model();
