// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'framer-motion';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { IconButton } from './IconButton';
import { Menu } from './Menu';
import { NumberInput } from './NumberInput';
import { Panel } from './Panel';
import { Sheet } from './Sheet';
import { SkeletonCard } from './Skeleton';
import { SliderField } from './SliderField';
import { TabPanel, Tabs } from './Tabs';
import { ToastProvider } from './Toast';
import { useToast } from './toastContext';

beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('Button', () => {
    it('renders a focusable button with the focus ring and variant', async () => {
        const onClick = vi.fn();
        render(<Button variant="primary" onClick={onClick}>Download</Button>);
        const btn = screen.getByRole('button', { name: 'Download' });
        expect(btn).toHaveAttribute('type', 'button');
        expect(btn.className).toContain('focus-ring');
        expect(btn).toHaveAttribute('data-variant', 'primary');
        await userEvent.tab();
        expect(btn).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('loading keeps the label, blocks clicks and reports busy', () => {
        const onClick = vi.fn();
        render(<Button loading onClick={onClick}>Export</Button>);
        const btn = screen.getByRole('button', { name: 'Export' });
        expect(btn).toBeDisabled();
        expect(btn).toHaveAttribute('aria-busy', 'true');
        fireEvent.click(btn);
        expect(onClick).not.toHaveBeenCalled();
    });
});

describe('IconButton and Tooltip', () => {
    it('requires a label, exposes the shortcut and shows a tooltip on keyboard focus', async () => {
        render(<IconButton label="Undo" shortcut={['Mod', 'Z']} icon={<svg />} />);
        const btn = screen.getByRole('button', { name: 'Undo' });
        expect(btn).toHaveAttribute('aria-keyshortcuts', 'Meta+Z');
        expect(screen.queryByRole('tooltip')).toBeNull();
        await userEvent.tab();
        expect(btn).toHaveFocus();
        const tip = await screen.findByRole('tooltip');
        expect(tip).toHaveTextContent('Undo');
        expect(tip).toHaveTextContent('Z');
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('shows the tooltip after the hover delay', () => {
        vi.useFakeTimers();
        render(<IconButton label="Section" description="Cut the model" icon={<svg />} />);
        const btn = screen.getByRole('button', { name: 'Section' });
        fireEvent.pointerEnter(btn.parentElement!);
        act(() => vi.advanceTimersByTime(399));
        expect(screen.queryByRole('tooltip')).toBeNull();
        act(() => vi.advanceTimersByTime(2));
        const tip = screen.getByRole('tooltip');
        expect(btn).toHaveAttribute('aria-describedby', tip.id);
    });

    it('copies the tooltip theme from the trigger subtree', () => {
        vi.useFakeTimers();
        render(
            <div data-theme="dark">
                <IconButton label="Grid" icon={<svg />} />
            </div>,
        );
        fireEvent.pointerEnter(screen.getByRole('button', { name: 'Grid' }).parentElement!);
        act(() => vi.advanceTimersByTime(500));
        expect(screen.getByRole('tooltip')).toHaveAttribute('data-theme', 'dark');
    });

    it('exposes toggle state', () => {
        render(<IconButton label="Section" pressed icon={<svg />} />);
        expect(screen.getByRole('button', { name: 'Section' })).toHaveAttribute('aria-pressed', 'true');
    });
});

function TabsHarness() {
    const [tab, setTab] = useState('code');
    const items = [
        { id: 'code', label: 'Code' },
        { id: 'params', label: 'Params' },
        { id: 'sections', label: 'Sections', available: false },
        { id: 'checks', label: 'Checks' },
        { id: 'joints', label: 'Joints' },
        { id: 'render', label: 'Render' },
    ];
    return (
        <>
            <Tabs id="t" label="Inspector" items={items} value={tab} onChange={setTab} maxVisible={4} />
            {items.map((i) => (
                <TabPanel key={i.id} tabsId="t" id={i.id} value={tab}>
                    {i.label} body
                </TabPanel>
            ))}
        </>
    );
}

describe('Tabs', () => {
    it('hides unavailable tabs and links tabs to panels', () => {
        render(<TabsHarness />);
        expect(screen.getByRole('tablist', { name: 'Inspector' })).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: 'Sections' })).toBeNull();
        const code = screen.getByRole('tab', { name: 'Code' });
        expect(code).toHaveAttribute('aria-selected', 'true');
        const panel = screen.getByRole('tabpanel');
        expect(panel).toHaveAttribute('aria-labelledby', code.id);
        expect(code).toHaveAttribute('aria-controls', panel.id);
    });

    it('moves and selects with arrow keys, Home and End (roving tabindex)', async () => {
        render(<TabsHarness />);
        await userEvent.tab();
        expect(screen.getByRole('tab', { name: 'Code' })).toHaveFocus();
        expect(screen.getByRole('tab', { name: 'Params' })).toHaveAttribute('tabindex', '-1');
        await userEvent.keyboard('{ArrowRight}');
        expect(screen.getByRole('tab', { name: 'Params' })).toHaveFocus();
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Params body');
        await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
        expect(screen.getByRole('tab', { name: 'Checks' })).toHaveFocus();
        await userEvent.keyboard('{Home}');
        expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true');
    });

    it('puts overflow tabs in a More menu', async () => {
        render(<TabsHarness />);
        expect(screen.queryByRole('tab', { name: 'Joints' })).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: /More/ }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Render' }));
        expect(screen.getByRole('tab', { name: 'Render' })).toHaveAttribute('aria-selected', 'true');
    });
});

