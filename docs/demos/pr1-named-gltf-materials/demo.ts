import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { Transform } from '../../../src/shared/runtime/se3';
import { expandFinish } from '../../../src/shared/render/finishes';
import type { SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import {
  initOcct,
  meshShapeForExport,
  OcctBackend,
} from '../../../src/kernel/backends/occt/occtBackend';
import { exportGlbAsync } from '../../../src/kernel/backends/occt/exportGlb';
import { sceneToWorldFrameParts } from '../../../src/kernel/backends/occt/sceneToWorldFrame';

export async function createDemoArtifacts(): Promise<string[]> {
  const output = 'docs/demos/pr1-named-gltf-materials';
  await initOcct();
  const scene: SceneBackend = {
    target: 'export-occt',
    assemblyName: 'named-materials-demo',
    _kind: 'scene',
    parts: [
      {
        name: 'fastener',
        shape: OcctBackend.box(12, 12, 12),
        worldTransform: Transform.identity(),
        material: expandFinish('brass'),
      },
      {
        name: 'body',
        shape: OcctBackend.box(18, 18, 18),
        worldTransform: Transform.identity(),
        material: { baseColor: '#477a91', metalness: 0.1, roughness: 0.6 },
      },
    ],
  };

  const parts = sceneToWorldFrameParts(scene).map((part, index) => ({
    ...part,
    ...(index === 1 ? { colorParamName: 'hull' } : {}),
    mesh: meshShapeForExport(part.shape.getReplicadShape()),
  }));
  const glb = await exportGlbAsync(parts, { format: 'glb' });
  await writeFile(`${output}/named-materials.glb`, glb);

  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength))) as {
    materials?: Array<{ name?: string }>;
  };
  const names = (json.materials ?? []).map((material) => material.name ?? '');
  if (
    !names.includes('brass')
    || !names.includes('hull')
    || names.some((name) => name.trim().length === 0)
    || new Set(names).size !== names.length
  ) {
    throw new Error(`Unexpected GLB material names: ${JSON.stringify(names)}`);
  }

  const nameRows = names.map((name, index) => {
    const y = 484 + index * 58;
    return `<rect x="812" y="${y - 27}" width="390" height="42" rx="10" fill="#182b39"/><text x="836" y="${y}" fill="#f4f7fa" font-size="25" font-family="Menlo, monospace">materials[].name = "${escapeXml(name)}"</text>`;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0b1721"/>
  <text x="78" y="86" fill="#f4f7fa" font-size="38" font-family="Arial, sans-serif" font-weight="700">kernelCAD · named GLB materials</text>
  <text x="80" y="130" fill="#a9bdca" font-size="22" font-family="Arial, sans-serif">Local export replay · two original parts · names read back from the emitted GLB</text>
  <rect x="78" y="182" width="1124" height="142" rx="18" fill="#122431" stroke="#294252"/>
  <text x="110" y="232" fill="#8fa7b5" font-size="18" font-family="Arial, sans-serif" letter-spacing="2">AUTHORING</text>
  <text x="110" y="278" fill="#f4f7fa" font-size="25" font-family="Menlo, monospace">fastener.finish('brass')</text>
  <text x="648" y="278" fill="#f4f7fa" font-size="25" font-family="Menlo, monospace">colorParamName: 'hull'</text>
  <text x="80" y="390" fill="#8fa7b5" font-size="18" font-family="Arial, sans-serif" letter-spacing="2">EXPORTED GLB MATERIALS</text>
  <polygon points="106,476 206,424 306,476 206,528" fill="#e5bb63"/><polygon points="106,476 206,528 206,623 106,570" fill="#b27c26"/><polygon points="206,528 306,476 306,570 206,623" fill="#c8953c"/>
  <text x="356" y="500" fill="#f4f7fa" font-size="27" font-family="Arial, sans-serif">brass finish</text>
  <text x="356" y="541" fill="#a9bdca" font-size="18" font-family="Arial, sans-serif">PBR finish token retained as name</text>
  <rect x="356" y="585" width="90" height="55" rx="8" fill="#477a91"/>
  <text x="470" y="621" fill="#f4f7fa" font-size="27" font-family="Arial, sans-serif">hull colour parameter</text>
  <text x="812" y="390" fill="#8fa7b5" font-size="18" font-family="Arial, sans-serif" letter-spacing="2">VERIFIED JSON CHUNK</text>
  ${nameRows}
  <text x="80" y="686" fill="#668091" font-size="15" font-family="Arial, sans-serif">Tested export data · no deployment, Blender import, or hardware acceptance implied</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${output}/preview.png`);
  console.log(`GLB materials[].name: ${names.join(', ')}`);
  return names;
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
