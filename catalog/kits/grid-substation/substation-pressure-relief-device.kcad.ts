// Pressure relief device: Compact relief valve housing with a raised indicator cap and flange foot. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-pressure-relief-device",
  license: "CC0-1.0",
  title: "Pressure relief device",
  description: "Compact relief valve housing with a raised indicator cap and flange foot. Material controls: brass, galvanized steel, signal amber; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const brass = param('brass', '#bf9143', { label: 'Brass' });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const signalAmber = param('signalAmber', '#f39c36', { label: 'Signal amber' });
presets({
  weathered: { brass: '#a48349', galvanizedSteel: '#778080', signalAmber: '#c98b40' },
  maintenance: { signalAmber: '#ffc04d' },
});
const p = assembly("substation-pressure-relief-device");

const ngon = (r: number, sides: number) => {
  let outline = path().moveTo(r, 0);
  for (let i = 1; i < sides; i++) {
    const a = (2 * Math.PI * i) / sides;
    outline = outline.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return outline.close();
};
const taperedColumn = (height: number, radius: number, sides = 10) => {
  const profiles = [ngon(radius * 1.2, sides), ngon(radius * .72, sides)];
  return profiles[0].loft(profiles.slice(1), {
    planes: [{ plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },
      { plane: 'XY' as const, origin: [0, 0, height] as [number, number, number] }],
    ruled: true,
  });
};

p.part("flange", box(680, 620, 180, true).translate(0, 0, 90).scale(scale).color(brass));
p.part("valve-body", taperedColumn(546, 204, 10).translate(0, 0, 180).scale(scale).color(brass));
p.part("bonnet", box(380.80, 347.20, 230, true).translate(0, 0, 787).scale(scale).color(galvanizedSteel));
p.part("indicator-cap", box(285.60, 260.40, 200, true).translate(0, 0, 950).scale(scale).color(signalAmber));
p.part("side-port", box(163.20, 310, 180, true).translate(187, 0, 531).scale(scale).color(galvanizedSteel));

return p.model();
