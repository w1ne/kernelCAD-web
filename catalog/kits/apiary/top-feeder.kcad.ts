// SPDX-License-Identifier: CC0-1.0
// Hive top feeder: a Miller-style feeder, the shallow box of sugar syrup a
// beekeeper sets on top of the brood box in autumn and spring.
// What makes it a top feeder rather than a tray: it has the same footprint as
// the hive box (a ten-frame Langstroth) and a timber rim of the same joinery,
// two moulded syrup reservoirs fill it left and right, and between them a
// central slot lets the bees climb up from the box below under a screened cap
// with a ladder of mesh on each side so they reach the syrup without
// drowning. Wooden floats lie on the syrup. The plywood cover is lifted off
// in the default view so the syrup and the screen show.
// Generic visualization geometry at real size (505 x 413 x 95 mm),
// millimetres, Z up, ground on z = 0, long axis along X.

meta({
  name: "top-feeder",
  license: 'CC0-1.0',
  title: "Hive top feeder",
  description: "Miller-style hive top feeder on a ten-frame Langstroth footprint: timber rim with corner joints, two moulded syrup reservoirs filled with sugar syrup and wooden floats, central bee access slot under a screened cap with mesh ladders, optional plywood cover. Material controls: rim timber, reservoir polymer, sugar syrup, mesh screen. Cover choice; freshApiary, weatheredYard and darkSyrup presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'feeder', 'top feeder', 'miller feeder', 'syrup', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cover = param('cover', 'off', { choices: ['off', 'on'], label: 'Plywood cover' });

const timber = param('timber', '#c4935a', { label: 'Rim and cover (hive timber)' });
const polymer = param('polymer', '#2f3a3a', { label: 'Syrup reservoirs (moulded polymer)' });
const syrup = param('syrup', '#d9a63a', { label: 'Sugar syrup' });
const mesh = param('mesh', '#8e989a', { label: 'Screened cap and ladders (mesh)' });

presets({
  freshApiary: { timber: '#dcb07a', polymer: '#e8e4d6', syrup: '#e9c25c', mesh: '#b5bdbe' },
  weatheredYard: { timber: '#6e5840', polymer: '#2a2e2c', syrup: '#c58d2a', mesh: '#6d7476' },
  darkSyrup: { timber: '#c4935a', polymer: '#5a6a3a', syrup: '#9a5a1a', mesh: '#8e989a' },
});

const p = assembly("top-feeder");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);

const L = 505;
const W = 413;
const H = 95;
const T = 19; // rim board thickness
const IL = L - 2 * T;
const IW = W - 2 * T;
const SLOT = 60; // central bee slot width
const RL = (IL - SLOT) / 2; // reservoir length

// Timber rim with box-joint fingers showing at the corners, and a floor.
add('rim', b(0, 0, 0, L, W, H).subtract(b(0, 0, -1, IL, IW, H + 2)).color(timber));
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    for (const z of [8, 40, 72]) {
      add(`finger-${sx}-${sy}-${z}`, b(sx * (L / 2 - T / 2), sy * (W / 2 + 0.5), z, T, 1.5, 16).color('#a87a48'));
    }
  }
}
add('floor', b(0, 0, 0, IL, IW, 6).color(timber));

// Two moulded reservoirs, hollow, each holding syrup with floats on it.
for (const s of [-1, 1]) {
  const cx = s * (SLOT / 2 + RL / 2);
  const tub = b(cx, 0, 6, RL - 2, IW - 2, H - 10).subtract(b(cx, 0, 10, RL - 8, IW - 8, H));
  add(`reservoir-${s}`, tub.color(polymer));
  add(`reservoir-lip-${s}`, b(cx, 0, H - 6, RL + 4, IW - 2, 3).subtract(b(cx, 0, H - 7, RL - 12, IW - 12, 5)).color(polymer));
  add(`syrup-${s}`, b(cx, 0, 10, RL - 8, IW - 8, 58).color(syrup));
  for (const [dx, dy, a] of [[-40, -90, 12], [30, 10, -8], [-10, 110, 20]]) {
    add(`float-${s}-${dy}`, box(150, 22, 6, true).rotateZ(a).translate(cx + dx, dy, 71).color(timber));
  }
}

// Central bee slot: divider walls, a screened inverted-U cap and a mesh
// ladder down into each reservoir.
for (const s of [-1, 1]) add(`slot-wall-${s}`, b(s * (SLOT / 2 - 3), 0, 6, 6, IW, H - 16).color(timber));
add('slot-cap-top', b(0, 0, H - 8, SLOT + 30, IW - 30, 3).color(mesh));
for (const s of [-1, 1]) {
  add(`slot-cap-side-${s}`, b(s * (SLOT / 2 + 14), 0, 30, 2, IW - 30, H - 38).color(mesh));
  add(`mesh-ladder-${s}`, box(2, IW - 40, 70, true).rotateY(s * -22).translate(s * (SLOT / 2 + 24), 0, 45).color(mesh));
}
for (let i = -5; i <= 5; i += 1) {
  add(`cap-rib-${i}`, b(0, i * 34, H - 6, SLOT + 30, 2, 2).color('#5c6466'));
}

// Plywood cover with a bee-space rim and a finger hole.
if (cover.value === 'on') {
  add('cover', b(0, 0, H, L, W, 12).subtract(cylinder(14, 14, 20).translate(L / 2 - 50, 0, H - 1)).color(timber));
  add('cover-cleat-front', b(0, -W / 2 + 15, H + 12, L - 40, 30, 10).color(timber));
  add('cover-cleat-back', b(0, W / 2 - 15, H + 12, L - 40, 30, 10).color(timber));
}

return p.model();
