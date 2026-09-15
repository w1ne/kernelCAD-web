// Wood joinery: dado, rabbet, and mortise-and-tenon with a fit-clearance param,
// as a receiving-board + mating-board assembly. Clearance widens the receiving cuts.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/cookbook-parity/wood-joinery-dado-rabbet-mortise.kcad.ts
//
// Expected console output:
//   Features: 13
//   OK

const fit = param('fitClearance', 0.2, { min: 0, max: 0.8 });
const stockX = 120;
const stockY = 40;
const stockZ = 18;

let receiving = box(stockX, stockY, stockZ);

// Dado: groove across Y on the top face. Clearance widens the groove.
const dado = box(fit.multiply(2).add(18), stockY, 6)
  .translate(fit.negate().add(40), 0, stockZ - 6);
receiving = receiving.subtract(dado);

// Rabbet: L-notch along the bottom front edge. Clearance deepens the rebate.
const rabbet = box(stockX, 8, fit.add(10))
  .translate(0, 0, -1);
receiving = receiving.subtract(rabbet);

// Mortise: pocket from the top. Clearance widens the mortise; tenon stays 8×20×12.
const mortise = box(8, fit.multiply(2).add(20), 13)
  .translate(90, fit.negate().add(10), stockZ - 12);
receiving = receiving.subtract(mortise);

const tenon = box(12, 20, 8);
const mating = box(80, stockY, stockZ).union(tenon.translate(-12, 10, 5));

const arm = assembly('wood-joinery');
arm.part('receiving-board', receiving);
arm.part('mating-board', mating, { at: [140, 0, 0] });
return arm.model();
