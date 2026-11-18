// Original kernelCAD low-poly fan palm: a clump of short shaggy trunks, each
// carrying stiff fan-shaped leaves on thin stalks.

meta({
  name: 'fan-palm',
  license: 'CC0-1.0',
  title: 'Fan palm',
  description: 'Bushy Mediterranean fan palm: short clustered trunks with stiff pleated fan leaves on thin stalks, for gardens, beaches and resorts. Knobs: height, trunks, fans per trunk, trunk and leaf colours.',
  tags: ['palm', 'fan palm', 'chamaerops', 'tropical', 'mediterranean', 'beach', 'resort', 'garden', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'beach', 'tropical', 'garden', 'desert'],
  triangleBudget: 550,
});

const heightM = param('heightM', '2', { choices: ['1.2', '2', '3'], label: 'Height (m)' });
const trunks = param('trunks', '3', { choices: ['1', '2', '3'], label: 'Trunks' });
const fans = param('fans', '4', { choices: ['3', '4'], label: 'Fans per trunk' });
const trunk = param('trunk', '#6a5640', { label: 'Trunks' });
const leaf = param('leaf', '#4f8a4a', { label: 'Fan leaves' });

presets({
  silver: { leaf: '#7a9a92' },
  dry: { leaf: '#9a9a4a' },
});

const h = Number(heightM.value) * 1000;
const nt = Number(trunks.value);
const nf = Number(fans.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Fan: a pleated half disc pointing +Y from its stalk end at the origin,
// four spiky fingers, flat in XY.
const fan = (r: number) => {
  const pts: [number, number][] = [[0, -r * 0.08]];
  for (let k = 0; k <= 6; k++) {
    const a = Math.PI * 0.05 + (Math.PI * 0.9 * k) / 6;
    const rr = k % 2 === 0 ? r : r * 0.78;
    pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  return extrudePolygon(pts, 10).translate(0, 0, -5);
};

const palm = assembly('fan-palm');
for (let t = 0; t < nt; t++) {
  const a = (t * 2 * Math.PI) / Math.max(1, nt) + 0.4;
  const d = nt === 1 ? 0 : h * 0.09;
  const x = d * Math.cos(a);
  const y = d * Math.sin(a);
  const th = h * (0.45 - 0.12 * t);
  palm.part(`trunk-${t + 1}`, ngon(h * 0.05, 6).loft(ngon(h * 0.04, 6, 0.5), { spacing: th, ruled: true }).translate(x, y, 0).color(trunk));
  for (let f = 0; f < nf; f++) {
    const az = (360 * f) / nf + t * 40;
    const lift = 40 + 18 * (f % 2);
    const stalkL = h * 0.22;
    const fr = h * 0.26;
    // Stalk and fan built pointing +Y, raised by lift, then turned to az.
    const stalk = ngon(h * 0.008, 3).extrude(stalkL).rotateX(-90 + lift);
    const sl = (lift * Math.PI) / 180;
    const tipY = stalkL * Math.cos(sl);
    const tipZ = stalkL * Math.sin(sl);
    const leafPiece = fan(fr).rotateX(lift * 0.9).translate(0, tipY - fr * 0.05, tipZ);
    palm.part(`stalk-${t + 1}-${f + 1}`, stalk.rotateZ(az).translate(x, y, th).color(trunk));
    palm.part(`fan-${t + 1}-${f + 1}`, leafPiece.rotateZ(az).translate(x, y, th).color(leaf));
  }
}

return palm.model();
