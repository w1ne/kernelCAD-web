// SPDX-License-Identifier: CC0-1.0
// Hoist controller: the hand pendant a rigger holds to run a chain hoist
// up or down while watching the truss fly.
// What makes it a hoist pendant rather than a remote: a tall rounded
// high-visibility housing; a red mushroom emergency stop on a guarded collar
// on the top; two pairs of shrouded UP/DOWN push buttons with arrow marks for
// the two motors; a key selector switch; a printed label strip; a tapered
// strain-relief gland where the multicore cable leaves the top; and a
// suspension eye so the pendant hangs from its cable.
// Generic visualization geometry at about real size (0.12 m wide, 0.1 m deep,
// 0.6 m to the eye), millimetres, Z up, buttons facing -Y, standing on z = 0.

meta({
  name: "hoist-controller",
  license: 'CC0-1.0',
  title: "Hoist controller",
  description: "Chain hoist hand pendant at about real size: rounded high-visibility housing, red mushroom emergency stop on a guarded collar, two pairs of shrouded up/down push buttons with arrow marks, key selector switch, label strip, tapered cable strain-relief gland, multicore cable and suspension eye. Material controls: housing shell, push buttons, emergency stop, cable jacket. houseShow, touring and blackPendant presets.",
  tags: ['hoist controller', 'hoist pendant', 'chain hoist', 'rigging', 'motor control', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const housing = param('housing', '#f2c418', { label: 'Housing shell' });
const buttons = param('buttons', '#25292c', { label: 'Push buttons and shrouds' });
const estop = param('estop', '#d42a20', { label: 'Emergency stop' });
const cable = param('cable', '#3a3f43', { label: 'Cable jacket and gland' });

presets({
  houseShow: { housing: '#f2c418', buttons: '#25292c', estop: '#d42a20', cable: '#3a3f43' },
  touring: { housing: '#ef7d1a', buttons: '#1d2023', estop: '#d42a20', cable: '#1d2023' },
  blackPendant: { housing: '#2a2e31', buttons: '#9aa3a8', estop: '#e0362a', cable: '#5b6166' },
});

const LABEL = '#e9ebe6';
const ARROW = '#f4f4f0';

const p = assembly("hoist-controller");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const W = 120;
const D = 96;
const H = 330;
const FY = -D / 2;
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Rounded housing with a rubber foot and a recessed front panel.
add("housing", extrudeRoundedRect(W, H, 26, D, { axis: 'y' }).translate(0, FY, 14 + H / 2).color(housing));
add("foot", extrudeRoundedRect(W - 16, 28, 10, D - 16, { axis: 'y' }).translate(0, FY + 8, 14).color(buttons));
add("front-panel", box(W - 24, 6, H - 70, true).translate(0, FY - 2, 14 + H / 2 - 10).color(housing));

// Two motors, each with an UP and a DOWN button in a shroud, arrows on the caps.
const arrow = (up: boolean) => {
  const s = up ? 1 : -1;
  return extrudePolygon([[-11, -7 * s], [11, -7 * s], [0, 9 * s]], 3).rotateX(90);
};
for (const [m, x] of [[1, -27], [2, 27]] as [number, number][])
  for (const [dir, z] of [["up", 250], ["down", 175]] as [string, number][]) {
    add(`shroud-${m}-${dir}`, torus(22, 5, 16).rotateX(90).translate(x, FY - 9, z).color(buttons));
    add(`button-${m}-${dir}`, cylinder(12, 18, 16).rotateX(90).translate(x, FY - 4, z).color(buttons));
    add(`arrow-${m}-${dir}`, arrow(dir === "up").translate(x, FY - 16, z).color(ARROW));
  }

// Key selector switch and label strip below the buttons.
add("key-bezel", cylinder(10, 17, 16).rotateX(90).translate(0, FY - 4, 110).color(buttons));
add("key", box(6, 14, 22, true).translate(0, FY - 18, 110).color(LABEL));
add("label-strip", box(W - 40, 3, 30, true).translate(0, FY - 6, 58).color(LABEL));
add("label-bar-1", box(30, 2, 6, true).translate(-22, FY - 8, 62).color(buttons));
add("label-bar-2", box(30, 2, 6, true).translate(22, FY - 8, 62).color(buttons));

// Emergency stop: guarded collar and red mushroom on the top, front side.
const TZ = 14 + H;
add("estop-collar", turned([[0, 0], [30, 0], [30, 22], [0, 22]]).translate(0, -14, TZ - 4).color(housing));
for (const sx of [-1, 1]) add(`estop-guard-${sx}`, box(8, 50, 40, true).translate(sx * 40, -14, TZ + 16).color(housing));
add("estop-stem", cylinder(16, 14, 12).translate(0, -14, TZ + 18).color(estop));
add("estop-mushroom", turned([[0, 0], [30, 0], [28, 10], [18, 16], [0, 18]]).translate(0, -14, TZ + 32).color(estop));

// Cable strain relief, multicore cable and suspension eye.
add("gland", turned([[0, 0], [20, 0], [20, 14], [11, 70], [0, 70]]).translate(0, 26, TZ - 4).color(cable));
add("cable", cylinder(150, 9, 12).translate(0, 26, TZ + 60).color(cable));
add("eye-boss", cylinder(14, 13, 12).translate(0, 26, TZ + 204).color(buttons));
add("eye", torus(20, 5, 16).rotateY(90).translate(0, 26, TZ + 238).color(buttons));

return p.model();
