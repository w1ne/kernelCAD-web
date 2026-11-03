// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-bushing-turret",
  license: "CC0-1.0",
  title: "Transformer bushing turret",
  description: "Tank-top turret frame with three tall bushing stacks and terminal pads. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-bushing-turret");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("turret-frame", [1700, 1450, 350], [0, 0, 0]);
B("mounting-cap", [1496, 1276, 180], [0, 0, 350]);
C("bushing-core-1", 1496, 105, [-510, 0, 530]);
C("bushing-shed-1-1", 80, 185, [-510, 0, 700]);
C("bushing-shed-1-2", 80, 185, [-510, 0, 953]);
C("bushing-shed-1-3", 80, 185, [-510, 0, 1206]);
C("bushing-shed-1-4", 80, 185, [-510, 0, 1459]);
C("bushing-shed-1-5", 80, 185, [-510, 0, 1712]);
B("terminal-1", [230, 230, 150], [-510, 0, 2050]);
C("bushing-core-2", 1496, 105, [0, 0, 530]);
C("bushing-shed-2-1", 80, 185, [0, 0, 700]);
C("bushing-shed-2-2", 80, 185, [0, 0, 953]);
C("bushing-shed-2-3", 80, 185, [0, 0, 1206]);
C("bushing-shed-2-4", 80, 185, [0, 0, 1459]);
C("bushing-shed-2-5", 80, 185, [0, 0, 1712]);
B("terminal-2", [230, 230, 150], [0, 0, 2050]);
C("bushing-core-3", 1496, 105, [510, 0, 530]);
C("bushing-shed-3-1", 80, 185, [510, 0, 700]);
C("bushing-shed-3-2", 80, 185, [510, 0, 953]);
C("bushing-shed-3-3", 80, 185, [510, 0, 1206]);
C("bushing-shed-3-4", 80, 185, [510, 0, 1459]);
C("bushing-shed-3-5", 80, 185, [510, 0, 1712]);
B("terminal-3", [230, 230, 150], [510, 0, 2050]);

return p.model();
