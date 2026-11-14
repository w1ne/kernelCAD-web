// SPDX-License-Identifier: CC0-1.0
// Stage pocket hatch: a floor pocket set into a section of stage deck, the
// flush steel box that brings power and signal up through the stage floor
// where a performer's lamp, mic or monitor is plugged in.
// What makes it a stage pocket rather than a trap door: a recessed steel box
// cut into the timber stage floor, a hinged checker-plate lid propped open on
// its back edge with a cable-exit notch and a flush lift ring, and inside the
// box a socket panel with a blue power outlet, a red three-phase outlet and
// black XLR/DMX connectors, each with its own engraved label strip.
// Generic visualization geometry at about real size (a 1.0 x 0.8 m deck
// section, 120 mm thick, with a 500 x 340 mm pocket), millimetres, Z up,
// front toward -Y, deck section standing on z = 0.

meta({
  name: "stage-pocket-hatch",
  license: 'CC0-1.0',
  title: "Stage pocket hatch",
  description: "Stage floor pocket at about real size: a recessed steel box cut into a section of timber stage floor, a hinged checker-plate lid propped open on its back edge with a cable-exit notch and lift ring, and a socket panel inside with blue power, red three-phase and black XLR/DMX connectors and label strips. Material controls: stage floor, steel lid and box, power outlets, signal connectors. houseShow, blackStage and touring presets; lid open or closed.",
  tags: ['floor pocket', 'stage pocket', 'floor box', 'stage power', 'hatch', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const lidState = param('lid', 'open', { choices: ['open', 'closed'], label: 'Lid' });

const floor = param('floor', '#8a6440', { label: 'Stage floor timber' });
const steel = param('steel', '#8e979d', { label: 'Steel lid and box' });
const power = param('power', '#2a62b8', { label: 'Power outlet' });
const signal = param('signal', '#1d1f22', { label: 'Signal connectors' });

presets({
  houseShow: { floor: '#8a6440', steel: '#8e979d', power: '#2a62b8', signal: '#1d1f22' },
  blackStage: { floor: '#202226', steel: '#5d646a', power: '#2a62b8', signal: '#111214' },
  touring: { floor: '#6e5236', steel: '#b6bdc2', power: '#d9661f', signal: '#2b2d30' },
});

const THREE_PHASE = '#c23b2a';
const LABEL = '#e9e6dc';

const p = assembly("stage-pocket-hatch");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const FT = 120; // floor thickness
const PW = 500;
const PD = 340;
const PZ = 30; // pocket floor

// Floor section with the pocket cut out, and board seams.
add("floor", blk(0, 0, 0, 1000, 800, FT).subtract(blk(0, 0, PZ, PW, PD, FT)).color(floor));
for (const [i, x] of [-375, -125, 125, 375].entries())
  if (Math.abs(x) > PW / 2 + 10) add(`board-seam-${i}`, blk(x, 0, FT, 4, 800, 1).color(signal));
add("pocket-rim", blk(0, 0, FT - 4, PW + 40, PD + 40, 5).subtract(blk(0, 0, FT - 10, PW, PD, 20)).color(steel));

// Box liner floor and socket panel standing on it.
add("box-floor", blk(0, 0, PZ, PW, PD, 4).color(steel));
add("socket-panel", blk(0, 10, PZ + 4, PW - 40, PD - 80, 20).color(steel));
const sockets: [string, number, number, number, string | ParamRef][] = [
  ["power", -150, -40, 34, power],
  ["three-phase", -40, -40, 40, THREE_PHASE],
  ["xlr-a", 70, -50, 18, signal],
  ["xlr-b", 150, -50, 18, signal],
  ["dmx", 110, 50, 18, signal],
];
for (const [id, x, y, r, c] of sockets) {
  add(`socket-${id}`, cylinder(28, r, 16).translate(x, y, PZ + 24).color(c));
  add(`socket-face-${id}`, cylinder(3, r * 0.6, 12).translate(x, y, PZ + 52).color(signal));
  add(`label-${id}`, blk(x, y + r + 18, PZ + 24, Math.max(2 * r, 50), 14, 2).color(LABEL));
}

// Hinged checker-plate lid with cable notch and lift ring.
const LT = 8;
const lidW = PW - 6;
const lidD = PD - 6;
let lid = blk(0, -lidD / 2, 0, lidW, lidD, LT).subtract(blk(0, -lidD + 20, -1, 90, 42, LT + 2));
for (let i = 0; i < 6; i++)
  for (let j = 0; j < 4; j++)
    lid = lid.union(box(40, 8, 2, true).rotateZ((i + j) % 2 ? 45 : -45).translate(-200 + i * 80, -lidD + 60 + j * 75, LT + 1));
const ring = torus(26, 5, 12).translate(0, -lidD + 70, LT + 2);
const knuckle = cylinder(lidW - 40, 8, 10).rotateY(90).translate(-(lidW - 40) / 2, 0, LT / 2);
const place = (s: Shape) =>
  lidState.value === 'open' ? s.rotateX(-100).translate(0, PD / 2 - 3, FT) : s.translate(0, PD / 2 - 3, FT - LT);
add("lid", place(lid).color(steel));
add("lift-ring", place(ring).color(LABEL));
add("hinge", place(knuckle).color(signal));

// A cable plugged into the power outlet, up over the rim and away across the floor.
if (lidState.value === 'open') {
  add("cable-riser", cylinder(FT + 10 - (PZ + 52), 10, 10).translate(-150, -40, PZ + 52).color(signal));
  add("cable-elbow", sphere(10).translate(-150, -40, FT + 10).color(signal));
  add("cable-run", cylinder(360, 10, 10).rotateX(90).translate(-150, -40, FT + 10).color(signal));
}

return p.model();
