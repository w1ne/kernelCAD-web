// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-control-room-console",
  license: "CC0-1.0",
  title: "Control room console",
  description: "Operator desk with three raised instrument panels and a continuous work surface. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-control-room-console");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("console-base", [2236, 750, 696], [0, 75, 0]);
B("worktop", [2600, 1250, 150], [0, -50, 696]);
B("instrument-pedestal-1", [676, 287.50, 362.50], [-754, 143.75, 913.50]);
B("display-panel-1", [624, 100, 261], [-754, 125, 1189]);
B("instrument-pedestal-2", [676, 287.50, 362.50], [0, 143.75, 913.50]);
B("display-panel-2", [624, 100, 261], [0, 125, 1189]);
B("instrument-pedestal-3", [676, 287.50, 362.50], [754, 143.75, 913.50]);
B("display-panel-3", [624, 100, 261], [754, 125, 1189]);

return p.model();
