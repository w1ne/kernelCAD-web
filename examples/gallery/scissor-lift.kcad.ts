// Two-stage scissor lift hero model, drawn at one raised pose.
//
// The public hero video animates this same linkage layout: crossed arms pinned
// at their centres, the left column on fixed pivots in the base and deck lugs,
// and the right column riding the base and deck tracks on rollers.
//
// Each stage has a rising arm in the outer plane and a falling arm in the
// inner plane, so the crossed arms do not share volume. Every pin runs in a
// clearance bore. Each mate seat is a point on the pin surface inside the bore
// of the part it carries.

const linkAngleDeg = 38;
const linkLen = 180;
const linkWidth = 9;
const linkThick = 14;
const linkEndPad = 8;
const sideY = 26;
const innerY = sideY - linkWidth - 0.5;
const railY = 36;
const pinR = 3;
const boreR = pinR + 0.3;
const pinHalfLen = railY + 9;
const headR = 6;
const rollerR = 8;
const rollerLen = 10;
const stageH = Math.sin((linkAngleDeg * Math.PI) / 180) * linkLen;
const halfSpan = Math.cos((linkAngleDeg * Math.PI) / 180) * linkLen / 2;
const baseZ = rollerR;
const midZ = baseZ + stageH;
const deckZ = baseZ + stageH * 2;

setCameraTarget(12, 0, deckZ / 2);

type Seat = [number, number, number];

// A bore along Y through everything between y0 and y1, with run-out.
function boreAlongY(x: number, z: number, y0: number, y1: number, r: number) {
  return cylinder(y1 - y0 + 2, r, 40).alongAxis([0, 1, 0]).translate(x, y0 - 1, z);
}

function linkBar(x1: number, z1: number, x2: number, z2: number, y: number, color: `#${string}`) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx) * 180 / Math.PI;
  return box(len + linkEndPad * 2, linkWidth, linkThick, true)
    .fillet(1.2)
    .holes('front', {
      positions: [{ u: -len / 2, v: 0 }, { u: 0, v: 0 }, { u: len / 2, v: 0 }],
      diameter: boreR * 2,
      depth: 'through',
    })
    .rotate([0, 1, 0], -angle)
    .translate((x1 + x2) / 2, y, (z1 + z2) / 2)
    .color(color);
}

function pinAt(x: number, z: number, r: number, halfLen: number, head: number) {
  const headAt = (y: number) => cylinder(2.6, head, 40).alongAxis([0, 1, 0]).translate(x, y, z);
  return cylinder(halfLen * 2, r, 40)
    .alongAxis([0, 1, 0])
    .translate(x, -halfLen, z)
    .union(headAt(-halfLen - 0.6))
    .union(headAt(halfLen - 2))
    .color('#2d3740');
}

function rollerAt(x: number, y: number, z: number) {
  return cylinder(rollerLen, rollerR, 48)
    .alongAxis([0, 1, 0])
    .translate(x, y - rollerLen / 2, z)
    .subtract(boreAlongY(x, z, y - rollerLen / 2, y + rollerLen / 2, boreR))
    .color('#1f2933');
}

const lift = assembly('animated two-stage scissor lift hero');

// Every part is modelled in world coordinates, so a fastened mate joins two
// coincident frame connectors at the seat point.
function fasten(
  child: ReturnType<typeof lift.part>,
  childName: string,
  parent: ReturnType<typeof lift.part>,
  parentName: string,
  seat: Seat,
) {
  const frame = { type: 'frame' as const, origin: { kind: 'vec3' as const, value: seat } };
  parent.connector(`${childName}-seat`, frame);
  child.connector('seat', frame);
  lift.mate(`${childName}-fastened`, `${childName}.seat`, `${parentName}.${childName}-seat`, 'fastened');
}

// The seat of a part on a pin: the lowest point of the pin, inside the bore.
const onPin = (x: number, y: number, z: number, r = pinR): Seat => [x, y, z - r];

