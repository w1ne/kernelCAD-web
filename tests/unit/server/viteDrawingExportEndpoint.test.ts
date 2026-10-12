// SPDX-License-Identifier: MIT
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import viteConfig from '../../../vite.config';
const run = vi.hoisted(() => vi.fn());
vi.mock('../../../src/agent/script-runtime/export', () => ({ runAndExport: run }));
vi.mock('../../../src/server/sessionPool', () => ({ createSessionPool: () => ({ prune: vi.fn() }) }));
describe('local drawing export bridge', () => {
  it('returns an SVG/report review and forwards the same options to PDF', async () => {
    const config = typeof viteConfig === 'function' ? await viteConfig({ command: 'serve', mode: 'test' }) : viteConfig;
    const plugin = config.plugins.flat().find((p) => p?.name === 'kernelcad-mesh-endpoint');
    type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    const handlers = new Map<string, Handler>();
    plugin.configureServer({ middlewares: { use: (path: string, handler: Handler) => handlers.set(path, handler) }, watcher: { on: vi.fn() }, httpServer: { once: vi.fn() } });
    const handler = handlers.get('/__kernelcad/export')!;
    const drawingReport = { placed: 1, overlapped: 0, suppressed: 0, annotations: [] };
    run.mockResolvedValue({ bytes: new TextEncoder().encode('<svg/>'), drawingReport, diagnostics: [], featureCount: 1 });
    const options = { reviewPlans: [{id:'fit',requirements:[],decisions:[{id:'bore',kind:'fit',featureId:'bearing bore',prompt:'Choose fit'}]}], decisionResolutions:{'fit:bore':{note:'Clearance',provenance:'Design brief'}}, requireCompleteReview:true, format: 'svg-drawing', draftingProfile: 'machining', annotationOverrides: { hole: { suppress: true } } };
    const response = () => ({ statusCode: 0, setHeader: vi.fn(), end: vi.fn() });
    const req = Readable.from([Buffer.from(JSON.stringify({ source: 'model', options }))]);
    Object.assign(req, { method: 'POST', url: '?format=svg-drawing&review=1' });
    const res = response();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({ svg: '<svg/>', drawingReport, diagnostics: [] });
    expect(run).toHaveBeenLastCalledWith(expect.objectContaining({ options: { ...options, pdfSheet: true } }));
    const pdfReq = Readable.from([Buffer.from(JSON.stringify({ source: 'model', options: { ...options, format: 'pdf-drawing' } }))]);
    Object.assign(pdfReq, { method: 'POST', url: '?format=pdf-drawing&async=1' });
    const pdfRes = response();
    await handler(pdfReq, pdfRes);
    expect(pdfRes.statusCode).toBe(200);
    expect(run).toHaveBeenLastCalledWith(expect.objectContaining({options:{...options,format:'pdf-drawing'}}));
    expect(pdfRes.setHeader).toHaveBeenCalledWith('content-type', 'application/pdf');
    expect(pdfRes.setHeader).toHaveBeenCalledWith('content-disposition', 'attachment; filename="studio-export.kcad.pdf"');
  });
});
