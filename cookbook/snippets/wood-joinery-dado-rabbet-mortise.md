---
id: wood-joinery-dado-rabbet-mortise
title: Wood dado, rabbet, and mortise-and-tenon with fit clearance
tags: [joinery, dado, rabbet, mortise, tenon, wood, subtract, assembly, parameter]
keywords:
  - dado groove across the grain
  - rabbet rebate along an edge
  - mortise and tenon
  - woodworking fit clearance on the receiving cuts
  - lumber assembly of a receiving board and a mating board
when_to_use: >-
  You are cutting a dado groove, a rabbet rebate, and a mortise-and-tenon
  in lumber, with a named fit-clearance param widening the receiving cuts
  (groove, rebate, mortise) while the male tenon stays nominal.
---

```typescript
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
```
