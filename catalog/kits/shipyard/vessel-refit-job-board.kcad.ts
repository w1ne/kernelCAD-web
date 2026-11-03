// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "vessel-refit-job-board",
  license: "CC0-1.0",
  title: "Vessel refit job board",
  description: "Freestanding job-status board with a wheeled base, framed planning panel, magnetic columns, and document tray. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73847d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("vessel-refit-job-board");

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

B("board-frame", [1700, 140, 1320], [0, 0, 1700]);
B("planning-panel", [1540, 90, 1100], [0, -95, 1700]);
B("column-divider-0", [45, 55, 1040], [-520, -150, 1700]);
B("column-divider-1", [45, 55, 1040], [0, -150, 1700]);
B("column-divider-2", [45, 55, 1040], [520, -150, 1700]);
B("header-rail", [1600, 120, 120], [0, -110, 2300]);
B("document-tray", [1200, 360, 120], [0, -210, 990]);
B("support-post-0", [100, 100, 1060], [-650, 0, 530]);
B("support-post-1", [100, 100, 1060], [650, 0, 530]);
C("board-wheel-0", 80, 100, [-650, -175, 100], [90, 0, 0], 8);
C("board-wheel-1", 80, 100, [650, -175, 100], [90, 0, 0], 8);
C("board-wheel-2", 80, 100, [-650, 175, 100], [90, 0, 0], 8);
C("board-wheel-3", 80, 100, [650, 175, 100], [90, 0, 0], 8);
B("frame-foot-0", [720, 420, 110], [-650, 0, 55]);
B("frame-foot-1", [720, 420, 110], [650, 0, 55]);

return p.model();
