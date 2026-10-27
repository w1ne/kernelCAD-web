// SPDX-License-Identifier: MIT
import type { AgentImage, AgentMessage, AgentResponse } from '../../types';
import { extractScript } from '../../lib';
export interface VisualRefinementInput {
  prompt: string;
  original: string;
  drawing: AgentImage[];
  render: (code: string) => Promise<AgentImage[]>;
  revise: (messages: AgentMessage[]) => Promise<AgentResponse>;
  check: (code: string) => Promise<boolean>;
}
export async function refineVisualCandidate(input: VisualRefinementInput) {
  const keep = (outcome: string, tokensIn = 0, tokensOut = 0) => ({ code: input.original, outcome, tokensIn, tokensOut });
  let views: AgentImage[];
  try {
    views = await input.render(input.original);
    if (views.length === 0) return keep('render_failed');
  } catch { return keep('render_failed'); }
  let response: AgentResponse;
  try {
    response = await input.revise([{
      role: 'user', images: [...input.drawing, ...views],
      content: `${input.prompt}\n\nThe first ${input.drawing.length} image(s) are the drawing; the following ${views.length} image(s) show the current candidate. Compare their dimensions, visible features and orientation. The current script is below. If correction is needed, return the complete revised script in one fenced TypeScript block. Otherwise reply KEEP. Do not claim you measured anything you did not measure.\n\n\`\`\`ts\n${input.original}\n\`\`\``,
    }]);
  } catch { return keep('model_failed'); }
  if (/^\s*KEEP\s*$/i.test(response.text)) return keep('unchanged', response.tokens_in, response.tokens_out);
  if (!/```(?:ts|typescript|javascript|js)?\s*\n/i.test(response.text)) return keep('no_script', response.tokens_in, response.tokens_out);
  const proposal = extractScript(response.text);
  if (proposal === null) return keep('no_script', response.tokens_in, response.tokens_out);
  try {
    if (!(await input.check(proposal))) return keep('rejected', response.tokens_in, response.tokens_out);
  } catch { return keep('check_failed', response.tokens_in, response.tokens_out); }
  return { code: proposal, outcome: 'accepted', tokensIn: response.tokens_in, tokensOut: response.tokens_out };
}
