// Generic three-pole center-break disconnector visualization. Each phase has
// two porcelain post insulators that carry opposing aluminum blade arms; the
// arms meet when closed and leave a visible isolation gap when open. Low-poly
// geometry in millimetres, Z up; this is not an electrical design.
meta({
  name: "substation-center-break-disconnector",
  license: "CC0-1.0",
  title: "Center break disconnector",
  description: "Generic three-pole center-break disconnector with a galvanized channel base, paired porcelain post insulators, aluminum current-path arms and copper contact inserts. The editable blade-position choice shows an open center gap or closed contacts. Weathered and maintenance material presets; visualization only.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 2200,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const switchState = param("switchState", "open", { choices: ["open", "closed"], label: "Blade position" });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
const aluminum = param('aluminum', '#b9c1c5', { label: 'Aluminum current-path arms' });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const copperContact = '#b87545';
presets({
  weathered: { galvanizedSteel: '#778080', porcelain: '#cac4b1', aluminum: '#9ea8ad', powderCoat: '#586b63' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-center-break-disconnector");

const ngon = (r: number, sides: number) => {
  let outline = path().moveTo(r, 0);
  for (let i = 1; i < sides; i++) {
    const a = (2 * Math.PI * i) / sides;
    outline = outline.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return outline.close();
};
const loftedInsulator = (height: number, radius: number, sides = 10) => {
  const levels = [0, .08, .18, .29, .40, .51, .62, .73, .84, .93, 1].map((v) => height * v);
  const radii = [.76, .98, .62, .96, .62, .96, .62, .96, .62, .95, .76].map((v) => radius * v);
  const profiles = radii.map((r) => ngon(r, sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("base-frame", beveledPlate(4100, 1200, 220, 72).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("phase-1-support--1", cylinder(1485, 95, 10).translate(-1148, -264, 220).scale(scale).color(galvanizedSteel));
p.part("phase-1-insulator--1", loftedInsulator(513, 145, 10).translate(-1148, -264, 1485).scale(scale).color(porcelain));
p.part("phase-1-support-1", cylinder(1485, 95, 10).translate(-1148, 264, 220).scale(scale).color(galvanizedSteel));
p.part("phase-1-insulator-1", loftedInsulator(513, 145, 10).translate(-1148, 264, 1485).scale(scale).color(porcelain));
p.part("phase-2-support--1", cylinder(1485, 95, 10).translate(0, -264, 220).scale(scale).color(galvanizedSteel));
p.part("phase-2-insulator--1", loftedInsulator(513, 145, 10).translate(0, -264, 1485).scale(scale).color(porcelain));
p.part("phase-2-support-1", cylinder(1485, 95, 10).translate(0, 264, 220).scale(scale).color(galvanizedSteel));
p.part("phase-2-insulator-1", loftedInsulator(513, 145, 10).translate(0, 264, 1485).scale(scale).color(porcelain));
p.part("phase-3-support--1", cylinder(1485, 95, 10).translate(1148, -264, 220).scale(scale).color(galvanizedSteel));
p.part("phase-3-insulator--1", loftedInsulator(513, 145, 10).translate(1148, -264, 1485).scale(scale).color(porcelain));
p.part("phase-3-support-1", cylinder(1485, 95, 10).translate(1148, 264, 220).scale(scale).color(galvanizedSteel));
p.part("phase-3-insulator-1", loftedInsulator(513, 145, 10).translate(1148, 264, 1485).scale(scale).color(porcelain));
p.part("drive-cabinet", box(738, 360, 918, true).translate(-1476, 0, 679).scale(scale).color(powderCoat));
p.part("operating-link", box(2542, 95, 90, true).translate(0, 456, 1179).scale(scale).color(galvanizedSteel));

// Each current path is split into two arms that seat on the insulator tops.
// The open state rotates the equal-length arms away from the centre; closed
// arms meet at their copper contact inserts. This is a visual position choice,
// not a kinematic or electrical simulation.
const phaseXs = [-1148, 0, 1148];
const supportSpacing = 528;
const bladeLength = supportSpacing / 2;
const bladeAngle = switchState.value === "open" ? 30 : 0;
for (const [phaseIndex, x] of phaseXs.entries()) {
  const phase = phaseIndex + 1;
  for (const side of [-1, 1] as const) {
    const sideName = side < 0 ? "a" : "b";
    const y = side * (supportSpacing / 2);
    const inward = -side;
    const armY = inward * bladeLength / 2;
    const tipY = inward * (bladeLength - 18);

    p.part(`phase-${phase}-blade-pivot-${sideName}`,
      cylinder(45, 88, 10).translate(x, y, 1995).scale(scale).color(aluminum));
    p.part(`phase-${phase}-blade-arm-${sideName}`,
      box(150, bladeLength, 70, true).translate(0, armY, 0).rotateZ(bladeAngle)
        .translate(x, y, 2025).scale(scale).color(aluminum));
    p.part(`phase-${phase}-contact-insert-${sideName}`,
      box(165, 36, 24, true).translate(0, tipY, 36).rotateZ(bladeAngle)
        .translate(x, y, 2061).scale(scale).color(copperContact));
  }
}

return p.model();
