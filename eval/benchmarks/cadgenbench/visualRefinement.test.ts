// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from 'vitest';
import type { AgentMessage } from '../../types';
import { refineVisualCandidate } from './visualRefinement';

const drawing = { mediaType: 'image/png' as const, data: 'drawing' };
const view = { mediaType: 'image/png' as const, data: 'render' };

describe('visual refinement', () => {
  it('gives the model the drawing and candidate views and accepts only a checked proposal', async () => {
    const revise = vi.fn<(_messages: AgentMessage[]) => Promise<{text:string;tokens_in:number;tokens_out:number}>>()
      .mockResolvedValueOnce({ text:'```ts\nreturn box(2,2,2);\n```', tokens_in:12, tokens_out:4 })
      .mockResolvedValueOnce({ text:'B', tokens_in:5, tokens_out:1 });
    const check = vi.fn(async () => true);
    const result = await refineVisualCandidate({ prompt:'drawing task', original:'return box(1,1,1);', drawing:[drawing], render:async()=>[view], revise, check });
    expect(result).toMatchObject({ code:'return box(2,2,2);', outcome:'accepted', tokensIn:17, tokensOut:5 });
    expect(result.responseText).toContain('return box(2,2,2);');
    expect(revise.mock.calls[0][0][0].images).toEqual([drawing, view]);
    expect(revise.mock.calls[1][0][0].images).toEqual([drawing, view, view]);
    expect(check).toHaveBeenCalledWith('return box(2,2,2);');
  });

  it('retains the valid original when the proposed geometry fails its gate', async () => {
    const result = await refineVisualCandidate({ prompt:'drawing task', original:'return box(1,1,1);', drawing:[drawing], render:async()=>[view], revise:async()=>({text:'```ts\nbroken();\n```',tokens_in:3,tokens_out:2}), check:async()=>false });
    expect(result).toMatchObject({ code:'return box(1,1,1);', outcome:'rejected' });
  });

  it('keeps the original when a valid revision is not clearly preferred', async () => {
    const revise = vi.fn()
      .mockResolvedValueOnce({text:'```ts\nreturn box(2,2,2);\n```',tokens_in:3,tokens_out:2})
      .mockResolvedValueOnce({text:'UNCERTAIN',tokens_in:5,tokens_out:1});
    const result = await refineVisualCandidate({prompt:'drawing task',original:'return box(1,1,1);',drawing:[drawing],render:async()=>[view],revise,check:async()=>true});
    expect(result).toMatchObject({code:'return box(1,1,1);',outcome:'comparison_not_preferred',tokensIn:8,tokensOut:3});
    expect(revise).toHaveBeenCalledTimes(2);
  });

  it('retains the original and does not invoke the model when rendering fails', async () => {
    const revise = vi.fn();
    const result = await refineVisualCandidate({ prompt:'drawing task', original:'return box(1,1,1);', drawing:[drawing], render:async()=>{throw new Error('render failed');}, revise, check:async()=>true });
    expect(result).toMatchObject({ code:'return box(1,1,1);', outcome:'render_failed' });
    expect(result.error).toBe('render failed');
    expect(revise).not.toHaveBeenCalled();
  });

  it('distinguishes a deliberate KEEP from a malformed response', async () => {
    const common = { prompt:'drawing task', original:'base', drawing:[drawing], render:async()=>[view], check:async()=>true };
    expect((await refineVisualCandidate({...common, revise:async()=>({text:'KEEP',tokens_in:1,tokens_out:1})})).outcome).toBe('unchanged');
    expect((await refineVisualCandidate({...common, revise:async()=>({text:'I changed it',tokens_in:1,tokens_out:1})})).outcome).toBe('no_script');
  });
});
