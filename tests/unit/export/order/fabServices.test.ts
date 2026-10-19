// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { FAB_SERVICES, servicesForProcess } from '../../../../src/kernel/export/order/fabServices';

describe('fabServices', () => {
  it('filters services by process', () => {
    expect(servicesForProcess('cnc').map((s) => s.service)).toEqual([
      'JLCCNC (JLCPCB CNC machining)', 'PCBWay CNC / sheet metal', 'Xometry',
    ]);
    expect(servicesForProcess('sheet-cut').map((s) => s.service)).toEqual([
      'PCBWay CNC / sheet metal', 'Xometry', 'SendCutSend',
    ]);
    expect(servicesForProcess('3d-print').map((s) => s.service)).toEqual([
      'JLC3DP (JLCPCB 3D printing)', 'PCBWay 3D printing', 'Xometry', 'Craftcloud',
    ]);
  });
  it('keeps every service URL absolute https', () => {
    for (const s of FAB_SERVICES) expect(s.url.startsWith('https://')).toBe(true);
  });
});