describe('Menu', () => {
    function MenuHarness({ onPick }: { onPick: (id: string) => void }) {
        return (
            <Menu
                items={[
                    { id: 'stl', label: 'STL', onSelect: () => onPick('stl') },
                    { id: 'dxf', label: 'DXF', disabled: true, onSelect: () => onPick('dxf') },
                    { id: 'sep', separator: true },
                    { id: 'step', label: 'STEP', onSelect: () => onPick('step') },
                ]}
                trigger={(p) => <Button {...p}>Export</Button>}
            />
        );
    }

    it('opens from the keyboard, skips disabled items, selects and returns focus', async () => {
        const onPick = vi.fn();
        render(<MenuHarness onPick={onPick} />);
        const trigger = screen.getByRole('button', { name: 'Export' });
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        trigger.focus();
        await userEvent.keyboard('{ArrowDown}');
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('menuitem', { name: 'STL' })).toHaveFocus();
        await userEvent.keyboard('{ArrowDown}');
        expect(screen.getByRole('menuitem', { name: 'STEP' })).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        expect(onPick).toHaveBeenCalledWith('step');
        expect(screen.queryByRole('menu')).toBeNull();
        expect(trigger).toHaveFocus();
    });

    it('closes on Escape and on a click outside', async () => {
        render(
            <>
                <MenuHarness onPick={() => undefined} />
                <p>outside</p>
            </>,
        );
        const trigger = screen.getByRole('button', { name: 'Export' });
        await userEvent.click(trigger);
        expect(screen.getByRole('menu')).toBeInTheDocument();
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).toBeNull();
        expect(trigger).toHaveFocus();
        await userEvent.click(trigger);
        await userEvent.click(screen.getByText('outside'));
        expect(screen.queryByRole('menu')).toBeNull();
    });
});

