const majorRadius = 20;
const tubeRadius = 5;
const diagonal = Math.SQRT1_2;
const section = path()
  .moveTo(majorRadius + tubeRadius, 0)
  .threePointsArc(majorRadius, tubeRadius, majorRadius + tubeRadius * diagonal, tubeRadius * diagonal)
  .threePointsArc(majorRadius - tubeRadius, 0, majorRadius - tubeRadius * diagonal, tubeRadius * diagonal)
  .threePointsArc(majorRadius, -tubeRadius, majorRadius - tubeRadius * diagonal, -tubeRadius * diagonal)
  .threePointsArc(majorRadius + tubeRadius, 0, majorRadius + tubeRadius * diagonal, -tubeRadius * diagonal)
  .close();
return section.revolve();
