// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "welding-curtain-screen",
  license: "CC0-1.0",
  title: "Welding curtain screen",
  description: "Portable hot-work screen with a weighted base, framed panels, hinged center seam, and caster-like feet. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7e7060", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("welding-curtain-screen");

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

B("panel-frame-0", [80, 105, 1500], [-650, 0, 750]);
B("panel-frame-1", [80, 105, 1500], [0, 0, 750]);
B("panel-frame-2", [80, 105, 1500], [650, 0, 750]);
B("curtain-panel-0", [600, 55, 1280], [-320, 0, 790]);
B("curtain-panel-1", [600, 55, 1280], [320, 0, 790]);
B("base-foot-0", [700, 500, 110], [-650, 0, 55]);
B("base-foot-1", [700, 500, 110], [650, 0, 55]);
C("caster-0", 90, 65, [-820, -210, 65], [0, 0, 0], 8);
C("caster-1", 90, 65, [820, -210, 65], [0, 0, 0], 8);
C("caster-2", 90, 65, [-820, 210, 65], [0, 0, 0], 8);
C("caster-3", 90, 65, [820, 210, 65], [0, 0, 0], 8);

return p.model();
