// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Read STEP assemblies through the pinned OCCT XCAF reader. No mesh or
// secondary interchange conversion is used: definitions leave this module as
// OCCT's own native BREP serialization, while placements/names/colors are
// plain serializable values.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createHash, randomUUID } from 'node:crypto';
import { getOcctRuntime, initOcct } from '../backends/occt/occtBackend';
import { Transform } from '../../shared/runtime/se3';
import {
  StepAssemblyImportError,
  type StepAssemblySnapshot,
  type StepComponentColor,
  type StepImportDefinition,
  type StepImportOccurrence,
  type StepMatrix4,
} from './stepAssemblyTypes';

interface Deletable { delete(): void }
type Track = <T extends Deletable>(value: T) => T;
type Vec3 = [number, number, number];

interface XcafTraversalContext {
  oc: any;
  track: Track;
  colorTool: any;
  warnings: string[];
  definitionsByLabel: Map<string, StepImportDefinition>;
  occurrences: StepImportOccurrence[];
  occurrenceIndex: number;
}

interface XcafProductIdentity {
  isComponent: boolean;
  definitionLabel: any;
  definitionName?: string;
  chosenName: string;
  path: string[];
}

function withScope<T>(run: (track: Track) => T): T {
  const owned: Deletable[] = [];
  const track: Track = <V extends Deletable>(value: V): V => {
    owned.push(value);
    return value;
  };
  try {
    return run(track);
  } finally {
    for (let index = owned.length - 1; index >= 0; index--) owned[index].delete();
  }
}

const IDENTITY: StepMatrix4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

