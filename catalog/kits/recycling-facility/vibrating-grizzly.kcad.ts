// SPDX-License-Identifier: CC0-1.0
// Vibrating grizzly feeder: the heavy pan that meters construction and
// demolition rubble into a primary crusher and scalps the fines out first.
// A deep, open-topped steel pan rides on four coil springs; twin unbalanced
// motors bolted to its sides shake it so the load walks toward the
// discharge end. There the floor steps down onto a grizzly: a row of
// tapered manganese bars with gaps that widen toward the lip, so fines and
// soil drop through into a chute underneath while the oversize lumps walk
// off the end. What makes it a grizzly feeder rather than a hopper: the
// coil springs under a free-floating pan, the side-mounted vibrator
// motors, the stepped bar deck with rubble on it and the unders chute.
// Generic visualization geometry at about real size (5.3 m long, 2.4 m
// wide, 2.9 m high), millimetres, Z up, discharge toward +X.

meta({
  name: "vibrating-grizzly",
  license: 'CC0-1.0',
  title: "Vibrating grizzly feeder",
  description: "Vibrating grizzly feeder at about real size: deep open-top steel pan with flared feed skirts, standing on four coil springs over a base frame, twin unbalanced vibrator motors on the side walls, stepped discharge onto nine tapered grizzly bars, unders chute below the bars with a fines pile, and rubble on the pan and bars. Material controls: frame paint, wear liner, coil springs, rubble. quarry, weathered, highVisibility and recycledConcrete presets.",
  tags: ["recycling", "grizzly feeder", "vibrating feeder", "scalping", "C&D waste", "crusher feed", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#d49a2a', { label: 'Frame and pan paint' });
const liner = param('liner', '#5d6266', { label: 'Wear liner and grizzly bars (steel)' });
const springs = param('springs', '#3f7f4a', { label: 'Coil springs' });
const rubble = param('rubble', '#9a8f80', { label: 'Rubble (concrete, stone)' });

presets({
  quarry: { frame: '#d49a2a', liner: '#5d6266', springs: '#3f7f4a', rubble: '#9a8f80' },
  weathered: { frame: '#9c7f4c', liner: '#4f4a44', springs: '#5a5f52', rubble: '#8a8070' },
  highVisibility: { frame: '#e8c12c', liner: '#3e4347', springs: '#d6402e', rubble: '#a39a8c' },
  recycledConcrete: { frame: '#3a6d9c', liner: '#686d70', springs: '#e0b52f', rubble: '#c2bcb0' },
});

const p = assembly("vibrating-grizzly");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const dark = '#2a2e31';

// Pan: interior 1500 wide, x from X0 to X1, floor top at ZF.
const W = 1500, T = 30, X0 = -2300, XS = 700, X1 = 2300, ZF = 1340, ZT = 1880;
add("pan-floor", blk((X0 + XS) / 2, 0, ZF - 40, XS - X0, W, 40).color(liner));
add("pan-back", blk(X0 - T / 2, 0, ZF - 40, T, W + 2 * T, ZT - ZF + 40).color(frame));
for (const s of [-1, 1]) {
  const y = s * (W / 2 + T / 2);
  // Side wall: full height over the pan, cut low over the grizzly so the bars show.
  add(`side-wall-${s < 0 ? 'f' : 'b'}`, profileXZ([[X0, ZF - 120], [X1, ZF - 120], [X1, ZF - 110], [XS + 150, ZF - 110], [XS, ZT], [X0, ZT]], T).translate(0, y, 0).color(frame));
  add(`wall-rib-top-${s < 0 ? 'f' : 'b'}`, blk((X0 + XS) / 2, s * (W / 2 + T + 40), ZT - 90, XS - X0, 80, 90).color(frame));
  // Flared feed skirt above the pan.
  add(`feed-skirt-${s < 0 ? 'f' : 'b'}`, profileXZ([[X0, 0], [XS - 300, 0], [XS - 600, 450], [X0 - 200, 450]], T).rotateX(s * -14).translate(0, s * (W / 2 + T / 2), ZT).color(frame));
  // Spring brackets and the vibrator motor on each wall.
  for (const bx of [X0 + 600, X1 - 600]) {
    add(`bracket-${s < 0 ? 'f' : 'b'}-${bx}`, blk(bx, s * (W / 2 + T + 130), ZF - 200, 340, 260, 120).color(frame));
    add(`gusset-${s < 0 ? 'f' : 'b'}-${bx}`, profileXZ([[bx - 120, ZF - 80], [bx + 120, ZF - 80], [bx, bx < XS ? ZF + 260 : ZF - 110]], 40).translate(0, s * (W / 2 + T + 40), 0).color(frame));
  }
  const my = s * (W / 2 + T);
  add(`motor-${s < 0 ? 'f' : 'b'}`, cylinder(520, 190, 14).rotateX(90).translate(-500, s < 0 ? my : my + 520, 1700).color(dark));
  add(`motor-weight-cover-${s < 0 ? 'f' : 'b'}`, cylinder(120, 240, 14).rotateX(90).translate(-500, s < 0 ? my - 520 : my + 640, 1700).color(frame));
  add(`motor-foot-${s < 0 ? 'f' : 'b'}`, blk(-500, s * (W / 2 + T + 260), 1460, 460, 520, 60).color(dark));
}
add("feed-skirt-back", blk(0, 0, 0, 40, W + 200, 450).rotateY(-12).translate(X0 - 20, 0, ZT).color(frame));

// Grizzly: nine tapered bars, top flush 80 mm below the pan floor (the step).
const NB = 9, PB = W / NB, BW = 92;
for (let i = 0; i < NB; i++) {
  const y = -W / 2 + PB / 2 + i * PB;
  add(`grizzly-bar-${i}`, profileXZ([[XS - 60, ZF - 80], [X1 + 60, ZF - 80], [X1 + 60, ZF - 200], [XS - 60, ZF - 330]], BW).translate(0, y, 0).color(liner));
}
add("bar-carrier", blk(XS + 40, 0, ZF - 400, 160, W, 120).color(frame));
add("step-lip", blk(XS - 20, 0, ZF - 100, 80, W, 100).color(liner));

// Base frame, spring pedestals and coil springs.
for (const s of [-1, 1]) {
  const y = s * (W / 2 + T + 130);
  add(`base-beam-${s < 0 ? 'f' : 'b'}`, blk(0, y, 0, X1 - X0 + 600, 260, 300).color(frame));
  for (const bx of [X0 + 600, X1 - 600]) {
    add(`pedestal-${s < 0 ? 'f' : 'b'}-${bx}`, blk(bx, y, 300, 300, 240, 380).color(frame));
    add(`spring-core-${s < 0 ? 'f' : 'b'}-${bx}`, cylinder(440, 80, 10).translate(bx, y, 680).color(dark));
    for (let k = 0; k < 4; k++) add(`spring-${s < 0 ? 'f' : 'b'}-${bx}-${k}`, torus(115, 26, 8).translate(bx, y, 720 + k * 110).color(springs));
  }
}
for (const bx of [X0 + 300, 0, X1 - 300]) add(`base-cross-${bx}`, blk(bx, 0, 0, 220, W + 2 * T + 520, 180).color(frame));

// Unders chute under the bars, dropping fines onto a pile in front.
const CX = (XS + X1) / 2;
add("unders-chute", rect(X1 - XS + 100, W + 60).loft([rect(X1 - XS - 300, W + 260)], {
  planes: [{ plane: 'XY' as const, origin: [CX - 100, 0, 420] as [number, number, number] }, { plane: 'XY' as const, origin: [CX, 0, ZF - 420] as [number, number, number] }],
  ruled: true,
}).color(frame));
add("unders-mouth", blk(CX - 100, 0, 380, X1 - XS - 60, W - 40, 40).color(dark));
const fines = rect(1500, 1700).loft([rect(700, 900)], {
  planes: [{ plane: 'XY' as const, origin: [CX - 100, -1500, 0] as [number, number, number] }, { plane: 'XY' as const, origin: [CX - 100, -1400, 360] as [number, number, number] }],
  ruled: true,
});
add("fines-pile", fines.color(rubble));

// Rubble heap filling the pan, highest at the feed end.
add("rubble-heap", rect(XS - X0 - 200, W - 60).loft([rect(XS - X0 - 1400, W - 500)], {
  planes: [{ plane: 'XY' as const, origin: [(X0 + XS) / 2 - 100, 0, ZF] as [number, number, number] }, { plane: 'XY' as const, origin: [(X0 + XS) / 2 - 500, 0, ZF + 520] as [number, number, number] }],
  ruled: true,
}).color(rubble));

// Rubble: a jittered grid of tumbled blocks on the pan, larger lumps on the bars.
for (let i = 0; i < 14; i++) {
  const col = i % 5, row = Math.floor(i / 5);
  const x = X0 + 350 + col * 560 + (row % 2) * 180 + ((i * 37) % 90);
  const y = -W / 2 + 300 + row * 430 + ((i * 53) % 120);
  const r = 160 + ((i * 29) % 110);
  add(`rubble-${i}`, box(r * 1.5, r * 1.2, r, true).rotateX(i * 23).rotateY(i * 31).rotateZ(i * 47).translate(x, y, ZF + 120 + (col < 3 ? 380 - col * 60 : 120) + r * 0.3).color(i % 3 === 0 ? '#7f7468' : rubble));
}
for (let i = 0; i < 5; i++) {
  const r = 230 + ((i * 41) % 90);
  add(`oversize-${i}`, box(r * 1.4, r * 1.1, r, true).rotateX(i * 29).rotateY(i * 19).rotateZ(i * 53).translate(XS + 300 + i * 330, -W / 2 + 250 + ((i * 3) % 4) * 330, ZF - 80 + r * 0.5).color(i % 2 ? '#b0a596' : rubble));
}

return p.model();
