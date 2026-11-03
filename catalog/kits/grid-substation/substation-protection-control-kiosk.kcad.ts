// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-protection-control-kiosk",
  license: "CC0-1.0",
  title: "Protection and control kiosk",
  description: "Walk-in protection kiosk with entry step, double doors, roof overhang, and service vents. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-protection-control-kiosk");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("plinth", [3400, 1800, 320], [0, 0, 0]);
B("walk-in-shell", [3196, 1620, 2280], [0, 0, 320]);
B("roof-overhang", [3672.00, 1890, 180], [0, 0, 2600]);
B("entry-step", [1088, 540, 140], [-816, 594, 0]);
B("left-door", [918.00, 95, 1653.00], [-646, -819, 400]);
B("right-door", [918.00, 95, 1653.00], [646, -819, 400]);
B("vent-slat-1", [952.00, 80, 45], [952.00, -846, 650]);
B("vent-slat-2", [952.00, 80, 45], [952.00, -846, 735]);
B("vent-slat-3", [952.00, 80, 45], [952.00, -846, 820]);
B("vent-slat-4", [952.00, 80, 45], [952.00, -846, 905]);
B("vent-slat-5", [952.00, 80, 45], [952.00, -846, 990]);
B("vent-slat-6", [952.00, 80, 45], [952.00, -846, 1075]);

return p.model();
