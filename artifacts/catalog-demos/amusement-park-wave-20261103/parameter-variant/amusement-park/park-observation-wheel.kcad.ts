// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "park-observation-wheel",
  license: "CC0-1.0",
  title: "Park observation wheel",
  description: "Static scene wheel with a segmented rim, radial braces, ten enclosed gondolas, and a twin-leg base. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1.25, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#6e8885", { label: "Asset color" });
const originOffsetMm = 1.096;
const p = assembly("park-observation-wheel");

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

B("left-foundation", [760, 500, 150], [-510, 0, 75]);
B("right-foundation", [760, 500, 150], [510, 0, 75]);
B("left-support", [250, 280, 3350], [-500, 0, 1675], [0, -8, 0]);
B("right-support", [250, 280, 3350], [500, 0, 1675], [0, 8, 0]);
B("rim-segment-0", [125, 115, 940], [0, 0.0, 5480.0], [-90, 0, 0]);
B("rim-segment-1", [125, 115, 940], [0, 879.9999999999999, 5244.204710660612], [-120, 0, 0]);
B("rim-segment-2", [125, 115, 940], [0, 1524.204710660612, 4600.0], [-150, 0, 0]);
B("rim-segment-3", [125, 115, 940], [0, 1760.0, 3720.0], [-180, 0, 0]);
B("rim-segment-4", [125, 115, 940], [0, 1524.2047106606121, 2840.0000000000005], [-210, 0, 0]);
B("rim-segment-5", [125, 115, 940], [0, 879.9999999999999, 2195.7952893393876], [-240, 0, 0]);
B("rim-segment-6", [125, 115, 940], [0, 2.1553783664993416e-13, 1960.0], [-270, 0, 0]);
B("rim-segment-7", [125, 115, 940], [0, -879.9999999999995, 2195.7952893393876], [-300, 0, 0]);
B("rim-segment-8", [125, 115, 940], [0, -1524.2047106606115, 2839.999999999999], [-330, 0, 0]);
B("rim-segment-9", [125, 115, 940], [0, -1760.0, 3719.9999999999995], [-360, 0, 0]);
B("rim-segment-10", [125, 115, 940], [0, -1524.204710660612, 4600.0], [-390, 0, 0]);
B("rim-segment-11", [125, 115, 940], [0, -880.0000000000008, 5244.204710660611], [-420, 0, 0]);
B("spoke-0", [75, 80, 1770], [0, 0.0, 4605.0], [0, 0, 0]);
B("spoke-1", [75, 80, 1770], [0, 442.49999999999994, 4486.432482349228], [30, 0, 0]);
B("spoke-2", [75, 80, 1770], [0, 766.4324823492282, 4162.5], [60, 0, 0]);
B("spoke-3", [75, 80, 1770], [0, 885.0, 3720.0], [90, 0, 0]);
B("spoke-4", [75, 80, 1770], [0, 766.4324823492283, 3277.5], [120, 0, 0]);
B("spoke-5", [75, 80, 1770], [0, 442.49999999999994, 2953.5675176507716], [150, 0, 0]);
B("spoke-6", [75, 80, 1770], [0, 1.0838124172454076e-13, 2835.0], [180, 0, 0]);
B("spoke-7", [75, 80, 1770], [0, -442.4999999999998, 2953.5675176507716], [210, 0, 0]);
B("spoke-8", [75, 80, 1770], [0, -766.4324823492279, 3277.4999999999995], [240, 0, 0]);
B("spoke-9", [75, 80, 1770], [0, -885.0, 3720.0], [270, 0, 0]);
B("spoke-10", [75, 80, 1770], [0, -766.4324823492282, 4162.5], [300, 0, 0]);
B("spoke-11", [75, 80, 1770], [0, -442.5000000000004, 4486.432482349228], [330, 0, 0]);
C("axle", 450, 210, [0, 0, 3720], [90, 0, 0], 12);
B("gondola-hanger-0", [65, 70, 380], [0, 0.0, 5230.0]);
B("gondola-hanger-1", [65, 70, 380], [0, 999.2349288972043, 4905.32889043741]);
B("gondola-hanger-2", [65, 70, 380], [0, 1616.796077701761, 4055.3288904374103]);
B("gondola-hanger-3", [65, 70, 380], [0, 1616.796077701761, 3004.6711095625897]);
B("gondola-hanger-4", [65, 70, 380], [0, 999.2349288972046, 2154.6711095625897]);
B("gondola-hanger-5", [65, 70, 380], [0, 2.0818995585505005e-13, 1830.0]);
B("gondola-hanger-6", [65, 70, 380], [0, -999.2349288972041, 2154.671109562589]);
B("gondola-hanger-7", [65, 70, 380], [0, -1616.796077701761, 3004.671109562589]);
B("gondola-hanger-8", [65, 70, 380], [0, -1616.796077701761, 4055.3288904374103]);
B("gondola-hanger-9", [65, 70, 380], [0, -999.2349288972047, 4905.32889043741]);
B("gondola-0", [350, 300, 330], [0, 0.0, 4950.0]);
B("gondola-1", [350, 300, 330], [0, 999.2349288972043, 4625.32889043741]);
B("gondola-2", [350, 300, 330], [0, 1616.796077701761, 3775.3288904374103]);
B("gondola-3", [350, 300, 330], [0, 1616.796077701761, 2724.6711095625897]);
B("gondola-4", [350, 300, 330], [0, 999.2349288972046, 1874.6711095625897]);
B("gondola-5", [350, 300, 330], [0, 2.0818995585505005e-13, 1550.0]);
B("gondola-6", [350, 300, 330], [0, -999.2349288972041, 1874.6711095625892]);
B("gondola-7", [350, 300, 330], [0, -1616.796077701761, 2724.671109562589]);
B("gondola-8", [350, 300, 330], [0, -1616.796077701761, 3775.3288904374103]);
B("gondola-9", [350, 300, 330], [0, -999.2349288972047, 4625.32889043741]);

return p.model();