function parseSourceLengthUnits(stepText: string): string[] {
  const names = new Set<string>();
  const prefixNames: Record<string, string> = {
    EXA: 'exametre', PETA: 'petametre', TERA: 'terametre', GIGA: 'gigametre',
    MEGA: 'megametre', KILO: 'kilometre', HECTO: 'hectometre', DECA: 'decametre',
    DECI: 'decimetre', CENTI: 'centimetre', MILLI: 'millimetre', MICRO: 'micrometre',
    NANO: 'nanometre', PICO: 'picometre', FEMTO: 'femtometre', ATTO: 'attometre',
  };
  for (const match of stepText.matchAll(/\bSI_UNIT\s*\(\s*(?:\.([A-Z]+)\.)?\s*,\s*\.METRE\.\s*\)/gi)) {
    names.add(match[1] ? (prefixNames[match[1].toUpperCase()] ?? `${match[1].toLowerCase()}metre`) : 'metre');
  }
  for (const entity of stepText.matchAll(/#\d+\s*=\s*([^;]*);/g)) {
    const body = entity[1];
    if (!/\bLENGTH_UNIT\s*\(\s*\)/i.test(body)) continue;
    const conversion = body.match(/\bCONVERSION_BASED_UNIT\s*\(\s*'([^']+)'/i);
    if (conversion !== null) names.add(`conversion-based:${conversion[1].trim()}`);
  }
  return [...names].sort();
}

function labelKey(label: any): string {
  const tags: number[] = [];
  let cursor = label;
  let ownsCursor = false;
  try {
    while (!cursor.IsRoot()) {
      tags.push(cursor.Tag());
      const parent = cursor.Father();
      if (ownsCursor) cursor.delete();
      cursor = parent;
      ownsCursor = true;
    }
    tags.push(cursor.Tag());
    return tags.reverse().join(':');
  } finally {
    if (ownsCursor) cursor.delete();
  }
}

function readLabelName(oc: any, label: any): string | undefined {
  const value = oc.KernelCAD_XCAF.GetName(label);
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function readLabelColor(oc: any, colorTool: any, label: any): StepComponentColor | undefined {
  return withScope((track) => {
    const rgba = track(new oc.Quantity_ColorRGBA_1());
    const types = oc.XCAFDoc_ColorType;
    for (const kind of [types.XCAFDoc_ColorSurf, types.XCAFDoc_ColorGen, types.XCAFDoc_ColorCurv]) {
      if (!colorTool.GetColor_5(label, kind, rgba)) continue;
      return componentColor(rgba, track);
    }
    return undefined;
  });
}

function componentColor(rgba: any, track: Track): StepComponentColor {
  const rgb = track(rgba.GetRGB());
  const channel = (value: number): string => Math.max(0, Math.min(255, Math.round(value * 255)))
    .toString(16).padStart(2, '0');
  return {
    hex: `#${channel(rgb.Red())}${channel(rgb.Green())}${channel(rgb.Blue())}`,
    alpha: rgba.Alpha(),
  };
}

function readInstanceColor(oc: any, colorTool: any, label: any): StepComponentColor | undefined {
  return withScope((track) => {
    const shape = track(oc.XCAFDoc_ShapeTool.GetShape_2(label));
    if (shape.IsNull()) return undefined;
    const rgba = track(new oc.Quantity_ColorRGBA_1());
    const types = oc.XCAFDoc_ColorType;
    for (const kind of [types.XCAFDoc_ColorSurf, types.XCAFDoc_ColorGen, types.XCAFDoc_ColorCurv]) {
      if (!colorTool.GetInstanceColor_2(shape, kind, rgba)) continue;
      return componentColor(rgba, track);
    }
    return undefined;
  });
}

function children(oc: any, parent: any, visit: (child: any, tag: number) => void): void {
  const encodedTags = oc.KernelCAD_XCAF.GetChildTags(parent);
  if (typeof encodedTags !== 'string') {
    throw new StepAssemblyImportError('read', 'OCCT could not enumerate XCAF child labels.');
  }
  const tags = encodedTags === '' ? [] : encodedTags.split(',').map((value) => Number(value));
  for (const tag of tags) {
    if (!Number.isSafeInteger(tag) || tag < 1) {
      throw new StepAssemblyImportError('read', `OCCT returned an invalid XCAF child tag '${tag}'.`);
    }
    const found = parent.FindChild(tag, false);
    try {
      if (found.IsNull()) {
        throw new StepAssemblyImportError('read', `OCCT could not resolve XCAF child label ${tag}.`);
      }
      visit(found, tag);
    } finally {
      found.delete();
    }
  }
}

function matrixFromTrsf(trsf: any, path: string[]): StepMatrix4 {
  const m: StepMatrix4 = [
    trsf.Value(1, 1), trsf.Value(2, 1), trsf.Value(3, 1), 0,
    trsf.Value(1, 2), trsf.Value(2, 2), trsf.Value(3, 2), 0,
    trsf.Value(1, 3), trsf.Value(2, 3), trsf.Value(3, 3), 0,
    trsf.Value(1, 4), trsf.Value(2, 4), trsf.Value(3, 4), 1,
  ];
  if (!isRigid(m) || trsf.IsNegative() || Math.abs(trsf.ScaleFactor() - 1) > 1e-9) {
    throw new StepAssemblyImportError(
      'unsupported-transform',
      'STEP occurrence placement contains a reflection, scale, shear, or non-finite value; only rigid placements are supported.',
      path,
    );
  }
  return m;
}

function isRigid(m: StepMatrix4): boolean {
  if (!m.every(Number.isFinite)) return false;
  const rows = [
    [m[0], m[4], m[8]],
    [m[1], m[5], m[9]],
    [m[2], m[6], m[10]],
  ];
  const tol = 1e-7;
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      const dot = rows[a][0] * rows[b][0] + rows[a][1] * rows[b][1] + rows[a][2] * rows[b][2];
      if (Math.abs(dot - (a === b ? 1 : 0)) > tol) return false;
    }
  }
  const det =
    rows[0][0] * (rows[1][1] * rows[2][2] - rows[1][2] * rows[2][1])
    - rows[0][1] * (rows[1][0] * rows[2][2] - rows[1][2] * rows[2][0])
    + rows[0][2] * (rows[1][0] * rows[2][1] - rows[1][1] * rows[2][0]);
  return Math.abs(det - 1) <= tol;
}

function multiply(a: StepMatrix4, b: StepMatrix4): StepMatrix4 {
  const out = new Array<number>(16).fill(0) as StepMatrix4;
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
    }
  }
  return out;
}

