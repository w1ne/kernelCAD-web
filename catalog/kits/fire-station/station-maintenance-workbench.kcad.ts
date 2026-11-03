// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-maintenance-workbench",
  license: 'CC0-1.0',
  title: "Station maintenance workbench",
  description: "Shop bench with tool backboard, vise, drawer bank and parts tray." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "maintenance", "workbench"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7d8982", { label: 'Asset color' });
const p = assembly("station-maintenance-workbench");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("worktop", [1800, 760, 80], [0, 0, 900]);
b("leg-0", [75, 75, 880], [-790, -310, 440]);
b("leg-1", [75, 75, 880], [790, -310, 440]);
b("leg-2", [75, 75, 880], [-790, 310, 440]);
b("leg-3", [75, 75, 880], [790, 310, 440]);
b("drawer-bank", [540, 690, 390], [-520, 0, 640]);
b("backboard", [1800, 55, 920], [0, 340, 1400]);
b("vise-base", [220, 220, 170], [550, -120, 1025]);
b("vise-jaw", [280, 200, 90], [550, -120, 1155]);
b("parts-tray", [430, 260, 55], [-220, 65, 970]);

return p.model();
