// Hull panel cutting table: Slatted cutting bed on a rigid underframe with rail ends, replaceable slats, and a side cable tray. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "hull-panel-cutting-table",
  license: 'CC0-1.0',
  title: "Hull panel cutting table",
  description: "Slatted cutting bed on a rigid underframe with rail ends, replaceable slats, and a side cable tray. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "hull", "panel", "cutting", "table"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#6e7f7d", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });

presets({
  'fresh-coat': {"yardPaint": "#889694", "structuralSteel": "#d0d7d8"},
  'weathered-yard': {"yardPaint": "#5b6968", "structuralSteel": "#828d91"},
});

const p = assembly("hull-panel-cutting-table");
const originOffsetMm = 0;

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

p.part("underframe", b("underframe", [2600, 1750, 250], [0, 0, 125]).color(yardPaint));
p.part("cutting-slat-0", b("cutting-slat-0", [2520, 60, 640], [0, -800, 570]).color(yardPaint));
p.part("cutting-slat-1", b("cutting-slat-1", [2520, 60, 640], [0, -640, 570]).color(yardPaint));
p.part("cutting-slat-2", b("cutting-slat-2", [2520, 60, 640], [0, -480, 570]).color(yardPaint));
p.part("cutting-slat-3", b("cutting-slat-3", [2520, 60, 640], [0, -320, 570]).color(yardPaint));
p.part("cutting-slat-4", b("cutting-slat-4", [2520, 60, 640], [0, -160, 570]).color(yardPaint));
p.part("cutting-slat-5", b("cutting-slat-5", [2520, 60, 640], [0, 0, 570]).color(yardPaint));
p.part("cutting-slat-6", b("cutting-slat-6", [2520, 60, 640], [0, 160, 570]).color(yardPaint));
p.part("cutting-slat-7", b("cutting-slat-7", [2520, 60, 640], [0, 320, 570]).color(yardPaint));
p.part("cutting-slat-8", b("cutting-slat-8", [2520, 60, 640], [0, 480, 570]).color(yardPaint));
p.part("cutting-slat-9", b("cutting-slat-9", [2520, 60, 640], [0, 640, 570]).color(yardPaint));
p.part("cutting-slat-10", b("cutting-slat-10", [2520, 60, 640], [0, 800, 570]).color(yardPaint));
p.part("end-rail-0", b("end-rail-0", [180, 1900, 170], [-1240, 0, 980]).color(structuralSteel));
p.part("end-rail-1", b("end-rail-1", [180, 1900, 170], [1240, 0, 980]).color(structuralSteel));
p.part("cable-tray", b("cable-tray", [2350, 120, 110], [0, 940, 300]).color(structuralSteel));

return p.model();
