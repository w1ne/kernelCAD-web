// SPDX-License-Identifier: CC0-1.0
// Wireless intercom beltpack: the pack a stage manager, follow-spot operator
// or stagehand clips to a belt to talk on the show's comms channels.
// What makes it a beltpack rather than a radio: a chunky rounded body with
// rubber side grips; a small backlit display on the front; two large channel
// talk keys, each with a lit tally and its own volume encoder on the top
// edge; a stubby antenna at the back corner; a four-pin headset socket on the
// side with the headset plug in it; and a sprung steel belt clip on the back.
// Generic visualization geometry at about real size (85 mm wide, 45 mm deep,
// 150 mm tall to the antenna tip), millimetres, Z up, front facing -Y,
// standing on z = 0.

meta({
  name: "wireless-intercom-beltpack",
  license: 'CC0-1.0',
  title: "Wireless intercom beltpack",
  description: "Wireless theatre intercom beltpack at about real size: rounded body with rubber side grips, backlit front display, two large channel talk keys with lit tallies and top volume encoders, stubby antenna, four-pin headset socket with plug and a sprung steel belt clip on the back. Material controls: housing shell, talk keys, rubber grips and knobs, display and tally lights. houseShow, touring and redChannel presets.",
  tags: ['intercom', 'beltpack', 'comms', 'wireless', 'headset', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const housing = param('housing', '#3a4045', { label: 'Housing shell' });
const keys = param('keys', '#d9dcd8', { label: 'Talk keys' });
const rubber = param('rubber', '#1b1d1f', { label: 'Rubber grips and knobs' });
const display = param('display', '#7bd8ff', { label: 'Display and tally lights' });

presets({
  houseShow: { housing: '#3a4045', keys: '#d9dcd8', rubber: '#1b1d1f', display: '#7bd8ff' },
  touring: { housing: '#22262a', keys: '#f0a830', rubber: '#121314', display: '#9dff7a' },
  redChannel: { housing: '#5a1f22', keys: '#e8e3d8', rubber: '#1b1d1f', display: '#ff5a4a' },
});

const STEEL = '#aeb5b9';

const p = assembly("wireless-intercom-beltpack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const W = 85;
const D = 42;
const H = 120;
const FY = -D / 2;

// Body and rubber side grips.
add("body", extrudeRoundedRect(W, H, 12, D, { axis: 'y' }).translate(0, FY, H / 2).color(housing));
for (const sx of [-1, 1]) add(`grip-${sx}`, extrudeRoundedRect(8, H - 30, 4, D - 8, { axis: 'y' }).translate(sx * (W / 2 + 1), FY + 4, H / 2 - 5).color(rubber));

// Front display window and bezel.
add("display-bezel", box(60, 3, 34, true).translate(0, FY - 1, 88).color(rubber));
add("display", box(52, 2, 26, true).translate(0, FY - 3, 88).color(display));

// Two big channel talk keys with tally lights, one either side, below the display.
for (const [ch, x] of [["a", -19], ["b", 19]] as [string, number][]) {
  add(`talk-key-${ch}`, extrudeRoundedRect(32, 30, 6, 6, { axis: 'y' }).translate(x, FY - 6, 45).color(keys));
  add(`tally-${ch}`, box(18, 2, 4, true).translate(x, FY - 2, 66).color(display));
  // Volume encoder on the top edge above each channel.
  add(`encoder-${ch}`, cylinder(14, 9, 14).translate(x, -4, H).color(rubber));
  add(`encoder-cap-${ch}`, cylinder(2, 6, 12).translate(x, -4, H + 14).color(keys));
}
add("menu-key", box(14, 4, 8, true).translate(0, FY - 2, 20).color(rubber));

// Stubby antenna at the rear corner of the top.
add("antenna-base", cylinder(8, 8, 12).translate(30, 10, H).color(rubber));
const mast = path().moveTo(0, 0).lineTo(6, 0).lineTo(4.5, 34).lineTo(0, 37);
add("antenna", mast.close().revolve().translate(30, 10, H + 8).color(rubber));

// Four-pin headset socket on the left side, with the headset plug and cable stub.
add("socket", cylinder(6, 11, 14).rotateY(-90).translate(-W / 2 - 4, -2, 26).color(STEEL));
add("plug", cylinder(26, 9, 14).rotateY(-90).translate(-W / 2 - 10, -2, 26).color(rubber));
add("plug-boot", cylinder(18, 5, 10).rotateY(-90).translate(-W / 2 - 36, -2, 26).color(rubber));

// Sprung steel belt clip on the back: a bent strip.
const clipProfile = [[0, 112], [3, 112], [3, 106], [10, 100], [12, 26], [8, 18], [6, 18], [8, 26], [7, 100], [0, 106]].map(([y, z]) => [D / 2 + y, z] as [number, number]);
add("belt-clip", extrudePolygon(clipProfile, 34).rotateX(90).translate(0, 17, 0).rotateZ(90).color(STEEL));
add("clip-boss", box(40, 4, 16, true).translate(0, D / 2 + 1, 106).color(housing));

return p.model();
