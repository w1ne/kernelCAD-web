// SPDX-License-Identifier: MIT
// Hobby servo catalog entries (MG995 / MG996R, MG90S), modelled from the
// manufacturer's published size drawing. NOT manufacturer CAD models.
//
// Source of every dimension: Tower Pro "PRODUCT CONFIGURE TABLE", letters A-F
// on the manufacturer's size drawing
//   https://towerpro.com.tw/product/mg996r/   (A 42.7, B 40.9, C 37, D 20, E 54, F 26.8)
//   https://towerpro.com.tw/product/mg90s/    (A 32.5, B 22.8, C 28.4, D 12.4, E 32.1, F 18.5)
// Drawing: http://torqpro.com/wp-content/uploads/2014/07/小馬達尺寸標示圖B.jpg
//   A  overall height, case bottom to shaft tip
//   B  case length (without ears)
//   C  height to the top of the gear cover
//   D  case width
//   E  length over both ears
//   F  height of the ear underside above the case bottom
// The MG995 and MG996R pages carry the identical table, so one record covers both.
//
// Shaft position along the case is not dimensioned. It is scaled from a
// drawing (+-0.5 mm): MG995/MG996R from the Tower Pro size drawing (10.1-10.2 mm
// from the case end, drawn to scale there); MG90S from the drawing printed in the
// MG90S datasheet at components101.com (5.8 mm). That drawing's own dimensions
// (22.5, 32.5, 12) differ slightly from the Tower Pro table; the table wins.
//
// Left out because no trustworthy dimension was found: ear thickness, ear hole
// centres/diameters/slots, output boss and spline diameters and tooth count,
// horns (all variants), shaft-screw, wire exit, the stepped shape of the gear cover.
import { OcctBackend, initOcct } from '../src/kernel/backends/occt/occtBackend';
import type { SeedFamily } from './generateSeedCatalog';
import type { ConnectorEntry } from '../src/shared/parts/connectorManifest';
import type { PartRecord } from '../src/shared/parts/types';


export interface ServoDrawing {
  A: number; B: number; C: number; D: number; E: number; F: number;
}

export interface ServoPart {
  family: 'standard-servo' | 'mini-servo';
  id: 'mg995-servo' | 'mg90s-servo';
  drawing: ServoDrawing;
  /** Distance from the output shaft axis to the case end on the +Y side. */
  shaftToCaseEnd: number;
  connectors: ConnectorEntry[];
  record: Omit<PartRecord, 'sha256' | 'source'>;
}

const NOT_MODELLED =
  'ear thickness, ear holes (centres, diameters, slots), output boss and spline (diameter, tooth count), horns (all variants), horn and shaft screws, wire exit, stepped gear-cover shape';

function build(args: {
  family: ServoPart['family'];
  id: ServoPart['id'];
  name: string;
  tags: string[];
  aliases?: string[];
  drawing: ServoDrawing;
  shaftToCaseEnd: number;
  sourceUrl: string;
  shaftBasis: string;
  extra: Record<string, number | string>;
}): ServoPart {
  const { A, B, C, D, E, F } = args.drawing;
  const s = args.shaftToCaseEnd;
  const earHigh = s + (E - B) / 4;
  const earLow = -(B - s) - (E - B) / 4;
  const connectors: ConnectorEntry[] = [
    { name: 'shaft-output', type: 'axis', origin: [0, 0, A], axis: [0, 0, 1] },
    // Ear-face datum planes (underside of each ear), at mid-span of the ear.
    // These are plane datums for bracket mating, not hole centres.
    { name: 'ear-face-high', type: 'frame', origin: [0, earHigh, F], normal: [0, 0, -1] },
    { name: 'ear-face-low', type: 'frame', origin: [0, earLow, F], normal: [0, 0, -1] },
    { name: 'case-bottom', type: 'frame', origin: [0, 0, 0], normal: [0, 0, -1] },
  ];
  return {
    family: args.family,
    id: args.id,
    drawing: args.drawing,
    shaftToCaseEnd: s,
    connectors,
    record: {
      id: args.id,
      name: args.name,
      category: 'motor',
      family: args.family,
      tags: args.tags,
      attributes: {
        provenance: 'modelled from datasheet drawing, not a manufacturer model',
        dimensionSource: args.sourceUrl,
        dimensionDrawing: 'http://torqpro.com/wp-content/uploads/2014/07/小馬達尺寸標示圖B.jpg',
        drawingHeightToShaftTipMm_A: A,
        drawingBodyLengthMm_B: B,
        drawingHeightToCoverTopMm_C: C,
        drawingWidthMm_D: D,
        drawingLengthOverEarsMm_E: E,
        drawingEarUndersideHeightMm_F: F,
        shaftToCaseEndMm: s,
        shaftOffsetBasis: args.shaftBasis,
        geometry: 'envelope: case box B x D x C; output axis and ear-face planes are connectors only',
        notModelled: NOT_MODELLED,
        ...args.extra,
      },
      connectors: connectors.map((c) => c.name),
      license: 'MIT',
      licenseClass: 'permissive',
      attribution:
        'Dimensions from the Tower Pro published product table and size drawing (towerpro.com.tw); geometry authored by kernelCAD contributors. Not a manufacturer model.',
      ...(args.aliases !== undefined ? { aliases: args.aliases } : {}),
    },
  };
}

