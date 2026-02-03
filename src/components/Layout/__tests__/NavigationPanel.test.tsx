
/** @vitest-environment jsdom */
import { render, screen, cleanup } from '@testing-library/react';
import { NavigationPanel } from '../NavigationPanel';
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock Toolbar and SidePanel
vi.mock('../../Toolbar', () => ({
    default: ({ onToolClick }: any) => (
        <div data-testid="mock-toolbar">
            <button onClick={() => onToolClick({ id: 'test-tool' })}>Tool</button>
        </div>
    )
}));

vi.mock('../SidePanel', () => ({
    SidePanel: () => <div data-testid="mock-sidepanel">Side Panel</div>
}));

describe('NavigationPanel', () => {
    afterEach(() => {
        cleanup();
    });

    const defaultProps = {
        viewMode: 'code' as 'code' | 'gui',
        features: [],
        onToolClick: vi.fn(),
        onJumpToLine: vi.fn(),
        children: <div data-testid="child-element">Editor Content</div>
    };

    it('should render the toolbar in code mode', () => {
        render(<NavigationPanel {...defaultProps} />);
        expect(screen.getByTestId('mock-toolbar')).toBeTruthy();
        expect(screen.queryByTestId('mock-sidepanel')).toBeNull();
        expect(screen.getByTestId('child-element')).toBeTruthy();
    });

    it('should render both toolbar and sidepanel in gui mode', () => {
        render(<NavigationPanel {...defaultProps} viewMode="gui" />);
        expect(screen.getByTestId('mock-toolbar')).toBeTruthy();
        expect(screen.getByTestId('mock-sidepanel')).toBeTruthy();
        expect(screen.getByTestId('child-element')).toBeTruthy();
    });

    it('should adjust width based on view mode', () => {
        const { container, unmount } = render(<NavigationPanel {...defaultProps} />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain('w-[40%]');

        unmount();

        const { container: containerGui } = render(<NavigationPanel {...defaultProps} viewMode="gui" />);
        const wrapperGui = containerGui.firstChild as HTMLElement;
        expect(wrapperGui.className).toContain('w-[250px]');
    });
});
