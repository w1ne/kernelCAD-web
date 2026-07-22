// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/nrf54l15-qfn48.kcad.ts
//
// Nordic Semiconductor nRF54L15 QFN48 (QFAA).
// Nominal external package: 6.0 × 6.0 × 0.85 mm, 48 contacts at 0.4 mm pitch.
// Dimensions: https://docs.nordicsemi.com/r/bundle/ps_nrf54l15/page/chapters/mec_spec.html-qfn48_package
//
// This is the soldered SoC package, deliberately not a board-specific module
// or PCB. The 48 exposed contacts, centre pad, and top-side pin-one dot retain
// useful orientation and placement information when the catalog part is used
// in any assembly.

const PACKAGE_SIDE = 6.0;
const PACKAGE_HEIGHT = 0.85;
const BODY_SIDE = 5.9;
const BODY_HEIGHT = 0.79;
const CONTACTS_PER_SIDE = 12;
const PIN_PITCH = 0.4;
// Twelve 0.4 mm-pitch terminals span 4.4 mm. Centre that span in the 6 mm
// package rather than biasing every terminal toward the pin-one edge.
const FIRST_CONTACT_CENTER =
  (PACKAGE_SIDE - (CONTACTS_PER_SIDE - 1) * PIN_PITCH) / 2;
const CONTACT_WIDTH = 0.2;
// QFAA nominal terminal length L (the package drawing specifies 0.40 mm).
const CONTACT_LENGTH = 0.4;
const CONTACT_HEIGHT = 0.06;

const MOLD_BLACK = '#1d2028';
const CONTACT_GOLD = '#c8a13c';
const MARKER_YELLOW = '#f2d35a';

const body = box(BODY_SIDE, BODY_SIDE, BODY_HEIGHT)
  .translate((PACKAGE_SIDE - BODY_SIDE) / 2, (PACKAGE_SIDE - BODY_SIDE) / 2, CONTACT_HEIGHT)
  .color(MOLD_BLACK);
const exposedPad = box(4.6, 4.6, CONTACT_HEIGHT).translate(0.7, 0.7, 0).color(CONTACT_GOLD);
const pinOneMarker = cylinder(0.07, 0.18, 20)
  .translate(0.65, 0.65, PACKAGE_HEIGHT - 0.07)
  .color(MARKER_YELLOW);

const asm = assembly('nrf54l15-qfn48');
asm.part('package-body', body);
asm.part('exposed-pad', exposedPad);
asm.part('pin-1-marker', pinOneMarker);

for (let index = 0; index < CONTACTS_PER_SIDE; index++) {
  const center = FIRST_CONTACT_CENTER + index * PIN_PITCH;
  const suffix = String(index + 1).padStart(2, '0');
  asm.part(
    `contact-left-${suffix}`,
    box(CONTACT_WIDTH, CONTACT_LENGTH, CONTACT_HEIGHT)
      .translate(0, center - CONTACT_LENGTH / 2, 0)
      .color(CONTACT_GOLD),
  );
  asm.part(
    `contact-right-${suffix}`,
    box(CONTACT_WIDTH, CONTACT_LENGTH, CONTACT_HEIGHT)
      .translate(PACKAGE_SIDE - CONTACT_WIDTH, center - CONTACT_LENGTH / 2, 0)
      .color(CONTACT_GOLD),
  );
  asm.part(
    `contact-bottom-${suffix}`,
    box(CONTACT_LENGTH, CONTACT_WIDTH, CONTACT_HEIGHT)
      .translate(center - CONTACT_LENGTH / 2, 0, 0)
      .color(CONTACT_GOLD),
  );
  asm.part(
    `contact-top-${suffix}`,
    box(CONTACT_LENGTH, CONTACT_WIDTH, CONTACT_HEIGHT)
      .translate(center - CONTACT_LENGTH / 2, PACKAGE_SIDE - CONTACT_WIDTH, 0)
      .color(CONTACT_GOLD),
  );
}

return asm.model();
