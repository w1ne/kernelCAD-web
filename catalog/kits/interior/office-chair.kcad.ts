// Original kernelCAD low-poly office swivel chair: five-star base with casters,
// gas column, seat, backrest and armrests. Front faces -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'office-chair',
  license: 'CC0-1.0',
  title: 'Office chair',
  description: 'Swivel office chair on a five-star caster base with armrests and a mid or high backrest. Knobs: back height, arms, upholstery and frame colours.',
  tags: ['office chair', 'desk chair', 'swivel chair', 'task chair', 'chair', 'seat', 'computer chair'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'office', 'bedroom'],
  triangleBudget: 450,
});

const backH = param('backH', 'mid', { choices: ['mid', 'high'], label: 'Back height' });
const arms = param('arms', 'yes', { choices: ['yes', 'no'], label: 'Armrests' });
const fabric = param('fabric', '#2f3640', { label: 'Upholstery' });
const frame = param('frame', '#1c1c1e', { label: 'Frame' });
const metal = param('metal', '#a9adb2', { label: 'Column' });

presets({
  blue: { fabric: '#2f5a8a' },
  red: { fabric: '#9b2f2f', frame: '#222222' },
  white: { fabric: '#d9d9d6', frame: '#e8e8e6', metal: '#c8ccd0' },
});

const seatZ = 470;
const R = 330; // star radius
const cast = 50;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const chair = assembly('office-chair');
// Five spokes radiating from the hub, each tipped by a caster.
for (let i = 0; i < 5; i++) {
  const a = 90 + i * 72;
  const spoke = blk(0, -22, cast + 10, R, 22, cast + 45).rotateZ(a);
  chair.part(`spoke-${i + 1}`, spoke.color(frame));
  const cx = (R - 20) * Math.cos((a * Math.PI) / 180);
  const cy = (R - 20) * Math.sin((a * Math.PI) / 180);
  chair.part(`caster-${i + 1}`, blk(cx - 22, cy - 18, 0, cx + 22, cy + 18, cast).color(frame));
  chair.part(`caster-stem-${i + 1}`, blk(cx - 10, cy - 10, cast - 5, cx + 10, cy + 10, cast + 12).color(frame));
}
chair.part('hub', cylinder(70, 45, 6).translate(0, 0, cast + 5).color(frame));
chair.part('column', cylinder(seatZ - 150 - cast, 25, 6).translate(0, 0, cast + 70).color(metal));
chair.part('mechanism', blk(-110, -120, seatZ - 100, 110, 120, seatZ - 60).color(frame));
chair.part('seat', blk(-250, -250, seatZ - 61, 250, 230, seatZ).color(fabric));
// Back support spine from under the seat up behind the backrest.
const backTop = backH.value === 'high' ? seatZ + 720 : seatZ + 520;
chair.part('spine', blk(-35, 220, seatZ - 90, 35, 260, seatZ + 200).color(frame));
chair.part('back', blk(-230, 235, seatZ + 60, 230, 295, backTop).color(fabric));
if (arms.value === 'yes') {
  for (const sx of [-1, 1]) {
    const x = sx * 270;
    chair.part(`arm-post-${sx > 0 ? 'right' : 'left'}`, blk(x - 15, -40, seatZ - 80, x + 15, 0, seatZ + 200).color(frame));
    chair.part(`arm-pad-${sx > 0 ? 'right' : 'left'}`, blk(x - 35, -160, seatZ + 200, x + 35, 100, seatZ + 230).color(frame));
    chair.part(`arm-bracket-${sx > 0 ? 'right' : 'left'}`, blk(sx > 0 ? 110 : x - 15, -40, seatZ - 100, sx > 0 ? x + 15 : -110, 0, seatZ - 70).color(frame));
  }
}

return chair.model();
