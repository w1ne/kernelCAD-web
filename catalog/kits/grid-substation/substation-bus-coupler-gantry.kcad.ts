// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-bus-coupler-gantry",
  license: "CC0-1.0",
  title: "Bus coupler gantry",
  description: "Compact portal support for bus coupler conductors between adjacent yard bays. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-bus-coupler-gantry");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("foot-left", [560, 620, 320], [-1780, -520, 0]);
B("foot-right", [560, 620, 320], [1780, -520, 0]);
B("column-left", [242, 242, 4700], [-1780, -520, 320]);
B("column-right", [242, 242, 4700], [1780, -520, 320]);
B("top-crossbeam", [4400, 288, 320], [0, 0, 5020]);
B("cantilever-left", [484, 220, 180], [-1958, 0, 4480]);
B("cantilever-right", [484, 220, 180], [1958, 0, 4480]);
C("insulator-1", 440, 85, [-1276, 0, 4040]);
C("insulator-2", 440, 85, [-440, 0, 4040]);
C("insulator-3", 440, 85, [440, 0, 4040]);
C("insulator-4", 440, 85, [1276, 0, 4040]);
B("earthing-platform", [2552, 560, 120], [0, 304, 4710]);

return p.model();