// Base: two roller tracks, two cross-members, the fixed-pivot lugs and the
// actuator clevis.
const clevisX = -halfSpan - 18;
const clevisZ = 12;
const clevisPinR = 3;
const base = lift.part(
  'base-frame',
  box(halfSpan * 2 + 44, 8, 8, true)
    .translate(0, -railY, -4)
    .union(box(halfSpan * 2 + 44, 8, 8, true).translate(0, railY, -4))
    .color('#2b3036')
    .union(box(18, railY * 2 + 18, 7, true).translate(-halfSpan - 18, 0, -4.5).color('#3b434c'))
    .union(box(18, railY * 2 + 18, 7, true).translate(halfSpan + 18, 0, -4.5).color('#3b434c'))
    .union(box(18, 8, 18, true).translate(-halfSpan, -railY, baseZ).color('#3b434c'))
    .union(box(18, 8, 18, true).translate(-halfSpan, railY, baseZ).color('#3b434c'))
    .subtract(boreAlongY(-halfSpan, baseZ, -railY - 4, railY + 4, boreR))
    .union(box(16, 4, 21, true).translate(clevisX, -7, clevisZ - 3.5).color('#3b434c'))
    .union(box(16, 4, 21, true).translate(clevisX, 7, clevisZ - 3.5).color('#3b434c'))
    .subtract(boreAlongY(clevisX, clevisZ, -9, 9, clevisPinR + 0.3)),
);

// Deck: plate, two roller tracks under it and the fixed-pivot lugs.
const deck = lift.part(
  'platform',
  box(halfSpan * 2 + 52, railY * 2 + 22, 8, true)
    .fillet(2)
    .translate(0, 0, deckZ + rollerR + 11)
    .color('#dfe5ea')
    .union(box(halfSpan * 2 + 32, 5, 8, true).translate(0, -railY, deckZ + rollerR + 4).color('#aeb7bf'))
    .union(box(halfSpan * 2 + 32, 5, 8, true).translate(0, railY, deckZ + rollerR + 4).color('#aeb7bf'))
    .union(box(18, 5, 18, true).translate(-halfSpan, -railY, deckZ).color('#aeb7bf'))
    .union(box(18, 5, 18, true).translate(-halfSpan, railY, deckZ).color('#aeb7bf'))
    .subtract(boreAlongY(-halfSpan, deckZ, -railY - 2.5, railY + 2.5, boreR)),
);

function pinPart(name: string, x: number, z: number) {
  return lift.part(name, pinAt(x, z, pinR, pinHalfLen, headR));
}

function stage(stageName: string, z0: number, lowLeft: ReturnType<typeof lift.part>, lowLeftName: string) {
  const z1 = z0 + stageH;
  const zc = z0 + stageH / 2;
  const arms = [-1, 1].map((sign) => {
    const side = sign < 0 ? 'front' : 'rear';
    const risingName = `${stageName}-${side}-rising-arm`;
    const fallingName = `${stageName}-${side}-falling-arm`;
    return {
      sign,
      risingName,
      fallingName,
      rising: lift.part(risingName, linkBar(-halfSpan, z0, halfSpan, z1, sign * sideY, '#f6b23b')),
      falling: lift.part(fallingName, linkBar(halfSpan, z0, -halfSpan, z1, sign * innerY, '#f0782f')),
    };
  });
  const centerName = `${stageName}-center-pivot-pin`;
  const center = pinPart(centerName, 0, zc);
  for (const arm of arms) {
    fasten(arm.rising, arm.risingName, lowLeft, lowLeftName, onPin(-halfSpan, arm.sign * sideY, z0));
  }
  fasten(center, centerName, arms[0].rising, arms[0].risingName, onPin(0, -sideY, zc));
  for (const arm of arms) {
    fasten(arm.falling, arm.fallingName, center, centerName, onPin(0, arm.sign * innerY, zc));
  }
  return { front: arms[0], z1 };
}

function rollerPair(stageName: string, pin: ReturnType<typeof lift.part>, pinName: string, z: number) {
  for (const sign of [-1, 1]) {
    const name = `${stageName}-${sign < 0 ? 'front' : 'rear'}-roller`;
    fasten(lift.part(name, rollerAt(halfSpan, sign * railY, z)), name, pin, pinName, onPin(halfSpan, sign * railY, z));
  }
}

