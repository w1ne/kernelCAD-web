// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "entrance-planter",
  license: "CC0-1.0",
  title: "Entrance planter",
  description: "Long entry plaza planter with four low ornamental shrubs spaced along a raised rim. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#758967", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("entrance-planter");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};
const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};
const S = (name: string, radius: number, at: [number, number, number]) => place(name, sphere(radius), at);

B("planter-box", [2100, 720, 420], [0, 0, 210]);
B("rim", [2220, 820, 75], [0, 0, 450]);
C("shrub-0", 560, 210, [-720, 0, 520], [0, 0, 0], 9);
C("shrub-1", 560, 210, [-240, 0, 520], [0, 0, 0], 9);
C("shrub-2", 560, 210, [240, 0, 520], [0, 0, 0], 9);
C("shrub-3", 560, 210, [720, 0, 520], [0, 0, 0], 9);
S("shrub-crown-0", 200, [-720, 0, 800]);
S("shrub-crown-1", 200, [-240, 0, 800]);
S("shrub-crown-2", 200, [240, 0, 800]);
S("shrub-crown-3", 200, [720, 0, 800]);

return p.model();
