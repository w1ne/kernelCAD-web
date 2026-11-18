// Original kernelCAD low-poly stone slab: a flat, irregular layered rock
// (stepping stone or ledge), built from jittered polygon rings, with an
// optional smaller slab resting on top.

meta({
  name: 'stone-slab',
  license: 'CC0-1.0',
  title: 'Stone slab',
  description: 'Flat irregular stone slab or stepping stone with an optional second layer stacked on top. Knobs: width, layers, facets, stone and top colours.',
  tags: ['rock', 'stone', 'slab', 'flat rock', 'stepping stone', 'ledge', 'flagstone', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow', 'garden', 'water', 'mountain'],
  triangleBudget: 150,
});

const size = param('size', '1.2', { choices: ['0.5', '0.8', '1.2', '2'], label: 'Width (m)' });
const layers = param('layers', '2', { choices: ['1', '2'], label: 'Layers' });
const sides = param('sides', '8', { choices: ['6', '7', '8', '9'], label: 'Facets' });
const stone = param('stone', '#868a8f', { label: 'Stone' });
const top = param('top', '#a2a5a8', { label: 'Top face' });

presets({
  sandstone: { stone: '#b9875a', top: '#d0a275' },
  slate: { stone: '#4f565e', top: '#646c74' },
  mossy: { top: '#6a8a40' },
});

const w = Number(size.value) * 1000;
const s = Number(sides.value);

const jit = (k: number, salt: number) => 0.8 + 0.32 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, salt: number, rot: number) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * jit(k, salt);
    return [rr * Math.cos(a), rr * 0.72 * Math.sin(a)] as const;
  };
  const [x0, y0] = pt(0);
  let p = path().moveTo(x0, y0);
  for (let k = 1; k < s; k++) {
    const [x, y] = pt(k);
    p = p.lineTo(x, y);
  }
  return p.close();
};
// Slab: a bevelled foot ring, full-width body, and a thin lighter top skin.
const slab = (r: number, z: number, t: number, salt: number, dx: number, dy: number) => ({
  body: ring(r * 0.88, salt, 0).loft(ring(r, salt + 1, Math.PI / s), {
    planes: [
      { plane: 'XY', origin: [dx, dy, z] },
      { plane: 'XY', origin: [dx, dy, z + t * 0.75] },
    ],
    ruled: true,
  }),
  top: ring(r, salt + 1, Math.PI / s).loft(ring(r * 0.86, salt + 2, Math.PI / s), {
    planes: [
      { plane: 'XY', origin: [dx, dy, z + t * 0.75] },
      { plane: 'XY', origin: [dx, dy, z + t] },
    ],
    ruled: true,
  }),
});

const rock = assembly('stone-slab');
const r = w / 2;
const t = Math.max(80, w * 0.16);
const a = slab(r, 0, t, 1, 0, 0);
rock.part('slab', a.body.color(stone));
rock.part('slab-top', a.top.color(top));
if (layers.value === '2') {
  const b = slab(r * 0.55, t - 10, t * 0.8, 5, r * 0.18, -r * 0.08);
  rock.part('upper', b.body.color(stone));
  rock.part('upper-top', b.top.color(top));
}

return rock.model();
