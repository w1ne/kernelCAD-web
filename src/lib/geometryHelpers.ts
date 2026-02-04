import * as replicad from 'replicad';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getFn(obj: unknown, key: string): ((...args: unknown[]) => unknown) | null {
  if (!isRecord(obj)) return null;
  const val = obj[key];
  return typeof val === 'function' ? (val as (...args: unknown[]) => unknown) : null;
}

export const startSketch = () => new replicad.Sketcher();

export const makeCompound = (shapes: unknown[]) => {
  return replicad.compoundShapes(shapes as never[]);
};

export const fillet = (shape: unknown, radius: number, filter?: unknown) => {
  const fn = getFn(shape, 'fillet');
  if (!fn) throw new Error('Shape does not support fillet');
  return fn.call(shape, radius, filter);
};

export const chamfer = (shape: unknown, distance: number, filter?: unknown) => {
  const fn = getFn(shape, 'chamfer');
  if (!fn) throw new Error('Shape does not support chamfer');
  return fn.call(shape, distance, filter);
};

export const findPlanarFace = (shape: unknown): { face: unknown; index: number } => {
  if (!isRecord(shape) || !Array.isArray(shape.faces)) throw new Error('Shape has no faces');

  for (let i = 0; i < shape.faces.length; i++) {
    const face = shape.faces[i];
    if (!isRecord(face)) continue;
    if (face.geomType === 'PLANE' || face.geomType === 'Planar') return { face, index: i };
  }

  throw new Error('No planar face found on shape');
};

export const sketchOnFace = (shape: unknown, faceId: number) => {
  const native = getFn(shape, 'sketchOnFace');
  if (native) return native.call(shape, faceId);

  if (!isRecord(shape) || !Array.isArray(shape.faces) || !shape.faces[faceId]) {
    throw new Error(`Face ${faceId} not found on shape`);
  }

  const face = shape.faces[faceId];
  if (isRecord(face) && typeof face.geomType === 'string' && face.geomType !== 'PLANE' && face.geomType !== 'Planar') {
    throw new Error(`Cannot sketch on non-planar face (type: ${face.geomType}). Stick to flat surfaces.`);
  }

  const plane = replicad.makePlaneFromFace(face as never);
  return new replicad.Sketcher(plane);
};

export const extrude = (profile: unknown, distance: number) => {
  try {
    const extrudeFn = getFn(profile, 'extrude');
    if (extrudeFn) return extrudeFn.call(profile, distance);

    if (!isRecord(profile)) {
      throw new Error('Cannot extrude: invalid profile');
    }

    const geomType = typeof profile.geomType === 'string' ? profile.geomType : 'unknown';

    // Planar face: compute a plane from the face and extrude its outline.
    const isPlanarFace = geomType === 'PLANE' || geomType === 'Planar';
    const plane = (profile as UnknownRecord).planarPlane ?? (profile as UnknownRecord).plane ?? (isPlanarFace ? (replicad as unknown as { makePlaneFromFace?: (f: unknown) => unknown }).makePlaneFromFace?.(profile) : null);

    if (plane) {
      const drawFaceOutline = (replicad as unknown as { drawFaceOutline?: (p: unknown) => unknown }).drawFaceOutline;
      if (typeof drawFaceOutline !== 'function') {
        throw new Error('Cannot extrude face: replicad.drawFaceOutline is unavailable');
      }
      const drawing = drawFaceOutline(profile);
      const sketchOnPlaneFn = getFn(drawing, 'sketchOnPlane');
      if (!sketchOnPlaneFn) throw new Error('Cannot extrude face: drawing.sketchOnPlane is unavailable');
      const sketch = sketchOnPlaneFn.call(drawing, plane);
      const sketchExtrudeFn = getFn(sketch, 'extrude');
      if (!sketchExtrudeFn) throw new Error('Cannot extrude face: sketch.extrude is unavailable');
      const result = sketchExtrudeFn.call(sketch, distance);
      return result;
    }

    throw new Error(`Cannot extrude non-planar object (type: ${geomType}). Please select a flat face.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('No lines to convert into a wire')) {
      throw new Error(
        'Extrusion failed: The sketch is empty or contains invalid geometry. Please draw some geometry before extruding.',
      );
    }
    throw err;
  }
};
