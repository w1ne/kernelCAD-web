// Portable work canopy: Freestanding maintenance canopy with four posts, roof beams, and braced corners. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-portable-work-canopy",
  license: "CC0-1.0",
  title: "Portable work canopy",
  description: "Freestanding maintenance canopy with four posts, roof beams, and braced corners. Material controls: galvanized steel, insulating polymer; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const polymer = param('polymer', '#6f91a0', { label: 'Insulating polymer' });
presets({
  weathered: { galvanizedSteel: '#778080', polymer: '#6c838a' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-portable-work-canopy");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

const brace = (name: string, a: [number, number, number], b: [number, number, number], thickness: number) => {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx) * 180 / Math.PI;
  p.part(name, box(length, thickness, thickness, true).rotateY(angle)
    .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    .scale(scale).color(galvanizedSteel));
};

p.part("canopy-post", box(170, 170, 2800, true).translate(-1722, -1170, 1400).scale(scale).color(galvanizedSteel));
p.part("canopy-post-2", box(170, 170, 2800, true).translate(-1722, 1170, 1400).scale(scale).color(galvanizedSteel));
p.part("canopy-post-3", box(170, 170, 2800, true).translate(1722, -1170, 1400).scale(scale).color(galvanizedSteel));
p.part("canopy-post-4", box(170, 170, 2800, true).translate(1722, 1170, 1400).scale(scale).color(galvanizedSteel));
p.part("roof-frame-front", beveledPlate(4200, 220, 180, 13.20).translate(0, -1170, 2800).scale(scale).color(galvanizedSteel));
p.part("roof-frame-back", beveledPlate(4200, 220, 180, 13.20).translate(0, 1170, 2800).scale(scale).color(galvanizedSteel));
p.part("roof-frame-left", beveledPlate(220, 2340, 180, 13.20).translate(-1722, 0, 2800).scale(scale).color(galvanizedSteel));
p.part("roof-frame-right", beveledPlate(220, 2340, 180, 13.20).translate(1722, 0, 2800).scale(scale).color(galvanizedSteel));
p.part("roof-cover", beveledPlate(4536, 3240, 180, 194.40).translate(0, 0, 2920).scale(scale).color(polymer));
p.part("corner-brace", box(630, 130, 130, true).translate(-1596, -825, 1801).scale(scale).color(galvanizedSteel));
p.part("corner-brace-2", box(630, 130, 130, true).translate(1596, -825, 1801).scale(scale).color(galvanizedSteel));

brace("corner-brace-front-left", [-1722, -1080, 2060], [-1176, -1080, 2780], 110);
brace("corner-brace-back-left", [-1722, 1080, 2060], [-1176, 1080, 2780], 110);
brace("corner-brace-front-right", [1722, -1080, 2060], [1176, -1080, 2780], 110);
brace("corner-brace-back-right", [1722, 1080, 2060], [1176, 1080, 2780], 110);

return p.model();
