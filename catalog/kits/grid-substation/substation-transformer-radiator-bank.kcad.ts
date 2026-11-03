// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-transformer-radiator-bank",
  license: "CC0-1.0",
  title: "Transformer radiator bank",
  description: "Fin bank with header rails and end manifolds for a transformer cooling scene. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-transformer-radiator-bank");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("lower-header", [2400, 450, 180], [0, 0, 0]);
B("upper-header", [2400, 450, 180], [0, 2270, 0]);
B("radiator-fin-1", [95, 612, 2090], [-1056, 0, 180]);
B("radiator-fin-2", [95, 612, 2090], [-633.60, 0, 180]);
B("radiator-fin-3", [95, 612, 2090], [-211.20, 0, 180]);
B("radiator-fin-4", [95, 612, 2090], [211.20, 0, 180]);
B("radiator-fin-5", [95, 612, 2090], [633.60, 0, 180]);
B("radiator-fin-6", [95, 612, 2090], [1056, 0, 180]);
B("radiator-fin-7", [95, 612, 2090], [1478.40, 0, 180]);
B("radiator-fin-8", [95, 612, 2090], [1900.80, 0, 180]);
B("radiator-fin-9", [95, 612, 2090], [2323.20, 0, 180]);
B("radiator-fin-10", [95, 612, 2090], [2745.60, 0, 180]);
B("inlet-manifold", [220, 225, 1837.50], [-1090, 0, 180]);
B("outlet-manifold", [220, 225, 1837.50], [1090, 0, 180]);

return p.model();
