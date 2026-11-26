// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Local native SolidWorks import demonstration; the source part is a NIST fixture.

const imported = await lib.fromNativeCAD(
  '../../../tests/fixtures/native-cad-import/nist_ftc_06_asme1_rd_sw1802.SLDPRT',
);
return imported.color('#4f86b7');
