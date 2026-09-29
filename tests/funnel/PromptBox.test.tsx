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
    const textarea = screen.getByLabelText(/Describe the part/) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Hex-cap bolt M8x30');
  });

  it('submit calls onSubmit with trimmed prompt', () => {
    const onSubmit = vi.fn();
    render(<PromptBox onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText(/Describe the part/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '  make a cube  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Create/i }));
    expect(onSubmit).toHaveBeenCalledWith('make a cube');
  });

  it('submit button disabled when value is empty', () => {
    render(<PromptBox onSubmit={() => {}} />);
    const btn = screen.getByRole('button', { name: /Create/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disabled state propagates from prop without claiming a run is in progress', () => {
    render(<PromptBox onSubmit={() => {}} disabled initialValue="a cube" />);
    const btn = screen.getByRole('button', { name: /Create/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBeNull();
  });

  it('busy shows a spinner on the send button and blocks sending', () => {
    const onSubmit = vi.fn();
    render(<PromptBox onSubmit={onSubmit} busy initialValue="a cube" />);
    const btn = screen.getByRole('button', { name: /Create/i }) as HTMLButtonElement;
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.disabled).toBe(true);
  });

  it('sends with Cmd/Ctrl+Enter', () => {
    const onSubmit = vi.fn();
    render(<PromptBox onSubmit={onSubmit} initialValue="a cube" />);
    fireEvent.keyDown(screen.getByLabelText(/Describe the part/), { key: 'Enter', metaKey: true });
    expect(onSubmit).toHaveBeenCalledWith('a cube');
  });

  it('renders a secondary action next to the send button', () => {
    render(<PromptBox onSubmit={() => {}} secondaryAction={<button type="button">Sign in</button>} />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDefined();
  });

  it('disables browser autocomplete for prompt draft fields', () => {
    render(<PromptBox onSubmit={() => {}} />);

    const form = screen.getByLabelText(/Describe the part/).closest('form');
    const textarea = screen.getByLabelText(/Describe the part/) as HTMLTextAreaElement;

    expect(form?.getAttribute('autocomplete')).toBe('off');
    expect(textarea.autocomplete).toBe('off');
  });
});
