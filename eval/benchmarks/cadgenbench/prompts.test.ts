// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { editingPrompt, generationPrompt } from './prompts';

describe('CADGenBench task prompts', () => {
  it('preserves the generation request and asks for a feature and dimension cross-check', () => {
    const prompt = generationPrompt({id:'102',type:'generation',dir:'/fixture',description:'Reproduce this drawing.',images:['drawing.png']});
    expect(prompt).toContain('Reproduce this drawing.');
    expect(prompt).toContain('dimension ledger');
    expect(prompt).toContain('cross-check');
    expect(prompt).toContain('ONE closed solid');
  });
  it('preserves an editing request and asks to measure the target without changing other geometry', () => {
    const prompt = editingPrompt({id:'201',type:'editing',dir:'/fixture',description:'Move the wall 6 mm.',images:[],inputStep:'/fixture/input.step'}, null);
    expect(prompt).toContain('Move the wall 6 mm.');
    expect(prompt).toContain('target face');
    expect(prompt).toContain('Leave everything the request does not mention unchanged.');
    expect(prompt).toContain('do not move, rotate or re-centre');
  });
});
