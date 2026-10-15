// Original plywood desk organizer demonstration. Units: mm; Z up.
// Illustrative stock, not a measurement of a physical sheet.
// Plain butt-jointed outer tray; crossed, removable half-lap dividers.
// This is a static fit review, not glue strength or manufacturing approval.
const width = 150;
const depth = 100;
const thickness = 6;
const wallHeight = 40;
const slotClearance = 0.20;
const endClearance = 0.20;
const slotWidth = thickness + slotClearance;
const longLength = width - 2 * thickness - 2 * endClearance;
const shortLength = depth - 2 * thickness - 2 * endClearance;
const tray = assembly('plywood-desk-organizer');
const wood = (shape) => shape.color('#c39b69');
const base = tray.part('base', wood(box(width, depth, thickness)));
const front = tray.part('front', wood(box(width, thickness, wallHeight).translate(0, 0, thickness)));
const back = tray.part('back', wood(box(width, thickness, wallHeight).translate(0, depth-thickness, thickness)));
const left = tray.part('left', wood(box(thickness, depth-2*thickness, wallHeight).translate(0, thickness, thickness)));
const right = tray.part('right', wood(box(thickness, depth-2*thickness, wallHeight).translate(width-thickness, thickness, thickness)));
// Long divider is notched from its top; short divider from its bottom.
const longDivider = box(longLength, thickness, wallHeight)
  .subtract(box(slotWidth, thickness+2, wallHeight/2+1)
    .translate((longLength-slotWidth)/2, -1, wallHeight/2));
const shortDivider = box(thickness, shortLength, wallHeight)
  .subtract(box(thickness+2, slotWidth, wallHeight/2+1)
    .translate(-1, (shortLength-slotWidth)/2, -1));
const longPart = tray.part('long-divider', wood(longDivider.translate(thickness+endClearance, (depth-thickness)/2, thickness)));
const shortPart = tray.part('short-divider', wood(shortDivider.translate((width-thickness)/2, thickness+endClearance, thickness)));
// Frame datums lie on actual bottom contact faces. Shapes already use the
// assembly coordinate frame; mates add static assembly intent, no new placement.
const attach = (part, name, contact) => {
  const datum = { type: 'frame', origin: { kind: 'vec3', value: contact }, normal: [0, 0, 1] };
  base.connector(name, datum);
  part.connector('base-seat', datum);
  tray.mate(`base-${name}`, `base.${name}`, `${name}.base-seat`, 'fastened');
};
attach(front, 'front', [width/2, thickness/2, thickness]);
attach(back, 'back', [width/2, depth-thickness/2, thickness]);
attach(left, 'left', [thickness/2, depth/2, thickness]);
attach(right, 'right', [width-thickness/2, depth/2, thickness]);
attach(longPart, 'long-divider', [thickness+endClearance+longLength/4, depth/2, thickness]);
attach(shortPart, 'short-divider', [width/2, thickness+endClearance+shortLength/4, thickness]);
// Fastened divider mates hold the reviewed static pose; they do not imply glue.
return tray.model();
