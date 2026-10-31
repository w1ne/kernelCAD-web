// Original kernelCAD low-poly fallen log: a faceted cylinder lying along X,
// pale cut end-grain caps with a darker heart ring, and a broken branch stub.

meta({
  name: 'log',
  license: 'CC0-1.0',
  title: 'Fallen log',
  description: 'Fallen tree log lying on the ground with faceted bark, cut end rings and a branch stub. Knobs: length, diameter, branch stub, bark, end-grain and heartwood colours.',
  tags: ['log', 'wood', 'timber', 'fallen tree', 'firewood', 'forest', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow'],
  triangleBudget: 160,
});

const lengthM = param('lengthM', '2', { choices: ['1', '2', '3', '4'], label: 'Length (m)' });
const diameter = param('diameter', '0.4', { choices: ['0.25', '0.4', '0.6'], label: 'Diameter (m)' });
const stub = param('stub', 'yes', { choices: ['yes', 'no'], label: 'Branch stub' });
const bark = param('bark', '#6b4a30', { label: 'Bark' });
const wood = param('wood', '#d9b27a', { label: 'End grain' });
const heart = param('heart', '#a8743f', { label: 'Heartwood ring' });

presets({
  birch: { bark: '#e2ddd2' },
  mossy: { bark: '#4f6a34' },
});

const L = Number(lengthM.value) * 1000;
const r = (Number(diameter.value) * 1000) / 2;
const s = 7;

const ngon = (rr: number, n: number) => {
  let p = path().moveTo(rr, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(rr * Math.cos((2 * Math.PI * k) / n), rr * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
// Lay an extrusion along +X, centred on x = 0, resting on its lowest vertex.
const lay = (shape: ReturnType<ReturnType<typeof ngon>['extrude']>, len: number, x0: number) => shape.rotateY(90).translate(x0 - len / 2, 0, r);

const log = assembly('log');
const body = L - 40;
log.part('bark', lay(ngon(r, s).extrude(body), body, 0).color(bark));
for (const side of [-1, 1]) {
  const x = side * (body / 2 + 10);
  log.part(`end-${side < 0 ? 'a' : 'b'}`, lay(ngon(r * 0.88, s).extrude(20), 20, x).color(wood));
  log.part(`heart-${side < 0 ? 'a' : 'b'}`, lay(ngon(r * 0.4, 5).extrude(28), 28, x).color(heart));
}
if (stub.value === 'yes') {
  log.part(
    'stub',
    ngon(r * 0.3, 5).loft(ngon(r * 0.2, 5), { spacing: r * 1.4, ruled: true }).rotateX(-40).translate(L * 0.15, r * 0.3, r * 1.5).color(bark),
  );
}

return log.model();
