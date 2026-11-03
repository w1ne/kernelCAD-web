// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-fire-monitor-post",
  license: "CC0-1.0",
  title: "Fire monitor post",
  description: "Fixed monitor post with a raised nozzle head and two-sided control handles. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-fire-monitor-post");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("pedestal-foot", [1250, 900, 250], [0, 0, 0]);
C("standpipe", 1426, 140, [0, 0, 250]);
B("monitor-body", [687.50, 378, 280], [0, 0, 1725]);
B("nozzle", [625, 225, 190], [0, -225, 1932]);
B("handle-left", [90, 702, 120], [-325, 0, 1656]);
B("handle-right", [90, 702, 120], [325, 0, 1656]);

return p.model();
