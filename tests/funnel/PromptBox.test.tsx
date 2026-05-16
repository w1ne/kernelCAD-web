// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PromptBox } from '../../src/funnel/components/PromptBox';

afterEach(() => cleanup());

describe('PromptBox', () => {
  it('renders default example chips', () => {
    render(<PromptBox onSubmit={() => {}} />);
    expect(screen.getByText(/60x40x5 mm bracket/)).toBeDefined();
  });

  it('clicking a chip fills the textarea', () => {
    render(<PromptBox onSubmit={() => {}} />);
    fireEvent.click(screen.getByText(/Hex-cap bolt M8x30/));
    const textarea = screen.getByLabelText(/CAD prompt/) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Hex-cap bolt M8x30');
  });

  it('submit calls onSubmit with trimmed prompt', () => {
    const onSubmit = vi.fn();
    render(<PromptBox onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText(/CAD prompt/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '  make a cube  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    expect(onSubmit).toHaveBeenCalledWith('make a cube');
  });

  it('submit button disabled when value is empty', () => {
    render(<PromptBox onSubmit={() => {}} />);
    const btn = screen.getByRole('button', { name: /Generate/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disabled state propagates from prop', () => {
    render(<PromptBox onSubmit={() => {}} disabled />);
    const btn = screen.getByRole('button', { name: /Generating/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
