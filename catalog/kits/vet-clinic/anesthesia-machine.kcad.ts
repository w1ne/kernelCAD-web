// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "anesthesia-machine",
  license: 'CC0-1.0',
  title: "Veterinary anesthesia machine",
  description: "Mobile anesthesia workstation with gas cylinders, absorber canister, flow controls and monitor." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "anesthesia", "machine", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#647a80", { label: 'Asset color' });
const p = assembly("anesthesia-machine");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const c = (name: string, h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  let shape = cylinder(h, r, segments);
  if (axis && degrees) shape = shape.rotate(axis, degrees);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("base", [630, 500, 90], [0, 0, 155]);
c("wheel-a", 34, 42, 8, [-250, -190, 42], [1, 0, 0], 90);
c("wheel-b", 34, 42, 8, [250, -190, 42], [1, 0, 0], 90);
b("wheel-bracket-a", [50, 70, 66], [-250, -190, 97]);
b("wheel-bracket-b", [50, 70, 66], [250, -190, 97]);
b("tower", [420, 240, 920], [0, 0, 650]);
c("oxygen-cylinder-left", 500, 82, 10, [-170, 130, 165]);
c("oxygen-cylinder-right", 500, 82, 10, [170, 130, 165]);
c("absorber-canister", 250, 80, 12, [0, -145, 510]);
b("upper-shelf", [570, 340, 45], [0, 0, 1180]);
b("monitor", [330, 50, 230], [0, -150, 1030]);
c("flow-control-a", 105, 27, 10, [-80, -174, 775]);
c("flow-control-b", 105, 27, 10, [80, -174, 775]);
b("breathing-circuit-block", [230, 150, 130], [0, -190, 500]);

return p.model();
