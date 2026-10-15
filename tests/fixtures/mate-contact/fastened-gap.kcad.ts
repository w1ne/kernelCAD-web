// Fastened-mate contact fixture: a 5 x 5 x 2 mm nut fastened to a 3 mm lid,
// seated 2.5 mm ABOVE the lid top (the parts do not touch; must fail).
const asm = assembly('mate-contact-gap');
const lid = asm.part('lid', box(40, 40, 3, true));
const nut = asm.part('ear-nut', box(5, 5, 2, true));
lid.connector('nut-seat', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 4] } });
nut.connector('base', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -1] } });
asm.mate('nut-on-lid', 'lid.nut-seat', 'ear-nut.base', 'fastened');
return asm.solvedModel({});
