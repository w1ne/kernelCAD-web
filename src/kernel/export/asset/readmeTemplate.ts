// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { GlbStats } from '../lowPolyGlb';
import type { AssetPackModel } from './assetPack';

export interface AssetPackReadmeInput {
  readonly id: string;
  readonly model: AssetPackModel;
  readonly stats: GlbStats;
  readonly sourceNote: string;
}

/** Human README for one asset-pack zip. */
export function renderAssetPackReadme(input: AssetPackReadmeInput): string {
  return [
    titleBlock(input),
    parameterTable(input.model.params),
    presetBlock(input.model.presets ?? []),
    statsBlock(input.stats),
    loadBlock(input.id),
    regenerateBlock(input),
    `## Source\n\n${input.sourceNote}\n`,
  ].join('\n');
}

function titleBlock(input: AssetPackReadmeInput): string {
  const title = input.model.meta?.title ?? input.model.meta?.name ?? input.id;
  const description = input.model.meta?.description;
  const about = description === undefined ? '' : `\n${description}\n`;
  return `# ${title}\n\nAsset id: \`${input.id}\`. The GLB uses the script's default parameter values.\n${about}`;
}

function parameterTable(params: AssetPackModel['params']): string {
  const header = [
    '## Parameters',
    '',
    '| name | type | default | range/choices | description |',
    '| --- | --- | --- | --- | --- |',
  ];
  const rows = [...params]
    .sort((a, b) => compareNames(a.name, b.name))
    .map((param) => `| ${cell(param.name)} | ${cell(param.type)} | ${cell(String(param.defaultValue))} | ${cell(rangeOf(param))} | ${cell(param.description ?? '—')} |`);
  const body = rows.length > 0 ? rows : ['| — | — | — | — | No parameters declared. |'];
  return `${[...header, ...body].join('\n')}\n`;
}

function rangeOf(param: AssetPackModel['params'][number]): string {
  if (param.choices !== undefined && param.choices.length > 0) return param.choices.join(', ');
  if (param.min !== undefined && param.max !== undefined) return `${param.min} .. ${param.max}`;
  if (param.min !== undefined) return `>= ${param.min}`;
  if (param.max !== undefined) return `<= ${param.max}`;
  return '—';
}

function presetBlock(presets: NonNullable<AssetPackModel['presets']>): string {
  const lines = [...presets]
    .sort((a, b) => compareNames(a.name, b.name))
    .map((preset) => `- ${preset.name}: ${JSON.stringify(preset.params)}`);
  const body = lines.length > 0 ? lines.join('\n') : 'None declared.';
  return `## Presets\n\n${body}\n`;
}

function statsBlock(stats: GlbStats): string {
  const size = stats.sizeM.map((value) => String(value)).join(' x ');
  return [
    '## Mesh stats',
    '',
    'These numbers are the default-parameter GLB (`asset.extras.kernelcad.stats`).',
    '',
    `- triangles: ${stats.triangles}`,
    `- sizeM: ${size}`,
    `- minUpM: ${stats.minUpM}`,
    `- materials: ${stats.materials}`,
    `- drawCalls: ${stats.drawCalls}`,
    `- parts: ${stats.parts}`,
    `- hasRig: ${stats.hasRig}`,
    `- hasIk: ${stats.hasIk}`,
    '',
  ].join('\n');
}

function loadBlock(id: string): string {
  const glb = `${id}.glb`;
  return [
    '## Load the model',
    '',
    '### three.js',
    '',
    `Open \`index.html\` next to this file. It imports three.js and \`three/addons/\` through an import map, then shows \`${glb}\` with GLTFLoader and OrbitControls. The renderer is created with \`preserveDrawingBuffer: true\`.`,
    '',
    '### Unity',
    '',
    `Import \`${glb}\` with glTFast or another glTF importer. The default export is Y-up. Dimensions in the file follow the exporter's millimetre layout for a PBR GLB.`,
    '',
    '### Blender',
    '',
    `Use File → Import → glTF 2.0 and choose \`${glb}\`. Material names on the meshes are the names kernelCAD wrote into the file.`,
    '',
  ].join('\n');
}

function regenerateBlock(input: AssetPackReadmeInput): string {
  const source = input.model.fileName ?? `${input.id}.kcad.ts`;
  return [
    '## Regenerate',
    '',
    '```',
    `kernelcad export asset-pack ${source} -o ${input.id}.zip`,
    '```',
    '',
  ].join('\n');
}

function cell(value: string): string {
  return value.replace(/\|/g, '/').replace(/\n/g, ' ');
}

function compareNames(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
