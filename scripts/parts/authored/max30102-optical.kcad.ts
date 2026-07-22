// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/max30102-optical.kcad.ts
//
// Analog Devices MAX30102, 14-pin reflective optical biosensor module.
// Nominal external package: 5.6 × 3.3 × 1.55 mm with integrated cover glass.
// Dimensions: https://www.analog.com/media/en/technical-documentation/data-sheets/max30102.pdf
//
// The reusable module model carries its 14 underside contacts, cover glass and
// visible optical apertures. Aperture geometry is representational; no
// unverified internal die layout is claimed.

const PACKAGE_LENGTH = 5.6;
const PACKAGE_WIDTH = 3.3;
const PACKAGE_HEIGHT = 1.55;
const CONTACT_HEIGHT = 0.07;
// The OESIP solder contacts occupy the bottom 0.07 mm. Keep the molded body
// above them rather than embedding the terminals in the opaque package solid.
const MOLD_HEIGHT = 0.98;
const GLASS_HEIGHT = PACKAGE_HEIGHT - CONTACT_HEIGHT - MOLD_HEIGHT;
const CONTACTS_PER_SIDE = 7;
// MAX30102's 14-lead OESIP package uses a 0.8 mm pin pitch. Centre the
// seven contacts on each long edge so the two outside pads are symmetric.
const CONTACT_PITCH = 0.8;
const FIRST_CONTACT_X =
  (PACKAGE_LENGTH - (CONTACTS_PER_SIDE - 1) * CONTACT_PITCH) / 2;

const CASE_BLACK = '#171a21';
const CONTACT_GOLD = '#c8a13c';
const COVER_GLASS = '#29475f';
const RED_LED = '#c93f3f';
const IR_LED = '#9c4d9c';
const PHOTODIODE = '#222a3d';
const MARKER_YELLOW = '#f2d35a';

const caseBody = box(PACKAGE_LENGTH, PACKAGE_WIDTH, MOLD_HEIGHT)
  .translate(0, 0, CONTACT_HEIGHT)
  .color(CASE_BLACK);
const glassBaseZ = CONTACT_HEIGHT + MOLD_HEIGHT;
const redLedWindow = cylinder(0.04, 0.32, 20).translate(1.75, 1.65, PACKAGE_HEIGHT - 0.04).color(RED_LED);
const irLedWindow = cylinder(0.04, 0.32, 20).translate(2.8, 1.65, PACKAGE_HEIGHT - 0.04).color(IR_LED);
const photodiodeWindow = cylinder(0.04, 0.42, 20).translate(3.95, 1.65, PACKAGE_HEIGHT - 0.04).color(PHOTODIODE);
// Recess each colored optical element into a matching pocket. The window
// solids then meet the cover glass at a real interface instead of occupying
// the same volume — vital for a component model that can be assembled and
// interference-checked.
const coverGlass = box(4.2, 2.5, GLASS_HEIGHT)
  .translate(0.7, 0.4, glassBaseZ)
  .subtract(redLedWindow)
  .subtract(irLedWindow)
  .subtract(photodiodeWindow)
  .color(COVER_GLASS);
const pinOneMarker = cylinder(0.05, 0.11, 16)
  .translate(0.35, 0.35, PACKAGE_HEIGHT - 0.05)
  .color(MARKER_YELLOW);

const asm = assembly('max30102-optical');
asm.part('package-body', caseBody);
asm.part('cover-glass', coverGlass);
asm.part('red-led-window', redLedWindow);
asm.part('ir-led-window', irLedWindow);
asm.part('photodiode-window', photodiodeWindow);
asm.part('pin-1-marker', pinOneMarker);

for (let index = 0; index < CONTACTS_PER_SIDE; index++) {
  const centerX = FIRST_CONTACT_X + index * CONTACT_PITCH;
  const suffix = String(index + 1).padStart(2, '0');
  asm.part(
    `contact-bottom-${suffix}`,
    box(0.28, 0.22, CONTACT_HEIGHT)
      .translate(centerX - 0.14, 0, 0)
      .color(CONTACT_GOLD),
  );
  asm.part(
    `contact-top-${suffix}`,
    box(0.28, 0.22, CONTACT_HEIGHT)
      .translate(centerX - 0.14, PACKAGE_WIDTH - 0.22, 0)
      .color(CONTACT_GOLD),
  );
}

return asm.model();
