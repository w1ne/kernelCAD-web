// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "keel-section-fit-up-jig",
  license: "CC0-1.0",
  title: "Keel section fit-up jig",
  description: "Low alignment bed with parallel keel rails, spacing blocks, datum stops, and removable reference towers. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#708079", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("keel-section-fit-up-jig");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("keel-rail-0", [2900, 220, 260], [0, -520, 130]);
B("keel-rail-1", [2900, 220, 260], [0, 520, 130]);
B("spacing-block-0", [250, 300, 360], [-950, 0, 440]);
B("spacing-block-1", [250, 300, 360], [-320, 0, 440]);
B("spacing-block-2", [250, 300, 360], [320, 0, 440]);
B("spacing-block-3", [250, 300, 360], [950, 0, 440]);
B("end-stop-0", [170, 1280, 540], [-1400, 0, 670]);
B("end-stop-1", [170, 1280, 540], [1400, 0, 670]);
B("reference-tower-0", [140, 140, 920], [-1150, -520, 720]);
B("reference-tower-1", [140, 140, 920], [-1150, 520, 720]);
B("reference-tower-2", [140, 140, 920], [1150, -520, 720]);
B("reference-tower-3", [140, 140, 920], [1150, 520, 720]);

return p.model();
