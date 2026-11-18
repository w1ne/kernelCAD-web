// Soccer ball: faceted ivory ball with twelve dark pentagonal cover panels distributed over the spherical surface. The spherical shell clips each panel to the ball's curvature. Low-poly sports prop in millimetres, Z up.
meta({
  name: 'soccer-ball',
  license: 'CC0-1.0',
  title: 'Soccer ball',
  description: "Faceted ivory soccer ball with twelve dark pentagonal panels spaced around the spherical cover. Material controls: ball cover and panel polymer.",
  tags: ['soccer ball', 'football', 'ball', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const ballCover = param('ballCover', '#ece8d6', { label: 'Ball cover' });
const panelPolymer = param('panelPolymer', '#272c30', { label: 'Panel polymer' });
presets({ clubColors: { ballCover: '#e8e4d8', panelPolymer: '#cf4939' } });
const p = assembly('soccer-ball');
const radius = 58;
const panelShell = sphere(radius + 0.4).subtract(sphere(radius - 0.4));
const pentagon = (r: number) => Array.from({ length: 5 }, (_, i) => {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / 5;
  return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
});

p.part('ball-cover', sphere(radius).translate(0, 0, radius).scale(scale).color(ballCover));

// Clip each pentagonal cutter against a thin spherical shell so the dark panels
// sit on the curved cover instead of floating above the crown.
const panelLocations = [
  [0, 0],
  ...Array.from({ length: 5 }, (_, i) => [63.435, i * 72]),
  ...Array.from({ length: 5 }, (_, i) => [116.565, 36 + i * 72]),
  [180, 0],
];
for (let i = 0; i < panelLocations.length; i++) {
  const [tilt, azimuth] = panelLocations[i];
  const theta = (tilt * Math.PI) / 180;
  const phi = (azimuth * Math.PI) / 180;
  const x = radius * Math.sin(theta) * Math.cos(phi);
  const y = radius * Math.sin(theta) * Math.sin(phi);
  const z = radius * Math.cos(theta);
  const cutter = extrudePolygon(pentagon(14), 10)
    .translate(0, 0, -8)
    .rotateY(tilt)
    .rotateZ(azimuth)
    .translate(x, y, z);
  let panel = panelShell.intersect(cutter).translate(0, 0, radius);
  if (i === panelLocations.length - 1) {
    const floorClip = box(2 * radius + 4, 2 * radius + 4, 3 * radius)
      .translate(-radius - 2, -radius - 2, 0);
    panel = panel.intersect(floorClip);
  }
  p.part(`pentagon-panel-${i + 1}`, panel.scale(scale).color(panelPolymer));
}

return p.model();
