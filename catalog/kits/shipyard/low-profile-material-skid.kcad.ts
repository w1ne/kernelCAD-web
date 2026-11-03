// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "low-profile-material-skid",
  license: "CC0-1.0",
  title: "Low-profile material skid",
  description: "Reinforced ground skid with deck beams, lifting eyes, corner bumpers, and a replaceable wear plate. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#75847a", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("low-profile-material-skid");

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

B("wear-plate", [2180, 1420, 100], [0, 0, 50]);
B("deck-beam-0", [190, 1320, 220], [-800, 0, 210]);
B("deck-beam-1", [190, 1320, 220], [0, 0, 210]);
B("deck-beam-2", [190, 1320, 220], [800, 0, 210]);
B("lifting-eye-0", [180, 160, 440], [-940, -570, 510]);
B("lifting-eye-1", [180, 160, 440], [940, -570, 510]);
B("lifting-eye-2", [180, 160, 440], [-940, 570, 510]);
B("lifting-eye-3", [180, 160, 440], [940, 570, 510]);
B("corner-bumper-0", [260, 260, 260], [-1020, -650, 230]);
B("corner-bumper-1", [260, 260, 260], [1020, -650, 230]);
B("corner-bumper-2", [260, 260, 260], [-1020, 650, 230]);
B("corner-bumper-3", [260, 260, 260], [1020, 650, 230]);

return p.model();
