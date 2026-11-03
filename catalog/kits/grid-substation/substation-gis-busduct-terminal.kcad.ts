// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-gis-busduct-terminal",
  license: "CC0-1.0",
  title: "GIS bus duct terminal",
  description: "Enclosed bus duct end module with a terminal stack and a rectangular service panel. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-gis-busduct-terminal");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("enclosure-base", [2000, 1200, 340], [0, 0, 0]);
B("sealed-enclosure", [1520, 864, 1014], [0, 0, 340]);
C("bushing-1", 721.50, 125, [-600, 0, 1423.50]);
B("terminal-1", [230, 260, 170], [-600, 0, 1770]);
C("bushing-2", 721.50, 125, [0, 0, 1423.50]);
B("terminal-2", [230, 260, 170], [0, 0, 1770]);
C("bushing-3", 721.50, 125, [600, 0, 1423.50]);
B("terminal-3", [230, 260, 170], [600, 0, 1770]);
B("service-cabinet", [460, 408.00, 1111.50], [420, 0, 340]);

return p.model();
