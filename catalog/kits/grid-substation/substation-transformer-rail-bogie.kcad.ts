// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-transformer-rail-bogie",
  license: "CC0-1.0",
  title: "Transformer rail bogie",
  description: "Low transport bogie with twin rail shoes, crossmembers, and wheel housings. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-transformer-rail-bogie");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const CY = (name: string, length: number, radius: number, at: [number, number, number]) => {
  const shape = cylinder(length, radius, 10).rotate([1, 0, 0], 90);
  place(name, shape, [at[0], at[1] + length / 2, at[2] + radius]);
};

B("frame", [3500, 972.00, 342], [0, 0, 361]);
B("crossmember-front", [2800, 1620, 180], [0, -513, 285]);
B("crossmember-back", [2800, 1620, 180], [0, 513, 285]);
CY("rail-wheel", 260, 190, [-1085, -558, 0]);
CY("rail-wheel-2", 260, 190, [-1085, 558, 0]);
CY("rail-wheel-3", 260, 190, [1085, -558, 0]);
CY("rail-wheel-4", 260, 190, [1085, 558, 0]);
B("rail-shoe", [3220, 220, 160], [0, -630, 0]);
B("rail-shoe-2", [3220, 220, 160], [0, 630, 0]);

return p.model();
