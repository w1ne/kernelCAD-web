// SPDX-License-Identifier: CC0-1.0
// Ticket vending kiosk: the self-service machine at the park gate where
// guests buy admission and print tickets without queueing at a window.
// What makes it a ticket machine rather than a cabinet: the slim shaped
// pedestal leans its touch screen forward toward the user under a curved
// weather hood, with a payment shelf at wheelchair-reach height carrying
// the card reader and PIN pad, a lit ticket dispense pocket below it, a
// banknote slot and a receipt slot, and branding stripes on both flanks.
// Generic visualization geometry at about real size (about 0.7 m wide,
// 0.7 m deep, 1.85 m tall), millimetres, Z up, screen toward -Y, standing
// on z = 0.
meta({
  name: "ticket-vending-kiosk",
  license: "CC0-1.0",
  title: "Ticket vending kiosk",
  description: "Self-service park ticket machine at about real size: shaped powder-coated pedestal with forward-leaning touch screen in a bezel, curved weather hood, payment shelf at accessible reach with card reader and PIN pad, lit ticket dispense pocket, banknote and receipt slots, speaker grille, flank branding stripes and a stainless plinth. Material controls: powder-coated body, stainless trim and plinth, screen glass, brand accent and lit bezels. Festival, twilight and night-mode presets.",
  tags: ["ticket machine", "ticket vending machine", "self-service kiosk", "TVM", "kiosk", "admission", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1300,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated body and hood" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless trim, keypad and plinth" });
const glass = param("glass", "#1f3c52", { label: "Touch-screen glass" });
const accent = param("accent", "#f2b632", { label: "Brand stripe and lit bezels" });

presets({
  festival: { powderCoat: "#d47452", stainlessSteel: "#d1d1c6", glass: "#2c5d7a", accent: "#ffe07a" },
  twilight: { powderCoat: "#35576f", stainlessSteel: "#788b91", glass: "#6387aa", accent: "#c79bf2" },
  nightMode: { powderCoat: "#22272e", stainlessSteel: "#5d676b", glass: "#3fa3d8", accent: "#56e0c8" },
});

const p = assembly("ticket-vending-kiosk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);

const W = 640;
// Body side profile: slim pedestal, payment shelf lip, forward-leaning screen face.
add("body", longSide(filletPolygon([
  [-190, 90], [-190, 930], [-320, 990], [-320, 1030], [-210, 1070],
  [-270, 1660], [240, 1700], [240, 90],
], 30, { segments: 3 }), W).color(powderCoat));
add("plinth", extrudePolygon(filletPolygon([[-380, -300], [380, -300], [380, 330], [-380, 330]], 80, { segments: 4 }), 90).color(stainlessSteel));
add("plinth-kick", extrudePolygon(filletPolygon([[-340, -260], [340, -260], [340, 290], [-340, 290]], 60, { segments: 4 }), 20).translate(0, 0, 90).color(powderCoat));

// Curved weather hood, deepest over the screen, with its lit front edge.
const hood = [];
for (let i = 0; i <= 8; i++) {
  const a = (Math.PI / 2) * (i / 8);
  hood.push([260 - 680 * Math.sin(a), 1690 + 170 * Math.cos(a) - 40]);
}
for (let i = 8; i >= 0; i--) {
  const a = (Math.PI / 2) * (i / 8);
  hood.push([260 - 640 * Math.sin(a), 1690 + 130 * Math.cos(a) - 40]);
}
add("weather-hood", longSide(hood, W + 80).color(powderCoat));
add("hood-light", box(W + 60, 30, 26, true).translate(0, -395, 1660).color(accent));

// Forward-leaning touch screen in a stainless bezel (face leans about 6 deg).
const onScreenFace = (s: Shape, z: number) => s.rotateX(5.8).translate(0, -210 - (z - 1070) * 0.1017, z);
add("screen-bezel", onScreenFace(box(540, 16, 470, true), 1380).translate(0, -8, 0).color(stainlessSteel));
add("screen-glass", onScreenFace(box(480, 10, 400, true), 1385).translate(0, -18, 0).color(glass));
add("camera-dot", onScreenFace(cylinder(10, 12, 8).rotateX(90), 1600).translate(0, -10, 0).color(glass));

// Payment shelf: card reader and angled PIN pad, at accessible reach.
add("shelf-edge", box(W, 40, 40, true).translate(0, -320, 1010).color(stainlessSteel));
add("card-reader", box(130, 150, 70, true).rotateX(-20).translate(160, -255, 1085).color(glass));
add("card-reader-lamp", box(90, 10, 20, true).rotateX(-20).translate(160, -330, 1080).color(accent));
add("pin-pad", box(170, 150, 30, true).rotateX(-20).translate(-150, -255, 1060).color(stainlessSteel));
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 3; c++) {
    add(`pin-key-${r}-${c}`, box(36, 26, 14, true).rotateX(-20).translate(-200 + c * 50, -300 + r * 30, 1068 + r * 11).color(glass));
  }
}

// Ticket dispense pocket, banknote slot, receipt slot and speaker grille.
add("pocket-bezel", front(filletPolygon([[-190, 640], [190, 640], [190, 800], [-190, 800]], 30, { segments: 3 }), 20, -210).color(accent));
add("pocket-recess", front([[-160, 660], [160, 660], [160, 780], [-160, 780]], 12, -222).color(glass));
add("pocket-flap", box(300, 14, 50, true).rotateX(30).translate(0, -230, 690).color(stainlessSteel));
add("note-slot", box(200, 20, 46, true).translate(-140, -200, 880).color(stainlessSteel));
add("note-slot-mouth", box(160, 10, 10, true).translate(-140, -212, 880).color(glass));
add("receipt-slot", box(150, 20, 36, true).translate(160, -200, 880).color(stainlessSteel));
for (let i = 0; i < 3; i++) {
  add(`speaker-hole-${i}`, cylinder(10, 12, 8).rotateX(90).translate(-30 + i * 30, -197, 520).color(glass));
}

// Branding stripes and service-door seams on both flanks.
for (const sx of [-1, 1]) {
  const side = sx > 0 ? "r" : "l";
  add(`brand-stripe-${side}`, longSide([[-150, 200], [-60, 200], [140, 1560], [50, 1560]], 10).translate(sx * (W / 2 + 5), 0, 0).color(accent));
  add(`service-seam-${side}`, longSide([[80, 140], [200, 140], [200, 900], [80, 900]], 6).translate(sx * (W / 2 + 3), 0, 0).color(stainlessSteel));
  add(`service-lock-${side}`, cylinder(8, 18, 8).rotateY(90 * sx).translate(sx * (W / 2 + 4), 160, 820).color(glass));
}

return p.model();
