// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/order/fabServices.ts
//
// Pure fabrication-service table shared by the MCP `fab_pack` tool and the
// order pack: the shop list plus the process -> shop mapping. No node:fs or
// node:path here, so browser-side code can import it too.

import type { FabPackFormat, FabProcess } from '../../../shared/fab';

export interface FabService {
  service: string;
  processes: FabProcess[];
  /** Public instant-quote / upload page (no API; the user uploads by hand). */
  url: string;
  /** File formats the service accepts, in our pack's terms, preferred first. */
  accepts: FabPackFormat[];
}

interface FabServiceEntry extends Omit<FabService, 'url'> {
  /** Quote page as host + path. Outbound URLs are only ever built through
   *  buildVendorLink (referral.ts), the single vendor-URL emitter. */
  host: string;
  path: string;
}

/** Public quote pages, checked reachable 2026-10-13. Plain web pages only. */
const FAB_SERVICE_ENTRIES: readonly FabServiceEntry[] = [
  { service: 'JLC3DP (JLCPCB 3D printing)', processes: ['3d-print'], host: 'jlc3dp.com', path: '/3d-printing-quote', accepts: ['stl', 'step', '3mf'] },
  { service: 'JLCCNC (JLCPCB CNC machining)', processes: ['cnc'], host: 'jlccnc.com', path: '/cnc-machining-quote', accepts: ['step'] },
  { service: 'PCBWay 3D printing', processes: ['3d-print'], host: 'www.pcbway.com', path: '/rapid-prototyping/3D-Printing/', accepts: ['stl', 'step'] },
  { service: 'PCBWay CNC / sheet metal', processes: ['cnc', 'sheet-cut'], host: 'www.pcbway.com', path: '/rapid-prototyping/manufacture/', accepts: ['step', 'dxf', 'pdf-drawing'] },
  { service: 'Xometry', processes: ['cnc', '3d-print', 'sheet-cut'], host: 'www.xometry.com', path: '/quoting/home/', accepts: ['step', 'stl', 'dxf', 'pdf-drawing'] },
  { service: 'SendCutSend', processes: ['sheet-cut'], host: 'app.sendcutsend.com', path: '/', accepts: ['dxf', 'step'] },
  { service: 'Craftcloud', processes: ['3d-print'], host: 'craftcloud3d.com', path: '/', accepts: ['stl', '3mf'] },
];

/** The quote-service table with clean (untagged) https URLs. */
export const FAB_SERVICES: readonly FabService[] = FAB_SERVICE_ENTRIES.map(({ host, path, ...rest }) => ({
  ...rest,
  url: new URL(path, `https://${host}`).toString(),
}));

/** The services that accept the given process, in table order. */
export function servicesForProcess(process: FabProcess): readonly FabService[] {
  return FAB_SERVICES.filter((s) => s.processes.includes(process));
}
