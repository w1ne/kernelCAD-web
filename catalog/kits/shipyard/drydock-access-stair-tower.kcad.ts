// Drydock access stair tower: Compact access tower with a stepped flight, landing, twin handrails, and stabilizing base feet. This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.
meta({
  name: "drydock-access-stair-tower",
  license: 'CC0-1.0',
  title: "Drydock access stair tower",
  description: "Compact access tower with a stepped flight, landing, twin handrails, and stabilizing base feet. Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "access", "stair", "tower"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const yardPaint = param("yardPaint", "#798881", { label: "Yard finish" });
const structuralSteel = param("structuralSteel", "#b6c1c4", { label: "Structural steel" });
const elastomer = param("elastomer", "#30383b", { label: "Elastomer" });

presets({
  'fresh-coat': {"yardPaint": "#919d98", "structuralSteel": "#d0d7d8", "elastomer": "#3a4245"},
  'weathered-yard': {"yardPaint": "#64716b", "structuralSteel": "#828d91", "elastomer": "#252b2d"},
});

const p = assembly("drydock-access-stair-tower");
const originOffsetMm = -65;

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

p.part("landing", b("landing", [1050, 820, 150], [0, 0, 1390]).color(yardPaint));
p.part("stair-tread-0", b("stair-tread-0", [820, 260, 110], [-760, -300, 120]).color(elastomer));
p.part("stair-tread-1", b("stair-tread-1", [820, 260, 110], [-605, -300, 300]).color(elastomer));
p.part("stair-tread-2", b("stair-tread-2", [820, 260, 110], [-450, -300, 480]).color(elastomer));
p.part("stair-tread-3", b("stair-tread-3", [820, 260, 110], [-295, -300, 660]).color(elastomer));
p.part("stair-tread-4", b("stair-tread-4", [820, 260, 110], [-140, -300, 840]).color(elastomer));
p.part("stair-tread-5", b("stair-tread-5", [820, 260, 110], [15, -300, 1020]).color(elastomer));
p.part("stair-tread-6", b("stair-tread-6", [820, 260, 110], [170, -300, 1200]).color(elastomer));
p.part("stair-stringer-0", b("stair-stringer-0", [1900, 110, 120], [-295, -430, 660], [0, -34, 0]).color(structuralSteel));
p.part("stair-stringer-1", b("stair-stringer-1", [1900, 110, 120], [-295, -170, 660], [0, -34, 0]).color(structuralSteel));
p.part("landing-post-0", b("landing-post-0", [80, 80, 1080], [-450, 340, 850]).color(structuralSteel));
p.part("landing-post-1", b("landing-post-1", [80, 80, 1080], [450, 340, 850]).color(structuralSteel));
p.part("landing-post-2", b("landing-post-2", [80, 80, 1080], [-450, -340, 850]).color(structuralSteel));
p.part("landing-post-3", b("landing-post-3", [80, 80, 1080], [450, -340, 850]).color(structuralSteel));
p.part("handrail-0", b("handrail-0", [1000, 70, 85], [0, 340, 1400]).color(structuralSteel));
p.part("handrail-1", b("handrail-1", [1000, 70, 85], [0, -340, 1400]).color(structuralSteel));

return p.model();