describe('Sheet', () => {
    function SheetHarness({ side }: { side: 'right' | 'bottom' }) {
        const [open, setOpen] = useState(false);
        return (
            <>
                <Button onClick={() => setOpen(true)}>Open</Button>
                <Sheet open={open} side={side} title="Revisions" onClose={() => setOpen(false)}>
                    <Button>Inside</Button>
                </Sheet>
            </>
        );
    }

    it('is a labelled modal dialog that traps focus, closes on Esc and returns focus', async () => {
        render(<SheetHarness side="right" />);
        const opener = screen.getByRole('button', { name: 'Open' });
        await userEvent.click(opener);
        const dialog = screen.getByRole('dialog', { name: 'Revisions' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        const close = screen.getByRole('button', { name: 'Close' });
        expect(close).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();
        await userEvent.tab();
        expect(close).toHaveFocus(); // wrapped, did not leave the sheet
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(opener).toHaveFocus();
    });

    it('bottom sheet has a keyboard-resizable handle with snap points', async () => {
        render(<SheetHarness side="bottom" />);
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const handle = screen.getByRole('slider', { name: 'Sheet height' });
        expect(handle).toHaveAttribute('aria-valuenow', '55');
        handle.focus();
        await userEvent.keyboard('{ArrowUp}');
        expect(handle).toHaveAttribute('aria-valuenow', '90');
        await userEvent.keyboard('{Home}');
        expect(handle).toHaveAttribute('aria-valuenow', '25');
    });
});

describe('Toast', () => {
    function ToastHarness() {
        const toast = useToast();
        return (
            <>
                <button onClick={() => toast.show({ tone: 'success', title: 'Saved' })}>ok</button>
                <button
                    onClick={() =>
                        toast.show({ tone: 'error', title: 'Export failed', action: { label: 'Retry', onClick: () => undefined } })
                    }
                >
                    fail
                </button>
            </>
        );
    }

    it('success leaves after 2 s; an error stays until dismissed', () => {
        vi.useFakeTimers();
        render(
            <ToastProvider>
                <ToastHarness />
            </ToastProvider>,
        );
        fireEvent.click(screen.getByText('ok'));
        fireEvent.click(screen.getByText('fail'));
        expect(screen.getByRole('status')).toHaveTextContent('Saved');
        expect(screen.getByRole('alert')).toHaveTextContent('Export failed');
        act(() => vi.advanceTimersByTime(2100));
        expect(screen.queryByText('Saved')).toBeNull();
        act(() => vi.advanceTimersByTime(60_000));
        expect(screen.getByText('Export failed')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(screen.queryByText('Export failed')).toBeNull();
    });

    it('useToast outside a provider fails loudly', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(() => render(<ToastHarness />)).toThrow(/ToastProvider/);
        spy.mockRestore();
    });
});

describe('NumberInput', () => {
    function NumberHarness({ onChange }: { onChange: (v: number) => void }) {
        const [v, setV] = useState(50);
        return (
            <NumberInput
                aria-label="Plate width"
                value={v}
                min={10}
                max={100}
                step={1}
                unit="mm"
                onChange={(n) => {
                    setV(n);
                    onChange(n);
                }}
            />
        );
    }

    it('exposes a spinbutton with value, range and unit', () => {
        render(<NumberHarness onChange={() => undefined} />);
        const input = screen.getByRole('spinbutton', { name: 'Plate width' });
        expect(input).toHaveAttribute('aria-valuenow', '50');
        expect(input).toHaveAttribute('aria-valuemin', '10');
        expect(input).toHaveAttribute('aria-valuetext', '50 mm');
    });

    it('commits on Enter with clamping, reverts on Esc and rejects text', async () => {
        const onChange = vi.fn();
        render(<NumberHarness onChange={onChange} />);
        const input = screen.getByRole('spinbutton', { name: 'Plate width' }) as HTMLInputElement;
        await userEvent.clear(input);
        await userEvent.type(input, '500{Enter}');
        expect(onChange).toHaveBeenLastCalledWith(100);
        expect(input.value).toBe('100');
        await userEvent.clear(input);
        await userEvent.type(input, '42{Escape}');
        expect(input.value).toBe('100');
        await userEvent.clear(input);
        await userEvent.type(input, 'wide{Enter}');
        expect(input.value).toBe('100');
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('steps with arrows (Shift ×10)', async () => {
        const onChange = vi.fn();
        render(<NumberHarness onChange={onChange} />);
        const input = screen.getByRole('spinbutton', { name: 'Plate width' });
        input.focus();
        await userEvent.keyboard('{ArrowUp}');
        expect(onChange).toHaveBeenLastCalledWith(51);
        await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
        expect(onChange).toHaveBeenLastCalledWith(41);
    });
});

describe('SliderField', () => {
    function FieldHarness() {
        const [v, setV] = useState(60);
        return <SliderField label="Plate width" value={v} onChange={setV} min={20} max={120} unit="mm" defaultValue={50} />;
    }

    it('names the slider and field by the label, and resets to the default', async () => {
        render(<FieldHarness />);
        const slider = screen.getByRole('slider', { name: 'Plate width' });
        expect(slider).toHaveAttribute('aria-valuetext', '60 mm');
        expect(screen.getByRole('spinbutton', { name: 'Plate width' })).toBeInTheDocument();
        fireEvent.change(slider, { target: { value: '70' } });
        expect(screen.getByRole('spinbutton', { name: 'Plate width' })).toHaveValue('70');
        await userEvent.click(screen.getByRole('button', { name: 'Reset Plate width to 50 mm' }));
        expect(slider).toHaveAttribute('aria-valuetext', '50 mm');
        expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull();
    });
});

describe('states and surfaces', () => {
    it('ErrorState says what happened, offers a retry and a copyable id', async () => {
        const onRetry = vi.fn();
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        render(<ErrorState title="Not found" description="Check the link." onRetry={onRetry} errorId="req_1" />);
        expect(screen.getByRole('alert')).toHaveTextContent('Not found');
        await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetry).toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button', { name: 'Copy error id req_1' }));
        expect(writeText).toHaveBeenCalledWith('req_1');
        expect(await screen.findByRole('button', { name: 'Error id copied' })).toBeInTheDocument();
    });

    it('EmptyState renders title, sentence and actions', () => {
        render(<EmptyState title="No projects yet" description="Start one." action={<Button>Start</Button>} />);
        expect(screen.getByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });

    it('Skeletons are one status region with hidden blocks', () => {
        render(<SkeletonCard label="Loading gallery" />);
        const region = screen.getByRole('status', { name: 'Loading gallery' });
        const blocks = region.querySelectorAll('[data-skeleton]');
        expect(blocks.length).toBeGreaterThan(0);
        blocks.forEach((b) => expect(b).toHaveAttribute('aria-hidden', 'true'));
    });

    it('Panel is a region named by its title; Badge carries its tone', () => {
        render(
            <Panel title="Customize">
                <Badge tone="ok">Verified</Badge>
            </Panel>,
        );
        expect(screen.getByRole('region', { name: 'Customize' })).toBeInTheDocument();
        expect(screen.getByText('Verified').closest('[data-tone]')).toHaveAttribute('data-tone', 'ok');
    });
});
