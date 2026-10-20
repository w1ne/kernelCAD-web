return cylinder(8, 3)
  .translate(4, 5, 0)
  .patternGrid({
    x: { count: 3, direction: [1, 0, 0], spacing: 10 },
    y: { count: 2, direction: [0, 1, 0], spacing: 10 },
  });
