// Original kernelCAD low-poly wheelbarrow: a flared open tray (a ruled loft
// hollowed by a smaller loft) on a tubular frame with one front wheel, two
// handles and rear legs. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, wheel towards -Y.

meta({
  name: 'wheelbarrow',
  license: 'CC0-1.0',
  title: 'Wheelbarrow',
  description: 'Single-wheel garden or builder wheelbarrow with a flared tray, handles and rear legs, empty or heaped with soil. Knobs: load, tray, frame, tyre and load colours.',
  tags: ['wheelbarrow', 'barrow', 'garden', 'construction', 'farm', 'cart', 'tool'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'farm', 'garden', 'construction', 'medieval'],
  triangleBudget: 360,
});

const load = param('load', 'empty', { choices: ['empty', 'soil'], label: 'Load' });
const tray = param('tray', '#2f8a4a', { label: 'Tray' });
const frame = param('frame', '#2a2c2e', { label: 'Frame and handles' });
const tyre = param('tyre', '#1d1d1f', { label: 'Tyre' });
const soil = param('soil', '#5a3f28', { label: 'Load' });

presets({
  wooden: { tray: '#a8743f', frame: '#6e4a2c', tyre: '#4a3624' },
  orange: { tray: '#e0702a' },
  sand: { load: 'soil', soil: '#d9bf86' },
});

const R = 190; // wheel radius
const wheelY = -560;
const trayZ = 330;
const depth = 280;

const rect = (w: number, l: number) => path().moveTo(-w / 2, -l / 2).lineTo(w / 2, -l / 2).lineTo(w / 2, l / 2).lineTo(-w / 2, l / 2).close();
const rectAt = (w: number, l: number, y0: number) =>
  path().moveTo(-w / 2, y0 - l / 2).lineTo(w / 2, y0 - l / 2).lineTo(w / 2, y0 + l / 2).lineTo(-w / 2, y0 + l / 2).close();
const bar = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t: number) => {
  const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  const pitch = (Math.atan2(z1 - z0, Math.hypot(x1 - x0, y1 - y0)) * 180) / Math.PI;
  const yaw = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  return box(len, t, t).translate(0, -t / 2, -t / 2).rotateY(-pitch).rotateZ(yaw).translate(x0, y0, z0);
};

const wb = assembly('wheelbarrow');
// Tray: bottom rectangle, flared top that leans forward over the wheel.
const outer = rect(380, 520).loft(rectAt(640, 920, -60), { spacing: depth, ruled: true });
const inner = rect(340, 480).loft(rectAt(600, 880, -60), { spacing: depth, ruled: true }).translate(0, 0, 25);
wb.part('tray', outer.subtract(inner).translate(0, 60, trayZ).color(tray));

// Frame: two long handle bars from the axle to the grips, two rear legs.
for (const side of [-1, 1]) {
  const s = side < 0 ? 'left' : 'right';
  // Each handle runs under the tray floor, then kinks up to its grip.
  const under: [number, number, number] = [side * 170, 380, trayZ - 22];
  wb.part(`handle-${s}`, bar(side * 75, wheelY, R, ...under, 40)
    .union(bar(side * 150, 340, trayZ - 22, side * 280, 900, trayZ + 200, 40)).color(frame));
  wb.part(`leg-${s}`, bar(side * 170, 200, trayZ - 30, side * 210, 280, 19, 36).color(frame));
  wb.part(`grip-${s}`, bar(side * 268, 850, trayZ + 178, side * 288, 1000, trayZ + 237, 50).color(tyre));
}
wb.part('axle', box(170, 30, 30, true).translate(0, wheelY, R).color(frame));
wb.part('tyre', cylinder(90, R, 12).rotateY(90).translate(-45, wheelY, R).color(tyre));
wb.part('hub', cylinder(100, R * 0.45, 8).rotateY(90).translate(-50, wheelY, R).color(frame));

if (load.value === 'soil') {
  wb.part('load', rectAt(560, 840, -60).loft(rectAt(260, 420, -30), { spacing: 90, ruled: true })
    .translate(0, 60, trayZ + depth - 30).color(soil));
}

return wb.model();
