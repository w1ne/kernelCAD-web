// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-strain-insulator-string",
  license: "CC0-1.0",
  title: "Strain insulator string",
  description: "Suspended stack of insulator sheds with end fittings for a line termination scene. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-strain-insulator-string");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

C("upper-clevis", 180, 129.60, [0, 0, 1520]);
C("shed-1", 115, 172.80, [0, 0, 170]);
C("shed-2", 115, 144, [0, 0, 338.57]);
C("shed-3", 115, 172.80, [0, 0, 507.14]);
C("shed-4", 115, 144, [0, 0, 675.71]);
C("shed-5", 115, 172.80, [0, 0, 844.29]);
C("shed-6", 115, 144, [0, 0, 1012.86]);
C("shed-7", 115, 172.80, [0, 0, 1181.43]);
C("lower-clevis", 190, 115.20, [0, 0, 0]);

return p.model();