// Lower stage: fixed pivot in the base lugs, rollers on the base tracks.
const basePivot = pinPart('lower-left-pivot-pin', -halfSpan, baseZ);
fasten(basePivot, 'lower-left-pivot-pin', base, 'base-frame', onPin(-halfSpan, -railY, baseZ));
const lower = stage('lower', baseZ, basePivot, 'lower-left-pivot-pin');
const baseRollerPin = pinPart('lower-right-roller-pin', halfSpan, baseZ);
fasten(baseRollerPin, 'lower-right-roller-pin', lower.front.falling, lower.front.fallingName, onPin(halfSpan, -innerY, baseZ));
rollerPair('lower', baseRollerPin, 'lower-right-roller-pin', baseZ);

// Mid joints: one pin carries the lower arm end and the upper arm start.
const midLeft = pinPart('mid-left-pivot-pin', -halfSpan, midZ);
fasten(midLeft, 'mid-left-pivot-pin', lower.front.falling, lower.front.fallingName, onPin(-halfSpan, -innerY, midZ));
const midRight = pinPart('mid-right-pivot-pin', halfSpan, midZ);
fasten(midRight, 'mid-right-pivot-pin', lower.front.rising, lower.front.risingName, onPin(halfSpan, -sideY, midZ));

// Upper stage: fixed pivot in the deck lugs, rollers under the deck tracks.
const upper = stage('upper', midZ, midLeft, 'mid-left-pivot-pin');
const deckPivot = pinPart('upper-left-pivot-pin', -halfSpan, deckZ);
fasten(deckPivot, 'upper-left-pivot-pin', upper.front.falling, upper.front.fallingName, onPin(-halfSpan, -innerY, deckZ));
const deckRollerPin = pinPart('upper-right-roller-pin', halfSpan, deckZ);
fasten(deckRollerPin, 'upper-right-roller-pin', upper.front.rising, upper.front.risingName, onPin(halfSpan, -sideY, deckZ));
rollerPair('upper', deckRollerPin, 'upper-right-roller-pin', deckZ);
fasten(deck, 'platform', deckPivot, 'upper-left-pivot-pin', onPin(-halfSpan, -railY, deckZ));

// Actuator: base eye on the clevis pin, rod eye on the lower centre pin.
const rodEyeZ = baseZ + stageH / 2;
const strokeLen = Math.hypot(-clevisX, rodEyeZ - clevisZ);
const strokeDir: Seat = [-clevisX / strokeLen, 0, (rodEyeZ - clevisZ) / strokeLen];
const along = (d: number): Seat => [clevisX + strokeDir[0] * d, 0, clevisZ + strokeDir[2] * d];
const barrelLen = strokeLen * 0.6;
const clevisPin = lift.part('actuator-base-pin', pinAt(clevisX, clevisZ, clevisPinR, 11, 5));
fasten(clevisPin, 'actuator-base-pin', base, 'base-frame', onPin(clevisX, -7, clevisZ, clevisPinR));
const actuator = lift.part(
  'actuator',
  cylinder(9, 7, 40)
    .alongAxis([0, 1, 0])
    .translate(clevisX, -4.5, clevisZ)
    .union(cylinder(barrelLen, 5, 32).alongAxis(strokeDir).translate(...along(4)))
    .color('#87919a')
    .union(
      cylinder(strokeLen - barrelLen - 7, 3.2, 32)
        .alongAxis(strokeDir)
        .translate(...along(barrelLen + 2))
        .color('#d9dee2'),
    )
    .union(cylinder(9, 8, 40).alongAxis([0, 1, 0]).translate(0, -4.5, rodEyeZ).color('#d9dee2'))
    .subtract(boreAlongY(clevisX, clevisZ, -4.5, 4.5, clevisPinR + 0.3))
    .subtract(boreAlongY(0, rodEyeZ, -4.5, 4.5, boreR)),
);
fasten(actuator, 'actuator', clevisPin, 'actuator-base-pin', onPin(clevisX, 0, clevisZ, clevisPinR));

return lift.model();
