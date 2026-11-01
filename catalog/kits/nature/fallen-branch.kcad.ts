// Original kernelCAD low-poly fallen branch: a crooked tapered bough lying on
// the ground with forked side twigs and optional clumps of dry leaves.
// Lies along X, thick end at -X, centred, resting on z = 0.

meta({
  name: 'fallen-branch',
  license: 'CC0-1.0',
  title: 'Fallen branch',
  description: 'Crooked fallen tree branch lying on the ground with forked side twigs and optional leaf clumps. Knobs: length, twigs, leaves, bark and leaf colours.',
  tags: ['branch', 'bough', 'stick', 'deadwood', 'fallen', 'forest floor', 'debris', 'wood', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow', 'swamp'],
  triangleBudget: 300,
});

const lengthM = param('lengthM', '2', { choices: ['1', '2', '3'], label: 'Length (m)' });
const twigs = param('twigs', '3', { choices: ['2', '3', '4'], label: 'Side twigs' });
const leafy = param('leafy', 'yes', { choices: ['yes', 'no'], label: 'Leaf clumps' });
const bark = param('bark', '#6b5340', { label: 'Bark' });
const leaves = param('leaves', '#b87a32', { label: 'Leaves' });

presets({
  fresh: { leaves: '#5f9a3c' },
  mossy: { bark: '#55663a', leaves: '#4c7a32' },
});

const L = Number(lengthM.value) * 1000;
const n = Number(twigs.value);
const r0 = L * 0.04;

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Horizontal tapered segment from (x, y) heading az degrees in the XY plane,
// axis at height zc. rotateY(90) lays a +Z loft along +X; a profile vertex
// at angle 0 ends up straight down, so the thick end touches z = zc - r.
const seg = (ra: number, rb: number, len: number, x: number, y: number, az: number, zc: number, s = 6) =>
  ngon(ra, s).loft(ngon(rb, s), { spacing: len, ruled: true }).rotateY(90).rotateZ(az).translate(x, y, zc);

const branch = assembly('fallen-branch');
// Main bough in two crooked pieces that share a joint.
const l1 = L * 0.55;
const l2 = L * 0.5;
const x0 = -L / 2;
branch.part('bough', seg(r0, r0 * 0.72, l1 + r0 * 0.5, x0, 0, 8, r0).color(bark));
const jx = x0 + l1 * Math.cos((8 * Math.PI) / 180);
const jy = l1 * Math.sin((8 * Math.PI) / 180);
branch.part('bough-tip', seg(r0 * 0.74, r0 * 0.25, l2, jx, jy, -14, r0, 5).color(bark));

// Side twigs fork off both pieces, rising slightly off the ground.
const tips: [number, number, number][] = [];
for (let i = 0; i < n; i++) {
  const t = (i + 0.6) / (n + 0.4);
  const side = i % 2 ? 1 : -1;
  const onTip = t > 0.55;
  const bx = onTip ? jx + (t - 0.55) * L * Math.cos((-14 * Math.PI) / 180) : x0 + t * L;
  const by = onTip ? jy + (t - 0.55) * L * Math.sin((-14 * Math.PI) / 180) : t * L * 0.14;
  const tl = L * (0.32 - 0.04 * i);
  const az = side * (26 + 6 * i) + (onTip ? -14 : 8);
  const rise = 10;
  const tw = ngon(r0 * 0.4, 4).loft(ngon(r0 * 0.12, 4), { spacing: tl, ruled: true }).rotateY(90 - rise).rotateZ(az).translate(bx, by, r0);
  branch.part(`twig-${i + 1}`, tw.color(bark));
  const rad = (az * Math.PI) / 180;
  const c = Math.cos((rise * Math.PI) / 180);
  tips.push([bx + tl * c * Math.cos(rad), by + tl * c * Math.sin(rad), r0 + tl * Math.sin((rise * Math.PI) / 180)]);
}

if (leafy.value === 'yes') {
  tips.forEach(([x, y, z], i) => {
    const lr = L * 0.06;
    const clump = ngon(lr * 0.9, 6, i).loft([ngon(lr * 1.25, 6, i + 0.5), ngon(lr * 0.45, 6, i)], {
      planes: [
        { plane: 'XY', origin: [x, y, Math.max(0, z - lr * 0.3)] },
        { plane: 'XY', origin: [x, y, z + lr * 0.05] },
        { plane: 'XY', origin: [x, y, z + lr * 0.35] },
      ],
      ruled: true,
    });
    branch.part(`leaves-${i + 1}`, clump.color(leaves));
  });
}

return branch.model();
