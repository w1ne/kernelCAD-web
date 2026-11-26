// Stepped shaft revolved about the sketch X axis (through y = 0).
// The profile is a half-section, so every point is on one side of the axis.
return path()
  .moveTo(0, 0)
  .lineTo(0, 30)
  .lineTo(20, 30)
  .lineTo(20, 20)
  .lineTo(60, 20)
  .lineTo(60, 10)
  .lineTo(100, 10)
  .lineTo(100, 0)
  .close()
  .revolve({
    axis: { through: [0, 0], direction: [1, 0] },
  });
