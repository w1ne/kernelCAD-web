// A numeric parameter with one legal set and one string set.
// Requesting `bad` must fail before a solid is built.
const length = param('length', 10, { min: 5, max: 40, unit: 'mm' });
configurations({
  ok: { length: 12 },
  bad: { length: 'wide' },
});
return box(length, 8, 4);
