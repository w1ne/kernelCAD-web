// Turned shoulder spacer, mm. The default 8.5 mm through bore clears an 8 mm
// bolt; the 30 mm flange is 3 mm thick; the body is 20 mm diameter and 25 mm long.
// Check required bore fit, bearing face finish and edge breaks with the shop.
const length = param('length', 25, { min: 8, max: 60 });
const bodyDiameter = param('bodyDiameter', 20, { min: 16, max: 26 });
const flangeDiameter = param('flangeDiameter', 30, { min: 28, max: 40 });
const boreDiameter = param('boreDiameter', 8.5, { min: 6, max: 12 });
const flangeThickness = param('flangeThickness', 3, { min: 2, max: 5 });
const flangeRadius = flangeDiameter.divide(2);
const bodyRadius = bodyDiameter.divide(2);
const boreRadius = boreDiameter.divide(2);
return path()
  .moveTo(boreRadius, 0).lineTo(flangeRadius, 0).lineTo(flangeRadius, flangeThickness)
  .lineTo(bodyRadius, flangeThickness).lineTo(bodyRadius, length).lineTo(boreRadius, length)
  .close().revolve();
