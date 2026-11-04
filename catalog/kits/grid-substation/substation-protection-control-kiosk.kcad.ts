// Protection and control kiosk: Walk-in protection kiosk with entry step, double doors, roof overhang, and service vents. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-protection-control-kiosk",
  license: "CC0-1.0",
  title: "Protection and control kiosk",
  description: "Walk-in protection kiosk with entry step, double doors, roof overhang, and service vents. Material controls: powder-coated steel, stainless steel, signal amber; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const signalAmber = param('signalAmber', '#f39c36', { label: 'Signal amber' });
presets({
  weathered: { powderCoat: '#586b63', stainlessSteel: '#9da4a0', signalAmber: '#c98b40' },
  maintenance: { signalAmber: '#ffc04d' },
});
const p = assembly("substation-protection-control-kiosk");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);
const beveledPanel = (width: number, height: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, 0).lineTo(width / 2 - cut, 0)
    .lineTo(width / 2, cut).lineTo(width / 2, height - cut)
    .lineTo(width / 2 - cut, height).lineTo(-width / 2 + cut, height)
    .lineTo(-width / 2, height - cut).lineTo(-width / 2, cut)
    .close().extrude(thickness).rotateX(90);

p.part("plinth", beveledPlate(3400, 1800, 320, 108).translate(0, 0, 0).scale(scale).color(powderCoat));
p.part("walk-in-shell", beveledPanel(3196, 2280, 1620, 136.80).translate(0, 810, 320).scale(scale).color(powderCoat));
p.part("roof-overhang", beveledPlate(3672, 1890, 180, 113.40).translate(0, 0, 2600).scale(scale).color(powderCoat));
p.part("entry-step", beveledPlate(1088, 540, 140, 32.40).translate(-816, 594, 0).scale(scale).color(powderCoat));
p.part("left-door", beveledPanel(918, 1653, 95, 55.08).translate(-646, -771.50, 400).scale(scale).color(powderCoat));
p.part("right-door", beveledPanel(918, 1653, 95, 55.08).translate(646, -771.50, 400).scale(scale).color(powderCoat));
p.part("vent-slat-1", box(952, 80, 45, true).rotateX(12).translate(952, -846, 672.50).scale(scale).color(stainlessSteel));
p.part("vent-slat-2", box(952, 80, 45, true).rotateX(12).translate(952, -846, 757.50).scale(scale).color(stainlessSteel));
p.part("vent-slat-3", box(952, 80, 45, true).rotateX(12).translate(952, -846, 842.50).scale(scale).color(stainlessSteel));
p.part("vent-slat-4", box(952, 80, 45, true).rotateX(12).translate(952, -846, 927.50).scale(scale).color(stainlessSteel));
p.part("vent-slat-5", box(952, 80, 45, true).rotateX(12).translate(952, -846, 1012.50).scale(scale).color(stainlessSteel));
p.part("vent-slat-6", box(952, 80, 45, true).rotateX(12).translate(952, -846, 1097.50).scale(scale).color(stainlessSteel));

p.part("status-lamp-amber", cylinder(78, 34, 10).translate(1122, -918, 2262).scale(scale).color(signalAmber));

return p.model();
