// Plasma cutting gantry head: Compact cutting carriage with a bridge beam, end trucks, torch head, cable loop, and operator pendant. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "plasma-cutting-gantry-head",
  license: 'CC0-1.0',
  title: "Plasma cutting gantry head",
  description: "Compact cutting carriage with a bridge beam, end trucks, torch head, cable loop, and operator pendant. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plasma", "cutting", "gantry", "head"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#d19443", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#d9a765", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#ad7b38", "structuralSteel": "#828d91"},
});

const p = assembly("plasma-cutting-gantry-head");
const originOffsetMm = -640;

const panelProfile = (w: number, d: number, corner: number) => {
  const c = Math.max(0.5, Math.min(corner, w * 0.18, d * 0.18));
  return path().moveTo(-w / 2 + c, -d / 2).lineTo(w / 2 - c, -d / 2)
    .lineTo(w / 2, -d / 2 + c).lineTo(w / 2, d / 2 - c)
    .lineTo(w / 2 - c, d / 2).lineTo(-w / 2 + c, d / 2)
    .lineTo(-w / 2, d / 2 - c).lineTo(-w / 2, -d / 2 + c).close();
};
const profiledBox = (w: number, d: number, h: number) => {
  const corner = Math.min(w, d) * 0.08;
  const inset = Math.min(w, d) * 0.025;
  return panelProfile(w, d, corner)
    .loft(panelProfile(w - inset * 2, d - inset * 2, corner * 0.9), { spacing: h, ruled: true })
    .translate(0, 0, -h / 2);
};
const taperedBox = (w: number, d: number, h: number) => {
  const bottom = panelProfile(w * 0.68, d * 0.68, Math.min(w, d) * 0.05);
  const top = panelProfile(w, d, Math.min(w, d) * 0.08);
  return bottom.loft(top, { spacing: h, ruled: true }).translate(0, 0, -h / 2);
};
const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = /^(bin-body|hopper-body|collection-bin)$/.test(name) ? taperedBox(size[0], size[1], size[2]) : profiledBox(size[0], size[1], size[2]);
  if (rotation?.[0]) shape = shape.rotateX(rotation[0]);
  if (rotation?.[1]) shape = shape.rotateY(rotation[1]);
  if (rotation?.[2]) shape = shape.rotateZ(rotation[2]);
  return shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
};

p.part("bridge", b("bridge", [2300, 230, 220], [0, 0, 1680]).color(yardPaint));
p.part("end-truck-0", b("end-truck-0", [380, 470, 330], [-1110, 0, 1520]).color(yardPaint));
p.part("end-truck-1", b("end-truck-1", [380, 470, 330], [1110, 0, 1520]).color(yardPaint));
p.part("torch-carriage", b("torch-carriage", [320, 430, 360], [180, 0, 1400]).color(structuralSteel));
p.part("torch-nozzle", b("torch-nozzle", [90, 90, 580], [180, 0, 930]).color(structuralSteel));
p.part("cable-loop", b("cable-loop", [80, 170, 780], [650, 30, 1170]).color(yardPaint));
p.part("pendant", b("pendant", [230, 120, 320], [900, -350, 1050]).color(yardPaint));

return p.model();
