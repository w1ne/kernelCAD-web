// Two configurations of one box whose mount connector type differs.
// An assembly may not instance both: the mate interface would not agree.
const style = param('style', 'frame', { choices: ['frame', 'axis'] });
configurations({
  plate: { style: 'frame' },
  pin: { style: 'axis' },
});
const body = box(10, 10, 4);
if (style.value === 'axis') {
  return definePart({
    shape: body,
    connectors: {
      mount: { type: 'axis', origin: { kind: 'vec3', value: [5, 5, 4] }, axis: [0, 0, 1] },
    },
  });
}
return definePart({
  shape: body,
  connectors: {
    mount: { type: 'frame', origin: { kind: 'vec3', value: [5, 5, 0] }, normal: [0, 0, 1] },
  },
});