export const SERVO_PARTS: ServoPart[] = [
  build({
    family: 'standard-servo',
    id: 'mg995-servo',
    name: 'MG995 / MG996R standard servo (datasheet envelope)',
    tags: ['mg995', 'mg996r', 'servo', 'motor', 'standard-servo', 'pwm', 'actuator', 'datasheet-modelled'],
    aliases: ['mg996r-servo'],
    drawing: { A: 42.7, B: 40.9, C: 37, D: 20, E: 54, F: 26.8 },
    shaftToCaseEnd: 10,
    sourceUrl: 'https://towerpro.com.tw/product/mg996r/',
    shaftBasis:
      'scaled from drawing (Tower Pro size drawing, 10.1-10.2 mm from case end, +-0.5 mm); not dimensioned in the table',
    extra: {
      sharedCase: 'MG995 and MG996R: identical Tower Pro table (A-F), one record',
      dimensionCrossCheck:
        'Handson MG996R drawing shows 40.3 case, 53.6 over ears, 20 wide, 26.6 ear underside; differs by <=0.6 mm, Tower Pro table used',
    },
  }),
  build({
    family: 'mini-servo',
    id: 'mg90s-servo',
    name: 'MG90S mini servo (datasheet envelope)',
    tags: ['mg90s', 'servo', 'motor', 'mini-servo', 'pwm', 'actuator', 'datasheet-modelled'],
    drawing: { A: 32.5, B: 22.8, C: 28.4, D: 12.4, E: 32.1, F: 18.5 },
    shaftToCaseEnd: 5.8,
    sourceUrl: 'https://towerpro.com.tw/product/mg90s/',
    shaftBasis:
      'scaled from drawing (drawing in the MG90S datasheet, components101.com, 5.8 mm from case end, +-0.5 mm); not dimensioned in the Tower Pro table',
    extra: {
      dimensionCrossCheck:
        'MG90S datasheet drawing shows 22.5 case, 32.5 over ears, 12 wide; differs by <=0.4 mm, Tower Pro table used',
    },
  }),
];

async function servoStep(part: ServoPart): Promise<Uint8Array> {
  await initOcct();
  const { B, C, D } = part.drawing;
  const s = part.shaftToCaseEnd;
  // Case spans y in [-(B - s), s]; centre = s - B/2.
  const body = OcctBackend.extrudeRect(D, B, C).translate(0, s - B / 2, 0);
  return body.exportSTEPAsync();
}

export function servoFamilies(): SeedFamily[] {
  return SERVO_PARTS.map((part): SeedFamily => ({
    id: part.family,
    category: part.record.category,
    variants: [{}],
    async generate() {
      return { stepBytes: await servoStep(part), connectors: part.connectors, record: part.record };
    },
  }));
}
