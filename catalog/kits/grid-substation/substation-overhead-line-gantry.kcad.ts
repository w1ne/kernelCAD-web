// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-overhead-line-gantry",
  license: "CC0-1.0",
  title: "Overhead line gantry",
  description: "Portal frame carrying the incoming line conductors above a utility substation bay. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-overhead-line-gantry");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("foot-left", [560, 620, 320], [-2380, -620, 0]);
B("foot-right", [560, 620, 320], [2380, -620, 0]);
B("column-left", [308, 308, 6500], [-2380, -620, 320]);
B("column-right", [308, 308, 6500], [2380, -620, 320]);
B("top-crossbeam", [5600, 324, 320], [0, 0, 6820]);
B("cantilever-left", [616, 220, 180], [-2492, 0, 6280]);
B("cantilever-right", [616, 220, 180], [2492, 0, 6280]);
C("insulator-1", 440, 85, [-1624, 0, 5840]);
C("insulator-2", 440, 85, [-560, 0, 5840]);
C("insulator-3", 440, 85, [560, 0, 5840]);
C("insulator-4", 440, 85, [1624, 0, 5840]);
B("earthing-platform", [3248, 630, 120], [0, 342, 6510]);

return p.model();
