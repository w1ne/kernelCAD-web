// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { TOOL_OUTPUT_SCHEMAS } from '../../../src/agent/mcp/toolOutputSchemas';
import { describe, expect, it, vi } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderPreviewTool } from '../../../src/agent/mcp/tools/renderPreview';
import { exportPartTool } from '../../../src/agent/mcp/tools/exportPart';
import type { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/composition/buildModel';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';
import { meshForHeadlessRender } from '../../../src/agent/render/headlessRender';
import { summarizeScene, type SceneSummary } from '../../../src/agent/script-runtime/sceneSummary';
import { addFeatureTool } from '../../../src/agent/mcp/tools/addFeature';

describe('MCP build scene summary', () => {
  it('measures the returned root rather than a later helper', async () => {
    const out = await evaluateScriptTool({ code: 'const body = box(40,30,10); box(1,1,1); return body;' });
    expect(out.sceneSummary?.valid).toBe(true);
    expect(out.sceneSummary?.volume).toBeCloseTo(12000);
    expect(out.sceneSummary?.faceCount).toBe(6);
    expect(out.sceneSummary?.size).toHaveLength(3);
    out.sceneSummary?.size?.forEach((n, i) => expect(n).toBeCloseTo([40,30,10][i], 4));
  });
  it('measures boolean results', async () => {
    const out = await evaluateScriptTool({ code: 'return box(40,30,10).subtract(cylinder(20,5).translate(20,15,0));' });
    expect(out.sceneSummary?.valid).toBe(true);
    expect(out.sceneSummary?.volume).toBeCloseTo(12000 - Math.PI * 25 * 10, 3);
    expect(out.sceneSummary?.faceCount).toBe(7);
  });
  it('aggregates an assembly in world coordinates', async () => {
    const out = await evaluateScriptTool({ code: "const a=assembly('pair'); a.part('one',box(10,20,30)); a.part('two',box(10,20,30),{at:[50,0,0]}); return a.model();", skipMechanismCheck: true });
    expect(out.sceneSummary?.valid).toBe(true);
    expect(out.sceneSummary?.volume).toBeCloseTo(12000);
    expect(out.sceneSummary?.faceCount).toBe(12);
    expect(out.sceneSummary?.size).toHaveLength(3);
    out.sceneSummary?.size?.forEach((n, i) => expect(n).toBeCloseTo([60,20,30][i], 4));
  });
  it('does not claim geometry validation for dry runs or failed scripts', async () => {
    for (const input of [{code:'return box(10,20,30);',dryRun:true}, {code:"throw new Error('stop');"}]) {
      const out = await evaluateScriptTool(input);
      expect(out.sceneSummary).toEqual({ valid: null, volume: null, faceCount: null, size: null });
    }
  });
  it('includes geometry in export receipts and preview builds without a second evaluation', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'scene-summary-'));
    try {
      const code = 'const body=box(10,20,30); box(1,1,1); return body;';
      const out = await exportModelTool({code,format:'step',output_path:join(dir,'body.step')});
      expect(out.sceneSummary?.volume).toBeCloseTo(6000);
      const scriptPath = join(dir,'body.kcad.ts');
      await writeFile(scriptPath,code);
      let summary: SceneSummary | undefined;
      await meshForHeadlessRender({scriptPath,onBuild:root => {summary=summarizeScene(root);}});
      expect(summary?.volume).toBeCloseTo(6000);
    } finally { await rm(dir,{recursive:true,force:true}); }
  });
  it('retains geometry on DFM failure and distinguishes failed lowering', async () => {
    const dfm = await evaluateScriptTool({code:'dfmSpec({minWall:1.5}); return box(20,20,1);'});
    expect(dfm.ok).toBe(false);
    expect(dfm.sceneSummary.valid).toBe(true);
    expect(dfm.sceneSummary.volume).toBeCloseTo(400);
    const failed = await evaluateScriptTool({code:'return box(10,10,10).fillet(100);'});
    expect(failed.ok).toBe(false);
    expect(failed.sceneSummary.volume).toBeNull();
  });
  it('retains summary when a preview fails after building', async () => {
    const model = await buildModel({code:'return box(10,20,30);',fileName:'test.kcad.ts'});
    const out = await renderPreviewTool({code:'return box(10,20,30);'}, {
      mechanismProbe: async () => ({mechanism:'unverified',failures:[]}),
      resolveBaseUrl: async () => ({baseUrl:'http://127.0.0.1:1',source:'explicit',close:async () => {}}),
      render: async opts => { opts.onBuild?.(model.rootShape); throw new Error('browser unavailable'); },
    });
    expect(out.ok).toBe(false);
    expect(out.sceneSummary?.volume).toBeCloseTo(6000);
  });
  it('includes geometry in per-part export receipts', async () => {
    const dir = await mkdtemp(join(tmpdir(),'scene-summary-parts-'));
    try {
      const out = await exportPartTool({code:"const a=assembly('pair'); a.part('one',box(10,20,30)); return a.model();",output_dir:dir});
      expect(out.ok).toBe(true);
      expect(out.sceneSummary?.volume).toBeCloseTo(6000);
    } finally { await rm(dir,{recursive:true,force:true}); }
  });
  it('advertises summaries on evaluation, edit, export and preview schemas', () => {
    for (const name of ['evaluate_script','add_feature','set_param','export','render_preview']) {
      expect(TOOL_OUTPUT_SCHEMAS[name].properties.sceneSummary).toMatchObject({type:'object',required:['valid','volume','faceCount','size']});
    }
  });
  it('disposes enumerated face wrappers and leaves the built root usable', async () => {
    const model = await buildModel({code:'return box(10,20,30);',fileName:'test.kcad.ts'});
    const root = model.rootShape as OcctBackend;
    const raw = root.getReplicadShape();
    const faces = raw.faces;
    const deletes = faces.map(face => vi.spyOn(face,'delete'));
    const enumeration = vi.spyOn(raw,'faces','get').mockReturnValue(faces);
    try {
      expect(summarizeScene(root).faceCount).toBe(6);
      expect(enumeration).toHaveBeenCalledTimes(1);
      for (const deletion of deletes) expect(deletion).toHaveBeenCalledTimes(1);
      expect(root.volume()).toBeCloseTo(6000);
    } finally { enumeration.mockRestore(); root.dispose(); }
  });
  it('includes the rebuilt summary in source edit results', async () => {
    const out = await addFeatureTool({code:'return box(10,20,30);',feature_code:'const helper = box(1,1,1);'});
    expect(out.sceneSummary?.volume).toBeCloseTo(6000);
  });
});
