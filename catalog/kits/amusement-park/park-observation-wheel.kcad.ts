// Park observation wheel: Static scene wheel with a faceted continuous rim, radial braces, ten enclosed gondolas, and a twin-leg base.
meta({
  name: "park-observation-wheel",
  license: "CC0-1.0",
  title: "Park observation wheel",
  description: "Static scene wheel with a faceted continuous rim, radial braces, ten enclosed gondolas, and a twin-leg base. Controls: overall scale, concrete, galvanizedSteel, enamel; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param("concrete", "#92938b", { label: "Concrete" });
const galvanizedSteel = param("galvanizedSteel", "#7e8d92", { label: "Galvanized steel" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });

presets({
  festival: {
    "concrete": "#aaa99e",
    "galvanizedSteel": "#9aa7a8",
    "enamel": "#edb34d"
},
  twilight: {
    "concrete": "#6f7477",
    "galvanizedSteel": "#586c73",
    "enamel": "#385b81"
},
});
const originOffsetMm = 1.096;
const p = assembly("park-observation-wheel");

const gondolaLower = path().moveTo(-175, -150).lineTo(175, -150).lineTo(175, 150).lineTo(-175, 150).close();
const gondolaUpper = path().moveTo(-150, -130).lineTo(150, -130).lineTo(150, 130).lineTo(-150, 130).close();
const gondolaBody = gondolaLower.loft(gondolaUpper, { spacing: 330, ruled: true });

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if ([].includes(name)) p.part(name, positioned.color(concrete));
  else if (["gondola-0", "gondola-1", "gondola-2", "gondola-3", "gondola-4", "gondola-5", "gondola-6", "gondola-7", "gondola-8", "gondola-9"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["axle", "gondola-hanger-0", "gondola-hanger-1", "gondola-hanger-2", "gondola-hanger-3", "gondola-hanger-4", "gondola-hanger-5", "gondola-hanger-6", "gondola-hanger-7", "gondola-hanger-8", "gondola-hanger-9", "left-foundation", "left-support", "right-foundation", "right-support", "rim-segment-0", "rim-segment-1", "rim-segment-10", "rim-segment-11", "rim-segment-2", "rim-segment-3", "rim-segment-4", "rim-segment-5", "rim-segment-6", "rim-segment-7", "rim-segment-8", "rim-segment-9", "spoke-0", "spoke-1", "spoke-10", "spoke-11", "spoke-2", "spoke-3", "spoke-4", "spoke-5", "spoke-6", "spoke-7", "spoke-8", "spoke-9", "wheel-rim"].includes(name)) p.part(name, positioned.color(galvanizedSteel));
  else p.part(name, positioned.color(concrete));
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
place("gondola-0", gondolaBody, [0, 0.0, 4785.000000]);
place("gondola-1", gondolaBody, [0, 999.2349288972043, 4460.328890]);
place("gondola-2", gondolaBody, [0, 1616.796077701761, 3610.328890]);
place("gondola-3", gondolaBody, [0, 1616.796077701761, 2559.671110]);
place("gondola-4", gondolaBody, [0, 999.2349288972046, 1709.671110]);
place("gondola-5", gondolaBody, [0, 2.0818995585505005e-13, 1385.000000]);
place("gondola-6", gondolaBody, [0, -999.2349288972041, 1709.671110]);
place("gondola-7", gondolaBody, [0, -1616.796077701761, 2559.671110]);
place("gondola-8", gondolaBody, [0, -1616.796077701761, 3610.328890]);
place("gondola-9", gondolaBody, [0, -999.2349288972047, 4460.328890]);

place("wheel-rim", cylinder(115, 1880, 32).subtract(cylinder(117, 1760, 32).translate(0, 0, -1)).rotate([0, 1, 0], 90), [-57.5, 0, 3720]);

return p.model();
