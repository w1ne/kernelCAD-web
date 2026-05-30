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
        .translate(x, -railY - 10, z)
        .color('#d7dde2'),
    )
    .union(
      cylinder(2.6, washerR, 40)
        .alongAxis([0, 1, 0])
        .translate(x, railY + 7.5, z)
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

const base = lift.part(
  'welded base frame with twin guide tracks',
  box(halfSpan * 2 + 44, 8, 8, true)
    .translate(0, -railY, 2)
    .color('#2b3036')
    .union(box(halfSpan * 2 + 44, 8, 8, true).translate(0, railY, 2).color('#2b3036'))
    .union(box(18, railY * 2 + 18, 7, true).translate(-halfSpan - 18, 0, 3).color('#3b434c'))
    .union(box(18, railY * 2 + 18, 7, true).translate(halfSpan + 18, 0, 3).color('#3b434c')),
);

const deck = lift.part(
  'ribbed upper platform carried by scissor linkage',
  box(halfSpan * 2 + 52, railY * 2 + 22, 8, true)
    .fillet(2)
    .translate(0, 0, deckZ + 8)
    .color('#dfe5ea')
    .union(box(halfSpan * 2 + 32, 5, 8, true).translate(0, -railY, deckZ).color('#aeb7bf'))
    .union(box(halfSpan * 2 + 32, 5, 8, true).translate(0, railY, deckZ).color('#aeb7bf')),
);
lift.fixed('platform sits above the top guide rails', base, deck, { origin: [0, 0, deckZ] });

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
      `${stageName} ${side} rising scissor arm`,
      points.leftLow[0], points.leftLow[1],
      points.rightHigh[0], points.rightHigh[1],
      y,
      '#f6b23b',
    );
    const falling = linkBar(
      `${stageName} ${side} falling scissor arm`,
      points.rightLow[0], points.rightLow[1],
      points.leftHigh[0], points.leftHigh[1],
      y,
      '#f0782f',
    );
    const risingPart = lift.part(rising.name, rising.shape);
    const fallingPart = lift.part(falling.name, falling.shape);
    lift.fixed('pinned scissor arm in open hero pose', base, risingPart, { origin: [0, y, z0] });
    lift.fixed('opposing pinned scissor arm in open hero pose', base, fallingPart, { origin: [0, y, z0] });
  }

  pinCoords.push(
    [`${stageName} left lower fixed pivot pin`, points.leftLow[0], points.leftLow[1]],
    [`${stageName} right lower sliding roller pin`, points.rightLow[0], points.rightLow[1]],
    [`${stageName} center cross pivot pin`, points.center[0], points.center[1]],
    [`${stageName} left upper sliding roller pin`, points.leftHigh[0], points.leftHigh[1]],
    [`${stageName} right upper fixed pivot pin`, points.rightHigh[0], points.rightHigh[1]],
  );

  const lowerRollers = lift.part(
    `${stageName} guide rollers on sliding pivots`,
    rollerAt(points.rightLow[0], -railY, points.rightLow[1])
      .union(rollerAt(points.rightLow[0], railY, points.rightLow[1]))
      .union(rollerAt(points.leftHigh[0], -railY, points.leftHigh[1]))
      .union(rollerAt(points.leftHigh[0], railY, points.leftHigh[1])),
  );
  lift.fixed('rollers ride in guide tracks instead of floating pivots', base, lowerRollers, { origin: [0, 0, z0] });
}

for (const [name, x, z] of pinCoords) {
  const pin = lift.part(name, pinAt(name, x, z));
  lift.fixed('through pin with outer washers captures both scissor side plates', base, pin, { origin: [x, 0, z] });
}

const actuator = lift.part(
  'short hydraulic actuator hint between base and lower cross pivot',
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
lift.fixed('actuator pushes the lower scissor pair open', base, actuator, { origin: [-halfSpan + 34, 0, baseZ + 14] });

return lift.model();
