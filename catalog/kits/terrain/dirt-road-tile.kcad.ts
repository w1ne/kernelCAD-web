// Original kernelCAD low-poly dirt road tile: a 2 m x 2 m grass tile with a
// sunken cart track - two deeper wheel ruts and a grassy hump between them -
// running straight or round a corner. Road ends are centred on the tile
// edges, so tracks join on the 2 m grid.

meta({
  name: 'dirt-road-tile',
  license: 'CC0-1.0',
  title: 'Dirt road tile',
  description: 'Square 2 m grass tile with a sunken dirt cart track, two wheel ruts and a grassy centre strip, straight or turning a corner. Knobs: layout, track width, grass, road, rut and dirt colours.',
  tags: ['tile', 'road', 'dirt road', 'cart track', 'ruts', 'trail', 'farm', 'village', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'village', 'farm', 'meadow', 'forest'],
  triangleBudget: 600,
});

const layout = param('layout', 'straight', { choices: ['straight', 'corner'], label: 'Layout' });
const widthM = param('widthM', '1.4', { choices: ['1.2', '1.4', '1.6'], label: 'Track width (m)' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const road = param('road', '#a67c50', { label: 'Road' });
const rut = param('rut', '#7f5b38', { label: 'Wheel ruts' });
const dirt = param('dirt', '#6b4a2e', { label: 'Dirt edge' });

presets({
  dry: { grass: '#b3a456', road: '#c9a46e', rut: '#a8814f' },
  muddy: { road: '#6f5136', rut: '#4f3a26', grass: '#5c8f3a' },
  snowy: { grass: '#eef3f6', road: '#cfc6bb', rut: '#8f8172' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const w = (Number(widthM.value) * 1000) / 2;
const corner = layout.value === 'corner';
const segs = 8;

// Point at lateral offset o from the centreline, a fraction u along it.
// Straight runs along Y at x = o; the corner is an arc about (h, -h) of
// radius h - o from the front edge round to the right edge. The whole track
// meanders a little and its outer grass edges are ragged; both are zero at
// u = 0 and u = 1 so tiles still join.
const ends = (u: number) => Math.sin(Math.PI * u);
const off = (o: number, i: number) => {
  const u = i / segs;
  let d = o + 90 * Math.sin(u * 5.1 + 0.6) * ends(u);
  if (Math.abs(Math.abs(o) - w) < 1) d += Math.sign(o) * 45 * Math.sin(i * 2.9 + o) * ends(u);
  return d;
};
const at = (o: number, i: number): [number, number] => {
  const d = off(o, i);
  if (!corner) return [d, -h + (S * i) / segs];
  const a = Math.PI / 2 + (Math.PI / 2) * (i / segs);
  return [h + (h - d) * Math.cos(a), -h + (h - d) * Math.sin(a)];
};
const line = (o: number, rev = false) => {
  const pts: [number, number][] = [];
  for (let k = 0; k <= segs; k++) pts.push(at(o, rev ? segs - k : k));
  return pts;
};
const band = (o0: number, o1: number): [number, number][] => [...line(o0), ...line(o1, true)];
const prism = (pts: [number, number][], z0: number, z1: number) => extrudePolygon(pts, z1 - z0).translate(0, 0, z0);

const tile = assembly('dirt-road-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
// Grass on both sides of the track, as separate connected pieces.
if (corner) {
  tile.part('grass-inner', prism([[h, -h], ...line(w, true)], skirtH - 5, t).color(grass));
  tile.part('grass-outer', prism([...line(-w), [-h, -h], [-h, h], [h, h]], skirtH - 5, t).color(grass));
} else {
  tile.part('grass-left', prism([[-h, -h], ...line(-w), [-h, h]], skirtH - 5, t).color(grass));
  tile.part('grass-right', prism([...line(w), [h, h], [h, -h]].reverse() as [number, number][], skirtH - 5, t).color(grass));
}
// Track: raised road shoulders and centre hump, deeper ruts between them.
tile.part('road-shoulder-a', prism(band(-w, -w * 0.72), skirtH - 5, t - 25).color(road));
tile.part('road-shoulder-b', prism(band(w * 0.72, w), skirtH - 5, t - 25).color(road));
tile.part('rut-a', prism(band(-w * 0.72 - 2, -w * 0.38 + 2), skirtH - 5, t - 55).color(rut));
tile.part('rut-b', prism(band(w * 0.38 - 2, w * 0.72 + 2), skirtH - 5, t - 55).color(rut));
tile.part('hump', prism(band(-w * 0.38, w * 0.38), skirtH - 5, t - 30).color(road));
tile.part('hump-grass', prism(band(-w * 0.14, w * 0.14), t - 31, t - 12).color(grass));

return tile.model();
