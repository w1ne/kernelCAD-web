// Fire suppression cylinder bank: Five suppression cylinders seated within one rack, connected to a shared manifold header. Static CC0 visualization, not pressure-rated manufacturer CAD. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-fire-suppression-cylinder-bank",
  license: "CC0-1.0",
  title: "Fire suppression cylinder bank",
  description: "Five suppression cylinders seated within one rack, connected to a shared manifold header. Static CC0 visualization, not pressure-rated manufacturer CAD. Material controls: galvanized steel, safety red, brass; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const safetyRed = param('safetyRed', '#c7493c', { label: 'Safety red' });
const brass = param('brass', '#bf9143', { label: 'Brass' });
presets({
  weathered: { galvanizedSteel: '#778080', safetyRed: '#aa5144', brass: '#a48349' },
  maintenance: { safetyRed: '#e45b4d' },
});
const p = assembly("substation-fire-suppression-cylinder-bank");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

const add = (name, shape, finish = galvanizedSteel) => p.part(name, shape.scale(scale).color(finish));
add('rack-base', beveledPlate(2200, 900, 200, 54));
// Five centres are symmetric about the rack origin; all bottles stay inside its footprint.
for (let i = 0; i < 5; i++) {
  const x = (i - 2) * 400;
  add(`cylinder-${i + 1}`, cylinder(1332, 162, 12).translate(x, 0, 200), safetyRed);
  add(`valve-${i + 1}`, box(100, 140, 130, true).translate(x, 0, 1597), brass);
  add(`manifold-branch-${i + 1}`, cylinder(70, 18, 10).translate(x, 0, 1662));
}
// The branch reaches the header underside at z=1732; each valve seats on its bottle.
add('manifold-header', box(2024, 60, 60, true).translate(0, 0, 1762));
for (const side of [-1, 1]) {
  for (const end of [-1, 1]) {
    add(`rack-post-${side}-${end}`, box(70, 50, 1360, true).translate(end * 1040, side * 180, 880));
  }
  // Retainer straps sit against the cylinder flanks and join the rack posts.
  for (const z of [650, 1280]) {
    add(`retainer-${side}-${z}`, box(2150, 40, 65, true).translate(0, side * 180, z));
  }
}

return p.model();
