// Original kernelCAD low-poly traffic island: an elongated kerbed refuge with
// a grassy infill, low shrubs and a keep-left bollard with a disc sign and
// arrow at the approach end. Millimetres, Z up, long axis on X, approach -X.

meta({
  name: 'traffic-island',
  license: 'CC0-1.0',
  title: 'Traffic island',
  description: 'Kerbed road traffic island with grass, shrubs and a keep-left bollard with disc and arrow. Knobs: length, shrubs, kerb, grass, bollard and sign colours.',
  tags: ['traffic island', 'refuge', 'median', 'kerb', 'keep left', 'bollard', 'road', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'road'],
  triangleBudget: 320,
});

const lengthM = param('lengthM', '5', { choices: ['4', '5', '7'], label: 'Length (m)' });
const shrubs = param('shrubs', '2', { choices: ['0', '2', '3'], label: 'Shrubs' });
const kerb = param('kerb', '#b8b5ad', { label: 'Kerb' });
const grass = param('grass', '#5a9a3f', { label: 'Grass and shrubs' });
const bollard = param('bollard', '#f2f2ee', { label: 'Bollard and arrow' });
const sign = param('sign', '#2a5ea8', { label: 'Sign disc' });

presets({
  paved: { grass: '#8d8c88' },
  dry: { grass: '#a8a050' },
});

const L = Number(lengthM.value) * 1000;
const ns = Number(shrubs.value);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const outline = (e: number): [number, number][] => {
  const x = L / 2 - e;
  const y = 650 - e;
  return [[-x, 0], [-x + 700, -y], [x - 700, -y], [x, 0], [x - 700, y], [-x + 700, y]];
};
const ti = assembly('traffic-island');
ti.part('kerb', extrudePolygon(outline(0), 150).subtract(extrudePolygon(outline(150), 100).translate(0, 0, 110)).color(kerb));
ti.part('grass', extrudePolygon(outline(150), 130).color(grass));
for (let i = 0; i < ns; i++) {
  const x = (i - (ns - 1) / 2) * 1100 + 400;
  const r = 300 + 60 * (i % 2);
  ti.part(`shrub-${i + 1}`, ngon(r * 0.7, 6).loft([ngon(r, 6, Math.PI / 6), ngon(r * 0.3, 6)], {
    planes: [
      { plane: 'XY', origin: [x, 0, 120] },
      { plane: 'XY', origin: [x, 0, 120 + r * 0.6] },
      { plane: 'XY', origin: [x, 0, 120 + r * 1.3] },
    ],
    ruled: true,
  }).color(grass));
}
// Keep-left bollard near the approach (-X) tip, sign facing -X.
const bx = -L / 2 + 900;
ti.part('bollard', blk(bx - 90, -170, 120, bx + 90, 170, 1050).color(bollard));
ti.part('bollard-cap', blk(bx - 110, -190, 1050, bx + 110, 190, 1100).color(sign));
const faceX = (s: Shape, dx: number) => s.rotateY(-90).translate(bx - 90 - dx, 0, 760);
ti.part('disc', faceX(ngon(170, 12).extrude(14), 0).color(sign));
const arrow: [number, number][] = [[-110, -40], [20, -40], [20, -95], [115, 0], [20, 95], [20, 40], [-110, 40]];
ti.part('arrow', faceX(extrudePolygon(arrow, 8).rotateZ(-135), 13).color(bollard));

return ti.model();
