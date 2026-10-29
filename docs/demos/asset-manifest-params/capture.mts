// SPDX-License-Identifier: MIT
// Local evidence capture for the asset_manifest feature. Builds the checked-in
// original example, activates its CaptureSession, and calls the real MCP
// registry handler without starting a browser or network service.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModelFromFile } from '../../../src/composition/buildModel';
import { setActiveMcpSession, clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { AssetManifestSchema } from '../../../src/shared/assets/assetSchema';

const repo = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const example = resolve(repo, 'examples/params/asset-manifest-mounting-plate.kcad.ts');
const outputDir = fileURLToPath(new URL('./', import.meta.url));

await mkdir(outputDir, { recursive: true });
const model = await buildModelFromFile({ file: example });
const errors = model.diagnostics.filter(diagnostic => diagnostic.severity === 'error');
if (errors.length > 0) {
  throw new Error(`Example build produced errors: ${errors.map(error => error.code).join(', ')}`);
}

setActiveMcpSession({
  file: example,
  ...(model.code !== undefined ? { code: model.code } : {}),
  stepEvidenceSupported: true,
  session: model.session,
  tailId: model.tailId,
  tailShape: model.tailShape,
  rootId: model.rootId,
  rootShape: model.rootShape,
});

try {
  const raw = await callMcpTool('asset_manifest', {});
  const manifest = AssetManifestSchema.parse(raw);
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(resolve(outputDir, 'asset-manifest.json'), json, 'utf8');
  console.log('Local asset_manifest MCP handler result:');
  console.log(json);
} finally {
  clearActiveMcpSession();
}
