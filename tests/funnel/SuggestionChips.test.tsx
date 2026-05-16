// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SuggestionChips } from '../../src/funnel/components/SuggestionChips';

afterEach(() => cleanup());

describe('SuggestionChips', () => {
  it('renders nothing when suggestions is empty', () => {
    const { container } = render(<SuggestionChips suggestions={[]} onSelect={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one button per suggestion', () => {
    render(<SuggestionChips suggestions={['add fillet', 'drill hole']} onSelect={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('clicking a chip calls onSelect with that string', () => {
    const onSelect = vi.fn();
    render(<SuggestionChips suggestions={['add fillet']} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('add fillet'));
    expect(onSelect).toHaveBeenCalledWith('add fillet');
  });

  it('disabled state propagates to all chips', () => {
    render(<SuggestionChips suggestions={['add fillet']} onSelect={() => {}} disabled />);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
