// Imported Juan Fenoy SG90 references, CC-BY-SA-4.0.
// These are community geometry; supplier compatibility and spline fit unverified.
// Display the body and horn separately so the mounting holes remain visible.
const body = await lib.standard.sg90();
const horn = await lib.standard.sg90HornSingleArm();
const reference = assembly('SG90 community references');
reference.part('sg90-servo', body.color('#2459c4'));
reference.part('single-arm-horn', horn.color('#eeeeee'), { at: [25, 0, 0] });
return reference.model();
