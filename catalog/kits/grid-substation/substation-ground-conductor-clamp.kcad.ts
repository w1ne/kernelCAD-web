// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-ground-conductor-clamp",
  license: "CC0-1.0",
  title: "Ground conductor clamp",
  description: "Bolt-on conductor clamp with a base plate, paired jaws, and crossbolt. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-ground-conductor-clamp");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("base-plate", [560, 420, 90], [0, 0, 0]);
B("jaw-left", [150, 252, 266], [-145.60, 0, 90]);
B("jaw-right", [150, 252, 266], [145.60, 0, 90]);
B("crossbolt", [448, 100, 100], [0, 0, 281.20]);

return p.model();
