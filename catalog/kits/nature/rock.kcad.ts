// Original kernelCAD low-poly rock: a squashed faceted gem built from a ruled
// loft of irregular polygon rings between two apex points.

meta({
  name: 'rock',
  license: 'CC0-1.0',
  title: 'Rock',
  description: 'Squashed faceted field rock with irregular facets. Knobs: size, shape, facet count, stone and moss colours.',
  tags: ['rock', 'stone', 'boulder', 'pebble', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow', 'desert'],
  triangleBudget: 120,
});

const size = param('size', '0.8', { choices: ['0.3', '0.5', '0.8', '1.2', '2'], label: 'Width (m)' });
const shape = param('shape', 'round', { choices: ['flat', 'round', 'tall'], label: 'Shape' });
const sides = param('sides', '7', { choices: ['5', '6', '7', '8', '9'], label: 'Facets' });
const stone = param('stone', '#8a8d91', { label: 'Stone' });
const moss = param('moss', '#5f7f3a', { label: 'Moss cap' });

presets({
  desert: { stone: '#c08a5a', moss: '#a8744a' },
  snowy: { stone: '#7d8288', moss: '#eef3f6' },
});

const w = Number(size.value) * 1000;
const s = Number(sides.value);
const hRatio = shape.value === 'flat' ? 0.4 : shape.value === 'tall' ? 0.95 : 0.65;
const h = w * hRatio;

// Deterministic jitter so the rock is irregular but stable.
const jit = (k: number, salt: number) => 0.82 + 0.3 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, salt: number, rot: number) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * jit(k, salt);
    return [rr * Math.cos(a), rr * 0.85 * Math.sin(a)] as const;
  };
  const [x0, y0] = pt(0);
  let p = path().moveTo(x0, y0);
  for (let k = 1; k < s; k++) {
    const [x, y] = pt(k);
    p = p.lineTo(x, y);
  }
  return p.close();
};

const r = w / 2;
const body = ring(r * 0.72, 1, 0).loft([ring(r, 2, Math.PI / s), ring(r * 0.7, 3, 0)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [r * 0.05, 0, h * 0.42] },
    { plane: 'XY', origin: [-r * 0.05, r * 0.04, h * 0.82] },
  ],
  ruled: true,
});
const cap = ring(r * 0.7, 3, 0).loft(ring(r * 0.3, 4, Math.PI / s), {
  planes: [
    { plane: 'XY', origin: [-r * 0.05, r * 0.04, h * 0.82] },
    { plane: 'XY', origin: [r * 0.02, 0, h] },
  ],
  ruled: true,
});

const rock = assembly('rock');
rock.part('stone', body.color(stone));
rock.part('moss', cap.color(moss));
return rock.model();
