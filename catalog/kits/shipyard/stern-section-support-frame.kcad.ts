// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "stern-section-support-frame",
  license: "CC0-1.0",
  title: "Stern section support frame",
  description: "Portal-style hull support with two adjustable towers, tie beam, lower braces, and paired padded contact plates. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#667c78", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("stern-section-support-frame");

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

B("left-base", [420, 520, 180], [-850, 0, 90]);
B("right-base", [420, 520, 180], [850, 0, 90]);
B("tower-0", [230, 260, 1520], [-850, 0, 940]);
B("tower-1", [230, 260, 1520], [850, 0, 940]);
B("crosshead", [2200, 350, 200], [0, 0, 1740]);
B("lower-tie", [1730, 180, 150], [0, 220, 560]);
B("contact-pad-0", [480, 260, 170], [-650, -45, 1900]);
B("contact-pad-1", [480, 260, 170], [650, -45, 1900]);
B("tower-foot-brace-0", [160, 180, 720], [-690, 150, 500]);
B("tower-foot-brace-1", [160, 180, 720], [690, 150, 500]);

return p.model();
