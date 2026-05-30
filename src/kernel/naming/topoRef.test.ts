import { describe, it, expect } from 'vitest';
import {
  parseTopoRef,
  formatTopoRef,
  type TopoRef,
  type TopoRefParseError,
} from './topoRef';

function ok(s: string): TopoRef {
  const r = parseTopoRef(s);
  if ('error' in r) throw new Error(`expected ok for '${s}', got error: ${r.error}`);
  return r;
}

function err(s: string): TopoRefParseError {
  const r = parseTopoRef(s);
  if (!('error' in r)) throw new Error(`expected error for '${s}', got ok`);
  return r;
}

describe('parseTopoRef — accepts the v1 grammar', () => {
  it('parses @kc[base/face/top]', () => {
    const r = ok('@kc[base/face/top]');
    expect(r.owner).toBe('base');
    expect(r.kind).toBe('face');
    expect(r.segments).toEqual(['top']);
    expect(r.modifier).toBeUndefined();
    expect(r.raw).toBe('@kc[base/face/top]');
  });

  it('parses @kc[base/edge/top-front]', () => {
    const r = ok('@kc[base/edge/top-front]');
    expect(r.owner).toBe('base');
    expect(r.kind).toBe('edge');
    expect(r.segments).toEqual(['top-front']);
  });

  it('parses @kc[base/vertex/top-front-right]', () => {
    expect(ok('@kc[base/vertex/top-front-right]').kind).toBe('vertex');
  });

  it('parses @kc[shoulder-servo/connector/flange]', () => {
    expect(ok('@kc[shoulder-servo/connector/flange]').owner).toBe('shoulder-servo');
  });

  it('parses @kc[hole1/face/wall] — ordinal owner', () => {
    expect(ok('@kc[hole1/face/wall]').owner).toBe('hole1');
  });

  it('parses @kc[base] — bare owner, no kind/segments', () => {
    const r = ok('@kc[base]');
    expect(r.owner).toBe('base');
    expect(r.kind).toBe('part');
    expect(r.segments).toEqual([]);
  });

  it('parses @kc[base/face/top#normal] — modifier slot', () => {
    const r = ok('@kc[base/face/top#normal]');
    expect(r.modifier).toBe('normal');
    expect(r.segments).toEqual(['top']);
  });

  it('parses @kc[base/edge/top-front#axis] — edge modifier', () => {
    expect(ok('@kc[base/edge/top-front#axis]').modifier).toBe('axis');
  });

  it('parses @kc[base/face/top#center] — center modifier (explicit default)', () => {
    expect(ok('@kc[base/face/top#center]').modifier).toBe('center');
  });

  it('parses @kc[base/solid/main] — solid kind', () => {
    expect(ok('@kc[base/solid/main]').kind).toBe('solid');
  });

  it('parses @kc[mountingHoles[2]/face/wall] — indexed feature owner', () => {
    const r = ok('@kc[mountingHoles[2]/face/wall]');
    expect(r.owner).toBe('mountingHoles[2]');
    expect(r.kind).toBe('face');
    expect(r.segments).toEqual(['wall']);
  });

  it('parses @kc[base/face/mountingHoles[2]] — indexed segment per spec §3.1', () => {
    const r = ok('@kc[base/face/mountingHoles[2]]');
    expect(r.owner).toBe('base');
    expect(r.kind).toBe('face');
    expect(r.segments).toEqual(['mountingHoles[2]']);
  });
});

describe('parseTopoRef — rejects malformed inputs (no exceptions thrown)', () => {
  it('rejects missing @kc prefix', () => {
    expect(err('kc[base/face/top]').error).toMatch(/prefix|@kc/);
  });

  it('rejects missing opening bracket', () => {
    expect(err('@kcbase/face/top]').error).toMatch(/bracket|\[/);
  });

  it('rejects missing closing bracket', () => {
    expect(err('@kc[base/face/top').error).toMatch(/bracket|\]/);
  });

  it('rejects empty body', () => {
    expect(err('@kc[]').error).toMatch(/empty/);
  });

  it('rejects unknown kind', () => {
    expect(err('@kc[base/wibble/top]').error).toMatch(/kind/);
  });

  it('rejects digit-leading owner', () => {
    expect(err('@kc[1base/face/top]').error).toMatch(/name|owner/);
  });

  it('rejects reserved chars in segment', () => {
    expect(err('@kc[base/face/top.bottom]').error).toMatch(/name|segment|reserved/);
  });

  it('rejects multiple # modifiers', () => {
    expect(err('@kc[base/face/top#normal#axis]').error).toMatch(/modifier/);
  });

  it('rejects unknown modifier', () => {
    expect(err('@kc[base/face/top#wibble]').error).toMatch(/modifier/);
  });

  it('rejects trailing slash', () => {
    expect(err('@kc[base/face/top/]').error).toMatch(/segment|empty/);
  });

  it('rejects whitespace inside the ref', () => {
    expect(err('@kc[base/face/ top]').error).toMatch(/name|whitespace/);
  });

  it('rejects trailing content after a balanced closing bracket', () => {
    expect(err('@kc[base/face/top]extra').error).toMatch(/closing bracket|trailing/);
  });

  it('rejects mismatched brackets (open inside name with no close)', () => {
    expect(err('@kc[base/face/top[]').error).toMatch(/bracket|segment/);
  });
});

describe('formatTopoRef — round-trip', () => {
  it('round-trips @kc[base/face/top]', () => {
    const r = ok('@kc[base/face/top]');
    expect(formatTopoRef(r)).toBe('@kc[base/face/top]');
  });

  it('round-trips with modifier', () => {
    const r = ok('@kc[base/face/top#normal]');
    expect(formatTopoRef(r)).toBe('@kc[base/face/top#normal]');
  });

  it('round-trips bare owner', () => {
    const r = ok('@kc[base]');
    expect(formatTopoRef(r)).toBe('@kc[base]');
  });
});
