function circularSection(radius: number) {
  const diagonal = Math.SQRT1_2;
  return path()
    .moveTo(radius, 0)
    .threePointsArc(0, radius, radius * diagonal, radius * diagonal)
    .threePointsArc(-radius, 0, -radius * diagonal, radius * diagonal)
    .threePointsArc(0, -radius, -radius * diagonal, -radius * diagonal)
    .threePointsArc(radius, 0, radius * diagonal, -radius * diagonal)
    .close();
}

const bottom = circularSection(10);
const top = circularSection(5);
return bottom.loft(top, { spacing: 20 });
