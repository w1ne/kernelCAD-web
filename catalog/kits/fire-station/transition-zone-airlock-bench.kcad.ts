// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "transition-zone-airlock-bench",
  license: 'CC0-1.0',
  title: "Transition zone airlock bench",
  description: "Compact wipe-clean bench with boot shelves and a dividing rail for gear transitions." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "transition", "zone", "airlock", "bench"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#827f72", { label: 'Asset color' });
const p = assembly("transition-zone-airlock-bench");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("seat", [1400, 440, 70], [0, 0, 520]);
b("leg-0", [70, 70, 500], [-620, -150, 250]);
b("leg-1", [70, 70, 500], [620, -150, 250]);
b("leg-2", [70, 70, 500], [-620, 150, 250]);
b("leg-3", [70, 70, 500], [620, 150, 250]);
b("lower-shelf", [1280, 360, 45], [0, 0, 205]);
b("divider", [40, 430, 1100], [0, 205, 550]);
b("boot-slot-0", [30, 335, 220], [-510, 0, 110]);
b("boot-slot-1", [30, 335, 220], [-340, 0, 110]);
b("boot-slot-2", [30, 335, 220], [-170, 0, 110]);
b("boot-slot-3", [30, 335, 220], [0, 0, 110]);
b("boot-slot-4", [30, 335, 220], [170, 0, 110]);
b("boot-slot-5", [30, 335, 220], [340, 0, 110]);
b("boot-slot-6", [30, 335, 220], [510, 0, 110]);

return p.model();
