// Two-stage scissor lift hero model.
//
// The public hero video animates this same linkage layout: crossed bars pinned
// at their centers, one side fixed to the base/deck, and the opposite side
// riding in guide tracks on rollers.

const linkAngleDeg = 38;
const linkLen = 180;
const linkWidth = 9;
const linkThick = 7;
const sideY = 26;
const railY = 36;
const pinR = 4.2;
const washerR = 7.5;
const stageH = Math.sin((linkAngleDeg * Math.PI) / 180) * linkLen;
const halfSpan = Math.cos((linkAngleDeg * Math.PI) / 180) * linkLen / 2;
const baseZ = 8;
const deckZ = baseZ + stageH * 2;

setCameraTarget(12, 0, deckZ / 2);

function linkBar(
  name: string,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  y: number,
  color: string,
) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx) * 180 / Math.PI;
  return {
    name,
    shape: box(len, linkWidth, linkThick, true)
      .fillet(1.2)
      .rotate([0, 1, 0], -angle)
      .translate((x1 + x2) / 2, y, (z1 + z2) / 2)
      .color(color),
  };
}

function pinAt(name: string, x: number, z: number) {
  return cylinder(railY * 2 + 14, pinR, 40)
    .alongAxis([0, 1, 0])
    .translate(x, -railY - 7, z)
    .color('#2d3740')
    .union(
      cylinder(2.6, washerR, 40)
        .alongAxis([0, 1, 0])
        .translate(x, -railY - 9.6, z)
        .color('#d7dde2'),
    )
    .union(
      cylinder(2.6, washerR, 40)
        .alongAxis([0, 1, 0])
        .translate(x, railY + 7, z)
        .color('#d7dde2'),
    );
}

function rollerAt(x: number, y: number, z: number) {
  return cylinder(11, 8, 48)
    .alongAxis([0, 1, 0])
    .translate(x, y - 5.5, z)
    .color('#1f2933');
}

const lift = assembly('animated two-stage scissor lift hero');

// Every part is modelled in world coordinates, so each one is fastened to the
// base through a pair of coincident frame connectors at the given origin.
function fastenToBase(
  part: ReturnType<typeof lift.part>,
  name: string,
  origin: [number, number, number],
) {
  const frame = { type: 'frame' as const, origin: { kind: 'vec3' as const, value: origin } };
  base.connector(`${name}-seat`, frame);
  part.connector('base-seat', frame);
  lift.mate(`${name}-fastened`, `${name}.base-seat`, `base-frame.${name}-seat`, 'fastened');
}

const base = lift.part(
  'base-frame',
  box(halfSpan * 2 + 44, 8, 8, true)
    .translate(0, -railY, 2)
    .color('#2b3036')
    .union(box(halfSpan * 2 + 44, 8, 8, true).translate(0, railY, 2).color('#2b3036'))
    .union(box(18, railY * 2 + 18, 7, true).translate(-halfSpan - 18, 0, 3).color('#3b434c'))
    .union(box(18, railY * 2 + 18, 7, true).translate(halfSpan + 18, 0, 3).color('#3b434c')),
);

const deck = lift.part(
  'platform',
  box(halfSpan * 2 + 52, railY * 2 + 22, 8, true)
    .fillet(2)
    .translate(0, 0, deckZ + 8)
    .color('#dfe5ea')
    .union(box(halfSpan * 2 + 32, 5, 8, true).translate(0, -railY, deckZ).color('#aeb7bf'))
    .union(box(halfSpan * 2 + 32, 5, 8, true).translate(0, railY, deckZ).color('#aeb7bf')),
);
fastenToBase(deck, 'platform', [0, 0, deckZ]);

const pinCoords: Array<[string, number, number]> = [];
for (const [stageName, z0] of [['lower', baseZ], ['upper', baseZ + stageH]] as const) {
  const z1 = z0 + stageH;
  const points = {
    leftLow: [-halfSpan, z0] as [number, number],
    rightLow: [halfSpan, z0] as [number, number],
    leftHigh: [-halfSpan, z1] as [number, number],
    rightHigh: [halfSpan, z1] as [number, number],
    center: [0, z0 + stageH / 2] as [number, number],
  };

  for (const y of [-sideY, sideY]) {
    const side = y < 0 ? 'front' : 'rear';
    const rising = linkBar(
      `${stageName}-${side}-rising-arm`,
      points.leftLow[0], points.leftLow[1],
      points.rightHigh[0], points.rightHigh[1],
      y,
      '#f6b23b',
    );
    const falling = linkBar(
      `${stageName}-${side}-falling-arm`,
      points.rightLow[0], points.rightLow[1],
      points.leftHigh[0], points.leftHigh[1],
      y,
      '#f0782f',
    );
    const risingPart = lift.part(rising.name, rising.shape);
    const fallingPart = lift.part(falling.name, falling.shape);
    fastenToBase(risingPart, rising.name, [0, y, z0]);
    fastenToBase(fallingPart, falling.name, [0, y, z0]);
  }

  pinCoords.push(
    [`${stageName}-left-lower-pivot-pin`, points.leftLow[0], points.leftLow[1]],
    [`${stageName}-right-lower-roller-pin`, points.rightLow[0], points.rightLow[1]],
    [`${stageName}-center-pivot-pin`, points.center[0], points.center[1]],
    [`${stageName}-left-upper-roller-pin`, points.leftHigh[0], points.leftHigh[1]],
    [`${stageName}-right-upper-pivot-pin`, points.rightHigh[0], points.rightHigh[1]],
  );

  // One part per roller: each rides its own track, so they are not one body.
  for (const [corner, [x, z]] of [['low', points.rightLow], ['high', points.leftHigh]] as const) {
    for (const y of [-railY, railY]) {
      const name = `${stageName}-${corner}-${y < 0 ? 'front' : 'rear'}-roller`;
      fastenToBase(lift.part(name, rollerAt(x, y, z)), name, [x, y, z]);
    }
  }
}

for (const [name, x, z] of pinCoords) {
  const pin = lift.part(name, pinAt(name, x, z));
  fastenToBase(pin, name, [x, 0, z]);
}

const actuator = lift.part(
  'actuator',
  cylinder(stageH * 0.68, 5, 32)
    .alongAxis([0.52, 0, 0.85])
    .translate(-halfSpan + 28, 0, baseZ + 8)
    .color('#87919a')
    .union(
      cylinder(stageH * 0.34, 3.2, 32)
        .alongAxis([0.52, 0, 0.85])
        .translate(-halfSpan + 62, 0, baseZ + 62)
        .color('#d9dee2'),
    ),
);
fastenToBase(actuator, 'actuator', [-halfSpan + 34, 0, baseZ + 14]);

return lift.model();
