// Original kernelCAD low-poly farmland tile: a 2 m x 2 m ploughed field with
// raised soil furrows running along Y, optionally planted with sprouts,
// cabbages or wheat. Furrows run edge to edge, so fields tile on a 2 m grid.

meta({
  name: 'farmland-tile',
  license: 'CC0-1.0',
  title: 'Farmland tile',
  description: 'Square 2 m ploughed field tile with raised soil furrows and an optional crop of sprouts, cabbages or wheat. Knobs: furrow count, crop, soil, furrow, crop and dirt colours.',
  tags: ['tile', 'farm', 'field', 'crops', 'plough', 'furrow', 'garden', 'vegetables', 'wheat', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'farm', 'village', 'meadow'],
  triangleBudget: 1000,
});

const rowsP = param('rows', '5', { choices: ['4', '5', '6'], label: 'Furrows' });
const crop = param('crop', 'cabbage', { choices: ['none', 'sprouts', 'cabbage', 'wheat'], label: 'Crop' });
const soil = param('soil', '#6b4a2e', { label: 'Soil' });
const furrow = param('furrow', '#7d5836', { label: 'Furrows' });
const cropC = param('cropColor', '#7fbf4a', { label: 'Crop' });
const dirt = param('dirt', '#4f3622', { label: 'Dirt edge' });

presets({
  wheat: { crop: 'wheat', cropColor: '#e3c35a' },
  pumpkin: { crop: 'cabbage', cropColor: '#e07a26' },
  dry: { soil: '#9a7650', furrow: '#a88358', crop: 'none' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const n = Number(rowsP.value);
const pitch = S / n;
const ridgeH = 90;

// Extrude a (x, z) profile along Y over [-h, h].
const alongY = (pts: [number, number][]) => extrudePolygon(pts, S).rotateX(90).translate(0, h, 0);
const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) {
    const a = rot + (2 * Math.PI * k) / k0;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const tile = assembly('farmland-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
tile.part('soil', box(S, S, t - skirtH - ridgeH * 0.5, true).translate(0, 0, (t - ridgeH * 0.5 + skirtH) / 2).color(soil));

const plantsPerRow = 4;
let k = 0;
for (let i = 0; i < n; i++) {
  const x = -h + pitch * (i + 0.5);
  const bw = pitch * 0.42;
  const zb = t - ridgeH * 0.5 - 5;
  tile.part(`furrow-${i + 1}`, alongY([[x - bw, zb], [x + bw, zb], [x + bw * 0.45, t + ridgeH * 0.5], [x - bw * 0.45, t + ridgeH * 0.5]]).color(furrow));
  if (crop.value === 'none') continue;
  const top = t + ridgeH * 0.5;
  for (let j = 0; j < plantsPerRow; j++) {
    k++;
    const y = -h + (S / plantsPerRow) * (j + 0.5) + 30 * Math.sin(k * 2.1);
    const px = x + 20 * Math.sin(k * 3.7);
    let plant;
    if (crop.value === 'sprouts') {
      // Two crossed leaf blades, kept as separate pieces (a boolean union of
      // crossing blades costs far more triangles than it saves).
      const blade = (w: number, hh: number, yaw: number) =>
        extrudePolygon([[-w, 0], [0, w * 0.35], [w, 0], [0, hh]], 10).rotateX(90).rotateZ(yaw).translate(px, y, top - 15);
      tile.part(`sprout-${k}-a`, blade(70, 140, k * 37).color(cropC));
      tile.part(`sprout-${k}-b`, blade(60, 110, k * 37 + 90).color(cropC));
      continue;
    } else if (crop.value === 'cabbage') {
      const r = 130 + 25 * Math.sin(k * 1.3);
      plant = ngon(r * 0.6, 6, k).loft([ngon(r, 6, k + 0.5), ngon(r * 0.45, 6, k)], {
        planes: [
          { plane: 'XY', origin: [0, 0, -10] },
          { plane: 'XY', origin: [0, 0, r * 0.55] },
          { plane: 'XY', origin: [0, 0, r * 1.05] },
        ],
        ruled: true,
      });
    } else {
      // Wheat clump: a bundle of stalks flaring into a fatter ear band on top.
      const hh = 650 + 80 * Math.sin(k * 1.9);
      plant = ngon(55, 5, k).loft([ngon(95, 5, k + 0.6), ngon(40, 5, k)], {
        planes: [
          { plane: 'XY', origin: [0, 0, 0] },
          { plane: 'XY', origin: [0, 0, hh * 0.7] },
          { plane: 'XY', origin: [0, 0, hh] },
        ],
        ruled: true,
      });
    }
    tile.part(`plant-${k}`, plant.translate(px, y, top - 15).color(cropC));
  }
}

return tile.model();
