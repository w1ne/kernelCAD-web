// src/kernel/backends/occt/export3mf.ts
//
// Minimal 3MF (Open Packaging Convention) writer. 3MF is a zip with three
// required XML parts: `[Content_Types].xml`, `_rels/.rels`, and
// `3D/3dmodel.model`. The container is built with `fflate` (already a direct
// dep) and the XML is hand-rolled — mirroring the `exportStlBinary`
// precedent: small, format-aware, no heavy 3MF library on the dep tree.
//
// Per-part identity (name + base color) comes from `SceneBackend.parts` via
// `sceneToWorldFrameParts`. PBR is surfaced as `baseColor` only because 3MF
// has no rich PBR slot — full PBR transcription lands in the GLB writer.
//
// Validity gate: every part mesh is fed through `assertWatertight` before
// the zip is built. The half-edge check throws when any undirected edge is
// shared by anything other than two triangles; the runtime layer translates
// that error into the `export.3mf.not-watertight` diagnostic.

import { zipSync, strToU8 } from 'fflate';
import { createRequire } from 'node:module';
import {
  meshShapeForExport,
} from './occtBackend';
import type { MeshData } from './exportStlBinary';
import type { PBRMaterial } from '../../../shared/intent/material';
import type { WorldFramePart } from './sceneToWorldFrame';
import { assertWatertight } from './assertWatertight';

const requireFromHere = createRequire(import.meta.url);
// At source: src/kernel/backends/occt/export3mf.ts → ../../../../package.json (4 up)
// At bundle: dist/cli/index.js → ../../package.json (2 up)
function loadPkg(): { version: string } {
  for (const rel of ['../../../../package.json', '../../package.json']) {
    try {
      return requireFromHere(rel) as { version: string };
    } catch {
      // try next
    }
  }
  return { version: 'unknown' };
}
const KERNELCAD_VERSION = loadPkg().version;

export type ThreeMfUnit = 'mm' | 'cm' | 'in';

export interface Export3mfOptions {
  format: '3mf';
  /** 3MF document unit. Default `mm`. */
  printUnit?: ThreeMfUnit;
  /** When `true`, embed the original `.kcad.ts` source as a 3MF extension
   *  file (`Metadata/source.kcad.ts`). Requires `scriptSource` to be set. */
  embedSource?: boolean;
  /** Source text to embed when `embedSource === true`. */
  scriptSource?: string;
}

/** A world-frame part with a pre-computed triangle mesh. Used by the runtime
 *  wiring when the mesh has been computed upstream (or when a test wants to
 *  inject a custom mesh). When the input is a bare `WorldFramePart`, the
 *  writer meshes the part's shape via `meshShapeForExport`. */
export interface MeshedPart extends WorldFramePart {
  readonly mesh: MeshData;
}

const PRINT_UNIT_TAG: Record<ThreeMfUnit, string> = {
  mm: 'millimeter',
  cm: 'centimeter',
  in: 'inch',
};

/**
 * Build the 3MF bytes for an array of scene parts.
 *
 * Accepts either bare `WorldFramePart`s (the writer meshes each shape via
 * `meshShapeForExport`) or `MeshedPart`s (caller has already meshed the
 * shape). The runtime wiring in `runAndExport` passes bare `WorldFramePart`s;
 * tests can inject custom meshes via the `MeshedPart` overload.
 */
export async function export3mfAsync(
  parts: ReadonlyArray<WorldFramePart | MeshedPart>,
  options: Export3mfOptions,
): Promise<Uint8Array> {
  if (parts.length === 0) {
    throw new Error('export3mfAsync: no parts to write.');
  }

  const meshed: ReadonlyArray<MeshedPart> = parts.map((p) =>
    hasMesh(p)
      ? p
      : { ...p, mesh: meshShapeForExport(p.shape.getReplicadShape()) },
  );

  for (const p of meshed) assertWatertight(p.mesh);

  const printUnit: ThreeMfUnit = options.printUnit ?? 'mm';
  const isoDate = new Date().toISOString().slice(0, 10);

  const baseMaterialEntries = meshed
    .map((p) => {
      const hex = resolveBaseColor(p.color, p.material);
      return `      <base name="${escapeXml(p.name)}" displaycolor="${hex}" />`;
    })
    .join('\n');

  const objectEntries = meshed
    .map((p, i) => {
      const id = i + 1;
      const verts = p.mesh.vertices;
      const vertexNodes: string[] = [];
      for (let v = 0; v < verts.length; v += 3) {
        vertexNodes.push(
          `        <vertex x="${verts[v]}" y="${verts[v + 1]}" z="${verts[v + 2]}" />`,
        );
      }
      const tris = p.mesh.triangles;
      const triNodes: string[] = [];
      for (let t = 0; t < tris.length; t += 3) {
        triNodes.push(
          `        <triangle v1="${tris[t]}" v2="${tris[t + 1]}" v3="${tris[t + 2]}" pid="1" p1="${i}" />`,
        );
      }
      return [
        `  <object id="${id}" type="model" name="${escapeXml(p.name)}">`,
        `    <mesh>`,
        `      <vertices>`,
        ...vertexNodes,
        `      </vertices>`,
        `      <triangles>`,
        ...triNodes,
        `      </triangles>`,
        `    </mesh>`,
        `  </object>`,
      ].join('\n');
    })
    .join('\n');

  const buildItems = meshed
    .map((_, i) => `    <item objectid="${i + 1}" />`)
    .join('\n');

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="${PRINT_UNIT_TAG[printUnit]}" xml:lang="en-US"
       xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">kernelcad ${KERNELCAD_VERSION}</metadata>
  <metadata name="CreationDate">${isoDate}</metadata>
  <resources>
    <basematerials id="1">
${baseMaterialEntries}
    </basematerials>
${objectEntries}
  </resources>
  <build>
${buildItems}
  </build>
</model>
`;

  const embedSource = !!(options.embedSource && options.scriptSource);
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
${embedSource ? '  <Default Extension="ts" ContentType="text/plain" />\n' : ''}</Types>
`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rel0"
                Target="/3D/3dmodel.model"
                Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>
`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypesXml),
    '_rels/.rels': strToU8(relsXml),
    '3D/3dmodel.model': strToU8(modelXml),
  };
  if (embedSource) {
    files['Metadata/source.kcad.ts'] = strToU8(options.scriptSource!);
  }
  return zipSync(files);
}

function hasMesh(p: WorldFramePart | MeshedPart): p is MeshedPart {
  return (
    typeof (p as MeshedPart).mesh === 'object' &&
    (p as MeshedPart).mesh !== null &&
    'triangles' in (p as MeshedPart).mesh &&
    'vertices' in (p as MeshedPart).mesh
  );
}

function escapeXml(s: string): string {
  return s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
}

function resolveBaseColor(
  color: string | undefined,
  material: PBRMaterial | undefined,
): string {
  const candidate = material?.baseColor ?? color ?? '#cccccc';
  // 3MF wants #RRGGBBAA. If the input is #RRGGBB, append AA=FF.
  if (/^#[0-9a-f]{6}$/i.test(candidate)) return `${candidate}FF`.toUpperCase();
  if (/^#[0-9a-f]{8}$/i.test(candidate)) return candidate.toUpperCase();
  // Role token (e.g. 'plate'); resolve via the existing role palette would
  // require importing resolveColor; defer to #CCCCCCFF as a defensive
  // fallback. (Callers should resolve role tokens to hex upstream.)
  return '#CCCCCCFF';
}
