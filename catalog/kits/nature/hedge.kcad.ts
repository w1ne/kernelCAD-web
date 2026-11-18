// Original kernelCAD low-poly hedge: a clipped hedge run with a bevelled
// top and leafy bumps (trimmed), or a row of overlapping lumps (wild).
// Runs along X, centred, base on z = 0.

meta({
  name: 'hedge',
  license: 'CC0-1.0',
  title: 'Hedge',
  description: 'Garden hedge section that tiles along its length, clipped with a bevelled top or left wild and lumpy. Knobs: length, height, style, leaf and shade colours.',
  tags: ['hedge', 'hedgerow', 'shrub', 'boxwood', 'garden', 'border', 'fence', 'park', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'park', 'street', 'grid-2m'],
  triangleBudget: 450,
});

const lengthM = param('lengthM', '2', { choices: ['1', '2', '4'], label: 'Length (m)' });
const heightM = param('heightM', '1.2', { choices: ['0.6', '1.2', '1.8'], label: 'Height (m)' });
const style = param('style', 'trimmed', { choices: ['trimmed', 'wild'], label: 'Style' });
const leaves = param('leaves', '#3f7d3a', { label: 'Leaves' });
const shade = param('shade', '#2f5f2e', { label: 'Base shade' });

presets({
  autumn: { leaves: '#a8642c', shade: '#7a4a24' },
  snowy: { leaves: '#e6edf1', shade: '#3a5a36' },
  bright: { leaves: '#5ea345', shade: '#3f7d3a' },
});

const L = Number(lengthM.value) * 1000;
const H = Number(heightM.value) * 1000;
const D = Math.min(800, H * 0.6 + 200);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Side-profile prism along X: points are (y, z), length t from x0.
const run = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const hedge = assembly('hedge');
// Darker inner band at the foot reads as shaded stems under the foliage.
hedge.part('base', run([[-D * 0.3, 0], [D * 0.3, 0], [D * 0.3, H * 0.14], [-D * 0.3, H * 0.14]], -L / 2, L).color(shade));

if (style.value === 'trimmed') {
  // Clipped body in overlapping segments, each with a slightly jittered
  // rounded profile, so the faces step like a real clipped hedge.
  const nb = Math.max(2, Math.round(L / 500));
  const step = L / nb;
  for (let i = 0; i < nb; i++) {
    const j = (k: number) => 1 + 0.045 * Math.sin(i * 3.1 + k * 1.7);
    const w = (D / 2) * j(1);
    const hh = H * (0.97 + 0.03 * Math.sin(i * 2.3));
    const c = D * 0.22;
    const x0 = Math.max(-L / 2, -L / 2 + step * i - 40);
    const x1 = Math.min(L / 2, -L / 2 + step * (i + 1) + 40);
    hedge.part(`segment-${i + 1}`, run([
      [-w * 0.86, H * 0.08], [w * 0.86, H * 0.08], [w, H * 0.35 * j(2)], [w * j(3), hh - c * 1.3], [w - c * 0.5, hh - c * 0.3],
      [w - c * 1.4, hh], [-w + c * 1.4, hh * j(4) > hh ? hh : hh * j(4)], [-w + c * 0.5, hh - c * 0.3], [-w * j(5), hh - c * 1.3], [-w, H * 0.35 * j(6)],
    ], x0, x1 - x0).color(leaves));
  }
  // A few leafy tufts poking out of the top.
  for (let i = 0; i < nb; i++) {
    const x = -L / 2 + step * (i + 0.5) + ((i % 2) - 0.5) * step * 0.3;
    const r = Math.min(D, H) * 0.2;
    hedge.part(`tuft-${i + 1}`, ngon(r, 5, i).loft(ngon(r * 0.25, 5, i + 0.6), { spacing: r * 0.7, ruled: true })
      .translate(x, (i % 3 - 1) * D * 0.15, H * 0.97 - r * 0.25).color(leaves));
  }
} else {
  const nb = Math.max(2, Math.round(L / 650));
  const step = L / nb;
  for (let i = 0; i < nb; i++) {
    const x = -L / 2 + step * (i + 0.5);
    const r = Math.min(step * 0.62, D * 0.62);
    const hh = H * (0.92 + 0.08 * Math.sin(i * 2.3));
    const lump = ngon(r * 0.75, 7, i * 0.4).loft([ngon(r, 7, i * 0.4 + 0.45), ngon(r * 0.8, 7, i * 0.4), ngon(r * 0.3, 7, i * 0.4 + 0.45)], {
      planes: [
        { plane: 'XY', origin: [x, 0, H * 0.1] },
        { plane: 'XY', origin: [x, 0, hh * 0.45] },
        { plane: 'XY', origin: [x, 0, hh * 0.78] },
        { plane: 'XY', origin: [x, 0, hh] },
      ],
      ruled: true,
    }).scale([Math.min(1, (step * 0.62) / r), D / 2 / r, 1]);
    hedge.part(`lump-${i + 1}`, lump.color(leaves));
  }
}

return hedge.model();