function sourcePathText(path: string[]): string {
  return path.length > 0 ? path.join(' / ') : '(unnamed STEP component)';
}

function definitionStatistics(oc: any, shape: any, sourcePath: string[]): {
  solidCount: number;
  boundsMm: StepImportDefinition['boundsMm'];
  volumeMm3: number;
  brep: Uint8Array;
  brepVersion: string;
} {
  const analyzer = new oc.BRepCheck_Analyzer(shape, true, false);
  try {
    if (!analyzer.IsValid_2()) {
      throw new StepAssemblyImportError('invalid-solid', 'STEP component contains invalid or open BRep geometry.', sourcePath);
    }
  } finally {
    analyzer.delete();
  }

  let solidCount = 0;
  const solidType = oc.TopAbs_ShapeEnum.TopAbs_SOLID;
  if (shape.ShapeType() === solidType) solidCount = 1;
  const explorer = new oc.TopExp_Explorer_2(shape, solidType, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    while (explorer.More()) {
      const solid = explorer.Current();
      try {
        solidCount++;
      } finally {
        solid.delete();
      }
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  // TopExp_Explorer includes the root when it is itself a solid.
  if (shape.ShapeType() === solidType) solidCount--;
  if (solidCount < 1) {
    throw new StepAssemblyImportError('invalid-solid', 'STEP component has no closed 3D solid.', sourcePath);
  }
  const unsupportedTypes = [
    ['shell', oc.TopAbs_ShapeEnum.TopAbs_SHELL],
    ['face', oc.TopAbs_ShapeEnum.TopAbs_FACE],
    ['wire', oc.TopAbs_ShapeEnum.TopAbs_WIRE],
    ['edge', oc.TopAbs_ShapeEnum.TopAbs_EDGE],
    ['vertex', oc.TopAbs_ShapeEnum.TopAbs_VERTEX],
  ] as const;
  for (const [name, shapeType] of unsupportedTypes) {
    const looseShape = new oc.TopExp_Explorer_2(shape, shapeType, solidType);
    try {
      if (looseShape.More()) {
        throw new StepAssemblyImportError(
          'invalid-solid',
          `STEP component contains non-solid ${name} geometry outside its closed solids.`,
          sourcePath,
        );
      }
    } finally {
      looseShape.delete();
    }
  }

  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.AddOptimal(shape, box, false, true);
    if (box.IsVoid() || box.IsWhole()) {
      throw new StepAssemblyImportError('invalid-solid', 'OCCT could not compute finite component bounds.', sourcePath);
    }
    const min = box.CornerMin();
    const max = box.CornerMax();
    let boundsMm: StepImportDefinition['boundsMm'];
    try {
      boundsMm = {
        min: [min.X(), min.Y(), min.Z()],
        max: [max.X(), max.Y(), max.Z()],
      };
    } finally {
      min.delete();
      max.delete();
    }

    const props = new oc.GProp_GProps_1();
    let volumeMm3: number;
    try {
      oc.BRepGProp.VolumeProperties_1(shape, props, true, false, false);
      volumeMm3 = Math.abs(props.Mass());
    } finally {
      props.delete();
    }
    if (!Number.isFinite(volumeMm3) || volumeMm3 <= 0) {
      throw new StepAssemblyImportError('invalid-solid', 'OCCT returned a non-finite or zero component volume.', sourcePath);
    }

    const brepText = oc.BRepToolsWrapper.Write(shape) as string;
    const header = brepText.slice(0, 200).match(/CASCADE Topology V[^\r\n]*/);
    if (header === null) {
      throw new StepAssemblyImportError('invalid-solid', 'OCCT could not serialize the component as native BREP.', sourcePath);
    }
    const version = header[0].trim();
    return { solidCount, boundsMm, volumeMm3, brep: new TextEncoder().encode(brepText), brepVersion: version };
  } finally {
    box.delete();
  }
}

function resolveXcafProductIdentity(
  context: XcafTraversalContext,
  label: any,
  parentPath: string[],
  fallbackTag?: number,
): XcafProductIdentity {
  const { oc, track } = context;
  const occurrenceName = readLabelName(oc, label);
  const referred = track(new oc.TDF_Label());
  const isComponent = oc.XCAFDoc_ShapeTool.IsComponent(label);
  let definitionLabel = label;
  if (isComponent) {
    if (!oc.XCAFDoc_ShapeTool.GetReferredShape(label, referred)) {
      const fallbackName = occurrenceName ?? `Component ${fallbackTag ?? 1}`;
      throw new StepAssemblyImportError('read', 'XCAF component has no referred product definition.', [...parentPath, fallbackName]);
    }
    definitionLabel = referred;
  }

  const definitionName = readLabelName(oc, definitionLabel);
  const chosenName = occurrenceName ?? definitionName ?? `Component ${fallbackTag ?? context.occurrenceIndex + 1}`;
  const path = [...parentPath, chosenName];
  if (occurrenceName === undefined && definitionName === undefined) {
    context.warnings.push(`Missing product name at ${sourcePathText(path)}; used a deterministic generated name.`);
  }
  return { isComponent, definitionLabel, definitionName, chosenName, path };
}

function resolveXcafProductColor(
  context: XcafTraversalContext,
  label: any,
  identity: XcafProductIdentity,
  inheritedColor?: StepComponentColor,
): StepComponentColor | undefined {
  const occurrenceColor = (identity.isComponent
    ? readInstanceColor(context.oc, context.colorTool, label)
    : undefined) ?? readLabelColor(context.oc, context.colorTool, label);
  const definitionColor = identity.definitionLabel !== label
    ? readLabelColor(context.oc, context.colorTool, identity.definitionLabel)
    : undefined;
  return occurrenceColor ?? definitionColor ?? inheritedColor;
}

function resolveXcafProductTransform(
  context: XcafTraversalContext,
  label: any,
  identity: XcafProductIdentity,
  parentTransform: StepMatrix4,
): StepMatrix4 {
  if (!identity.isComponent) return parentTransform;
  const location = context.track(context.oc.XCAFDoc_ShapeTool.GetLocation(label));
  const trsf = context.track(location.Transformation());
  return multiply(parentTransform, matrixFromTrsf(trsf, identity.path));
}

function appendXcafLeafOccurrence(
  context: XcafTraversalContext,
  identity: XcafProductIdentity,
  transform: StepMatrix4,
  color?: StepComponentColor,
): void {
  const { oc, track, definitionsByLabel } = context;
  const defKey = labelKey(identity.definitionLabel);
  let definition = definitionsByLabel.get(defKey);
  if (definition === undefined) {
    const shape = track(oc.XCAFDoc_ShapeTool.GetShape_2(identity.definitionLabel));
    if (shape.IsNull()) {
      throw new StepAssemblyImportError('invalid-solid', 'STEP product definition has no geometry.', identity.path);
    }
    const statistics = definitionStatistics(oc, shape, identity.path);
    definition = {
      id: `def-${createHash('sha256').update(defKey).digest('hex')}`,
      sourceLabel: defKey,
      name: identity.definitionName ?? identity.chosenName,
      ...statistics,
    };
    definitionsByLabel.set(defKey, definition);
  }

  context.occurrenceIndex++;
  context.occurrences.push({
    id: `occ-${String(context.occurrenceIndex).padStart(6, '0')}`,
    name: identity.chosenName,
    sourcePath: identity.path,
    definitionId: definition.id,
    transform,
    ...(color !== undefined ? { color } : {}),
  });
  if (color !== undefined && color.alpha < 0.999) {
    context.warnings.push(`Translucent component color at ${sourcePathText(identity.path)} is recorded in the manifest; KernelCAD .color() keeps RGB only.`);
  }
}

function visitXcafProduct(
  context: XcafTraversalContext,
  label: any,
  parentTransform: StepMatrix4,
  parentPath: string[],
  inheritedColor?: StepComponentColor,
  fallbackTag?: number,
): void {
  const identity = resolveXcafProductIdentity(context, label, parentPath, fallbackTag);
  const color = resolveXcafProductColor(context, label, identity, inheritedColor);
  const transform = resolveXcafProductTransform(context, label, identity, parentTransform);
  if (context.oc.XCAFDoc_ShapeTool.IsAssembly(identity.definitionLabel)) {
    visitXcafAssemblyChildren(context, identity, transform, color);
    return;
  }
  appendXcafLeafOccurrence(context, identity, transform, color);
}

function visitXcafAssemblyChildren(
  context: XcafTraversalContext,
  identity: XcafProductIdentity,
  transform: StepMatrix4,
  color?: StepComponentColor,
): void {
  let childCount = 0;
  children(context.oc, identity.definitionLabel, (child, tag) => {
    if (!context.oc.XCAFDoc_ShapeTool.IsComponent(child)) return;
    childCount++;
    visitXcafProduct(context, child, transform, identity.path, color, tag);
  });
  if (childCount === 0) {
    throw new StepAssemblyImportError('empty', 'STEP assembly product has no component occurrences.', identity.path);
  }
}

function visitXcafRoots(
  context: XcafTraversalContext,
  baseLabel: any,
  inputName: string,
): void {
  let rootCount = 0;
  children(context.oc, baseLabel, (root, tag) => {
    if (!context.oc.XCAFDoc_ShapeTool.IsFree(root)) return;
    rootCount++;
    visitXcafProduct(context, root, IDENTITY, [], undefined, tag);
  });
  if (rootCount === 0 || context.occurrences.length === 0) {
    throw new StepAssemblyImportError('empty', `STEP input '${inputName}' contains no free 3D product occurrences.`);
  }
}

function transferXcafDocument(oc: any, tempPath: string, inputName: string, track: Track): { baseLabel: any; colorTool: any } {
  const reader = track(new oc.STEPCAFControl_Reader_1());
  reader.SetColorMode(true);
  reader.SetNameMode(true);
  reader.SetLayerMode(true);
  if (reader.ReadFile(tempPath) !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
    throw new StepAssemblyImportError('read', `OCCT could not read STEP input '${inputName}'.`);
  }

  const format = track(new oc.TCollection_ExtendedString_2('XmlOcaf', true));
  const docHandle = track(new oc.Handle_TDocStd_Document_2(new oc.TDocStd_Document(format)));
  const progress = track(new oc.Message_ProgressRange_1());
  if (!reader.Transfer_1(docHandle, progress)) {
    throw new StepAssemblyImportError('read', `OCCT could not transfer STEP product data from '${inputName}'.`);
  }

  const main = track(docHandle.get().Main());
  const shapeToolHandle = track(oc.XCAFDoc_DocumentTool.ShapeTool(main));
  const colorToolHandle = track(oc.XCAFDoc_DocumentTool.ColorTool(main));
  const baseLabel = track(shapeToolHandle.get().BaseLabel());
  return { baseLabel, colorTool: colorToolHandle.get() };
}

function readXcafAssembly(
  oc: any,
  tempPath: string,
  inputName: string,
  sourceLengthUnits: string[],
  warnings: string[],
): StepAssemblySnapshot {
  return withScope((track) => {
    const document = transferXcafDocument(oc, tempPath, inputName, track);
    const context: XcafTraversalContext = {
      oc,
      track,
      colorTool: document.colorTool,
      warnings,
      definitionsByLabel: new Map(),
      occurrences: [],
      occurrenceIndex: 0,
    };
    visitXcafRoots(context, document.baseLabel, inputName);
    return {
      sourceLengthUnits,
      definitions: [...context.definitionsByLabel.values()],
      occurrences: context.occurrences,
      warnings: [...new Set(warnings)],
    };
  });
}

function validateStepDocuments(
  inputName: string,
  bytes: Uint8Array,
  externalDocuments: ReadonlyMap<string, Uint8Array>,
): Array<[string, Uint8Array]> {
  const documents: Array<[string, Uint8Array]> = [[inputName, bytes]];
  for (const [fileName, fileBytes] of externalDocuments) {
    const normalized = fileName.replaceAll('\\', '/');
    const segments = normalized.split('/');
    if (
      normalized !== fileName
      || normalized === inputName
      || segments.some((segment) => segment === '' || segment === '.' || segment === '..')
      || !/\.step$|\.stp$/i.test(normalized)
    ) {
      throw new StepAssemblyImportError('external-reference', `Invalid staged STEP external document path '${fileName}'.`);
    }
    documents.push([normalized, fileBytes]);
  }
  return documents;
}

function stageStepDocuments(
  oc: any,
  tempDir: string,
  documents: Array<[string, Uint8Array]>,
  stagedFiles: string[],
  stagedDirectories: string[],
): void {
  oc.FS.mkdir(tempDir);
  for (const [fileName, fileBytes] of documents) {
    let currentDirectory = tempDir;
    for (const segment of fileName.split('/').slice(0, -1)) {
      currentDirectory += `/${segment}`;
      try {
        oc.FS.mkdir(currentDirectory);
        stagedDirectories.push(currentDirectory);
      } catch (error) {
        if (!oc.FS.analyzePath(currentDirectory).exists) throw error;
      }
    }
    const virtualPath = `${tempDir}/${fileName}`;
    oc.FS.writeFile(virtualPath, fileBytes);
    stagedFiles.push(virtualPath);
  }
}

function removeStagedDocuments(oc: any, stagedFiles: string[], stagedDirectories: string[]): void {
  for (const path of stagedFiles.reverse()) {
    try { oc.FS.unlink(path); } catch { /* best-effort cleanup after OCCT failure */ }
  }
  for (const path of stagedDirectories.reverse()) {
    try { oc.FS.rmdir(path); } catch { /* best-effort cleanup after OCCT failure */ }
  }
}

/**
 * Read a STEP assembly with XCAF names, component colors, and placements.
 * OCCT's default STEP transfer unit is one millimetre, matching the rest of
 * the KernelCAD modeling API; source unit declarations are converted during
 * transfer, so occurrence translations and BREP statistics use mm.
 */
export async function importStepAssembly(
  bytes: Uint8Array,
  inputName: string,
  externalDocuments: ReadonlyMap<string, Uint8Array> = new Map(),
): Promise<StepAssemblySnapshot> {
  if (bytes.length === 0) throw new StepAssemblyImportError('empty', 'STEP input is empty.');
  if (inputName.includes('/') || inputName.includes('\\') || inputName === '' || inputName === '.' || inputName === '..') {
    throw new StepAssemblyImportError('metadata', `Invalid STEP input filename '${inputName}'.`);
  }
  await initOcct();
  const oc = getOcctRuntime() as any;
  const documents = validateStepDocuments(inputName, bytes, externalDocuments);
  const sourceLengthUnits = [...new Set(documents.flatMap(([, fileBytes]) =>
    parseSourceLengthUnits(new TextDecoder().decode(fileBytes))))].sort();
  const warnings: string[] = [];
  if (sourceLengthUnits.length === 0) warnings.push('No STEP length unit declaration was recognized; OCCT transferred geometry into millimetres using its default STEP unit policy.');

  const tempDir = `/kernelcad-step-${process.pid}-${randomUUID()}`;
  const stagedFiles: string[] = [];
  const stagedDirectories: string[] = [tempDir];
  try {
    stageStepDocuments(oc, tempDir, documents, stagedFiles, stagedDirectories);
    return readXcafAssembly(oc, `${tempDir}/${inputName}`, inputName, sourceLengthUnits, warnings);
  } finally {
    removeStagedDocuments(oc, stagedFiles, stagedDirectories);
  }
}

/** Convert an occurrence's rigid placement to the axis-angle and translation
 *  calls available in generated `.kcad.ts` scripts. */
export function decomposeStepTransform(matrix: StepMatrix4): { axis: Vec3; degrees: number; translate: Vec3 } {
  const result = Transform.fromColumnMajor(matrix).decomposeToTranslateAndRotate();
  return {
    axis: [result.rotateAxis[0], result.rotateAxis[1], result.rotateAxis[2]],
    degrees: result.rotateDeg,
    translate: [result.translate[0], result.translate[1], result.translate[2]],
  };
}
