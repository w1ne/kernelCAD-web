// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-fire-suppression-cylinder-bank",
  license: "CC0-1.0",
  title: "Fire suppression cylinder bank",
  description: "Grouped suppression cylinders held in a rack with a shared manifold header. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-fire-suppression-cylinder-bank");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("rack-base", [2200, 900, 200], [0, 0, 0]);
B("top-retainer", [2200, 900, 160], [0, 0, 1690]);
C("cylinder-1", 1332, 162, [-880, 0, 200]);
B("valve-1", [170, 200, 130], [-880, 0, 1554]);
C("cylinder-2", 1332, 162, [0, 0, 200]);
B("valve-2", [170, 200, 130], [0, 0, 1554]);
C("cylinder-3", 1332, 162, [880, 0, 200]);
B("valve-3", [170, 200, 130], [880, 0, 1554]);
C("cylinder-4", 1332, 162, [1760, 0, 200]);
B("valve-4", [170, 200, 130], [1760, 0, 1554]);
C("cylinder-5", 1332, 162, [2640, 0, 200]);
B("valve-5", [170, 200, 130], [2640, 0, 1554]);
B("manifold-header", [2024, 150, 160], [0, 112.50, 1702]);

return p.model();
