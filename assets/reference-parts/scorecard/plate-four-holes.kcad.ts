return box(80, 50, 10).holes('top', {
  positions: [
    { u: -25, v: -15 },
    { u: 25, v: -15 },
    { u: -25, v: 15 },
    { u: 25, v: 15 },
  ],
  diameter: 6,
  depth: 'through',
});
