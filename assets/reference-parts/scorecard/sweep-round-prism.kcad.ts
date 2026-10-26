const radius = 5;
const diagonal = Math.SQRT1_2;
const profile = path()
  .moveTo(radius, 0)
  .threePointsArc(0, radius, radius * diagonal, radius * diagonal)
  .threePointsArc(-radius, 0, -radius * diagonal, radius * diagonal)
  .threePointsArc(0, -radius, -radius * diagonal, -radius * diagonal)
  .threePointsArc(radius, 0, radius * diagonal, -radius * diagonal)
  .close();
return profile.sweep([[0, 0, 0], [0, 0, 20]]);
