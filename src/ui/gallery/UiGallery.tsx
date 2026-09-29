// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useLayoutEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import {
    Box,
    ChevronDown,
    Download,
    FolderOpen,
    Grid3x3,
    Paintbrush,
    Play,
    Redo2,
    Scissors,
    Share2,
    Sparkles,
    Trash2,
    Undo2,
} from 'lucide-react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { contrastRatio } from '../contrast';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { IconButton } from '../IconButton';
import { Kbd } from '../Kbd';
import { Menu } from '../Menu';
import { NumberInput } from '../NumberInput';
import { Panel } from '../Panel';
import { Sheet } from '../Sheet';
import { SkeletonCard, SkeletonList, SkeletonText } from '../Skeleton';
import { SliderField } from '../SliderField';
import { TabPanel, Tabs } from '../Tabs';
import type { Theme } from '../theme';
import { ToastProvider } from '../Toast';
import { useToast } from '../toastContext';

/**
 * Every src/ui primitive in both themes, for design review and screenshots.
 * Mounted at /ui-gallery (dev builds, or ?ui=gallery in production).
 */
export function UiGallery(): JSX.Element {
    return (
        <main className="min-h-screen bg-bg font-sans text-fg">
            <header className="border-b border-border px-4 py-6 sm:px-8">
                <h1 className="font-serif text-section">UI primitives</h1>
                <p className="mt-1 max-w-2xl text-body text-fg-2">
                    Shared components from <code className="font-mono text-code-lg">src/ui</code> in the light (vellum)
                    and dark (workbench) themes. Use Tab to check focus rings and keyboard paths.
                </p>
            </header>
            <div className="grid xl:grid-cols-2">
                <ThemeSection theme="light" title="Light · vellum" />
                <ThemeSection theme="dark" title="Dark · workbench" />
            </div>
        </main>
    );
}

function ThemeSection({ theme, title }: { readonly theme: Theme; readonly title: string }): JSX.Element {
    return (
        <section data-theme={theme} data-testid={`gallery-${theme}`} className="min-w-0 bg-bg px-4 py-8 text-fg sm:px-8">
            <ToastProvider>
                <h2 className="font-serif text-heading">{title}</h2>
                <div className="mt-6 flex flex-col gap-10">
                    <Group title="Colour tokens">
                        <Swatches />
                    </Group>
                    <Group title="Type scale">
                        <TypeScale />
                    </Group>
                    <Group title="Buttons">
                        <Buttons />
                    </Group>
                    <Group title="Icon buttons, tooltips, shortcuts">
                        <IconButtons />
                    </Group>
                    <Group title="Badges">
                        <div className="flex flex-wrap gap-2">
                            <Badge tone="ok">Verified</Badge>
                            <Badge tone="accent" dot>
                                Live
                            </Badge>
                            <Badge>Public by link</Badge>
                            <Badge tone="warn">Stale</Badge>
                            <Badge tone="danger">2 errors</Badge>
                            <Badge tone="agent" icon={<Sparkles />}>
                                Staged by agent
                            </Badge>
                        </div>
                    </Group>
                    <Group title="Tabs">
                        <TabsDemo idPrefix={theme} />
                    </Group>
                    <Group title="Panel, sliders and number fields">
                        <ParamsDemo />
                    </Group>
                    <Group title="Menu and sheets">
                        <MenuSheetDemo />
                    </Group>
                    <Group title="Toasts">
                        <ToastDemo />
                    </Group>
                    <Group title="Skeletons">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <SkeletonCard />
                            <SkeletonCard />
                            <div className="col-span-2 flex flex-col gap-4 sm:col-span-1">
                                <SkeletonList rows={3} />
                                <SkeletonText lines={3} />
                            </div>
                        </div>
                    </Group>
                    <Group title="Empty and error states">
                        <div className="grid gap-3 md:grid-cols-2">
                            <Panel>
                                <EmptyState
                                    icon={<FolderOpen />}
                                    title="No projects yet"
                                    description="Connect your agent or start a model in Studio. Your projects show here."
                                    action={<Button variant="primary">Start in Studio</Button>}
                                    secondaryAction={<Button variant="ghost">Copy MCP URL</Button>}
                                />
                            </Panel>
                            <Panel>
                                <ErrorState
                                    title="This project does not exist or is private"
                                    description="Check the link, or open the gallery to find a public model."
                                    onRetry={() => undefined}
                                    secondaryAction={<Button variant="ghost">Open gallery</Button>}
                                    errorId="req_7f3a91c2"
                                />
                            </Panel>
                        </div>
                    </Group>
                </div>
            </ToastProvider>
        </section>
    );
}

function Group({ title, children }: { readonly title: string; readonly children: ReactNode }): JSX.Element {
    return (
        <div>
            <h3 className="mb-3 text-2xs font-semibold uppercase tracking-wider text-fg-3">{title}</h3>
            {children}
        </div>
    );
}

const TEXT_TOKENS = ['fg', 'fg-2', 'fg-3', 'accent', 'agent-fg', 'ok', 'warn', 'danger'] as const;
const FILL_TOKENS = ['bg', 'surface-1', 'surface-2', 'surface-3', 'border', 'border-strong', 'accent', 'agent'] as const;

/** Reads the live token values so the printed ratios match what renders. */
function Swatches(): JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    useLayoutEffect(() => {
        if (!ref.current) return;
        const cs = getComputedStyle(ref.current);
        const all = [...new Set([...TEXT_TOKENS, ...FILL_TOKENS])];
        setValues(Object.fromEntries(all.map((t) => [t, cs.getPropertyValue(`--kc-${t}`).trim()])));
    }, []);
    const ratio = (fg: string): string => {
        const a = values[fg];
        const b = values.bg;
        if (!a || !b) return '';
        return `${contrastRatio(a, b).toFixed(1)}:1`;
    };
    return (
        <div ref={ref} className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {FILL_TOKENS.map((t) => (
                    <div key={t} className="flex flex-col gap-1">
                        <div className="h-10 rounded-control border border-border" style={{ background: `var(--kc-${t})` }} />
                        <span className="truncate font-mono text-2xs text-fg-2">{t}</span>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TEXT_TOKENS.map((t) => (
                    <div key={t} className="rounded-control border border-border px-2 py-1.5">
                        <span className="text-ui font-medium" style={{ color: `var(--kc-${t})` }}>
                            text-{t}
                        </span>
                        <span className="block font-mono text-2xs text-fg-3">{ratio(t)} on bg</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TypeScale(): JSX.Element {
    return (
        <div className="flex flex-col gap-2">
            <p lang="en" className="font-serif text-display hyphens-auto">
                Manufacturable
            </p>
            <p className="font-serif text-section">Section heading 32</p>
            <p className="font-serif text-heading">Page title 22</p>
            <p className="text-title">Panel title 18</p>
            <p className="text-body">Body 15: public pages and chat messages.</p>
            <p className="text-ui">UI 13: workbench body, inputs and buttons.</p>
            <p className="text-xs">XS 12: dense lists and tab labels.</p>
            <p className="text-2xs">2XS 11: badges and the status bar (minimum size).</p>
            <p className="font-mono text-code-lg">plateW = param(50, {'{'} unit: &apos;mm&apos; {'}'})</p>
        </div>
    );
}

function Buttons(): JSX.Element {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" leadingIcon={<Download className="size-4" strokeWidth={1.75} />}>
                    Download STL
                </Button>
                <Button>Open in Studio</Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="danger" leadingIcon={<Trash2 className="size-4" strokeWidth={1.75} />}>
                    Delete
                </Button>
                <Button variant="agent" leadingIcon={<Sparkles className="size-4" strokeWidth={1.75} />}>
                    Ask agent
                </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary">
                    Small 28
                </Button>
                <Button size="md" variant="primary">
                    Medium 32
                </Button>
                <Button size="lg" variant="primary">
                    Large 40
                </Button>
                <Button variant="primary" loading>
                    Exporting
                </Button>
                <Button disabled>Disabled</Button>
            </div>
        </div>
    );
}

function IconButtons(): JSX.Element {
    const [section, setSection] = useState(true);
    return (
        <div className="flex flex-wrap items-center gap-1">
            <IconButton label="Undo" shortcut={['Mod', 'Z']} icon={<Undo2 className="size-4" strokeWidth={1.75} />} />
            <IconButton label="Redo" shortcut={['Mod', 'Shift', 'Z']} icon={<Redo2 className="size-4" strokeWidth={1.75} />} />
            <IconButton
                label="Section"
                shortcut={['S']}
                description="Cut the model with a plane"
                pressed={section}
                onClick={() => setSection((v) => !v)}
                icon={<Scissors className="size-4" strokeWidth={1.75} />}
            />
            <IconButton label="Grid" shortcut={['G']} icon={<Grid3x3 className="size-4" strokeWidth={1.75} />} />
            <IconButton label="Run" shortcut={['Mod', 'Enter']} variant="primary" icon={<Play className="size-4" strokeWidth={1.75} />} />
            <IconButton
                label="Mark for agent"
                shortcut={['B']}
                variant="agent"
                icon={<Paintbrush className="size-4" strokeWidth={1.75} />}
            />
            <IconButton label="Share" size="touch" variant="secondary" icon={<Share2 className="size-5" strokeWidth={1.75} />} />
            <span className="ml-3 inline-flex items-center gap-2 text-ui text-fg-2">
                Palette <Kbd keys={['Mod', 'K']} />
            </span>
        </div>
    );
}

const TAB_ITEMS = [
    { id: 'code', label: 'Code' },
    { id: 'params', label: 'Params' },
    { id: 'checks', label: 'Checks', count: 2 },
    { id: 'joints', label: 'Joints' },
    { id: 'animation', label: 'Animation' },
    { id: 'sections', label: 'Sections', available: false },
    { id: 'render', label: 'Render', available: false },
] as const;

function TabsDemo({ idPrefix }: { readonly idPrefix: string }): JSX.Element {
    const [tab, setTab] = useState('params');
    const id = `${idPrefix}-inspector`;
    return (
        <Panel flush>
            <Tabs id={id} label="Inspector" items={TAB_ITEMS} value={tab} onChange={setTab} maxVisible={4} className="px-2" />
            {TAB_ITEMS.map((t) => (
                <TabPanel key={t.id} tabsId={id} id={t.id} value={tab} className="p-4 text-ui text-fg-2">
                    {t.label} panel. Arrow keys move between tabs; hidden tabs are not shown.
                </TabPanel>
            ))}
        </Panel>
    );
}

function ParamsDemo(): JSX.Element {
    const [w, setW] = useState(60);
    const [bore, setBore] = useState(30.2);
    const [h, setH] = useState(20);
    const [angle, setAngle] = useState(45);
    return (
        <Panel
            title="Customize"
            actions={
                <Button size="sm" variant="ghost">
                    Reset all
                </Button>
            }
        >
            <div className="flex flex-col gap-2">
                <SliderField label="Plate width" value={w} onChange={setW} min={20} max={120} step={1} unit="mm" defaultValue={50} />
                <SliderField label="Bore Ø" value={bore} onChange={setBore} min={5} max={60} step={0.1} unit="mm" defaultValue={30.2} />
                <SliderField label="Ring height" value={h} onChange={setH} min={5} max={40} step={0.5} unit="mm" defaultValue={20} />
                <div className="mt-2 flex items-center gap-2">
                    <label htmlFor="gallery-angle" className="text-ui text-fg-2">
                        Draft angle
                    </label>
                    <NumberInput id="gallery-angle" className="w-24" value={angle} onChange={setAngle} min={0} max={90} step={0.5} unit="°" />
                </div>
            </div>
        </Panel>
    );
}

function MenuSheetDemo(): JSX.Element {
    const [sheet, setSheet] = useState<'right' | 'bottom' | null>(null);
    const toast = useToast();
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Menu
                items={[
                    { id: 'stl', label: 'STL', icon: <Box />, shortcut: ['Mod', 'E'], onSelect: () => toast.show({ tone: 'success', title: 'Exported bracket.stl' }) },
                    { id: 'step', label: 'STEP', icon: <Box />, onSelect: () => toast.show({ tone: 'success', title: 'Exported bracket.step' }) },
                    { id: '3mf', label: '3MF', icon: <Box />, onSelect: () => undefined },
                    { id: 'dxf', label: 'DXF (needs a section)', icon: <Box />, disabled: true, onSelect: () => undefined },
                    { id: 'sep', separator: true },
                    { id: 'delete', label: 'Delete project', icon: <Trash2 />, danger: true, onSelect: () => undefined },
                ]}
                trigger={(p) => (
                    <Button {...p} variant="primary" trailingIcon={<ChevronDown className="size-4" aria-hidden="true" />}>
                        Export
                    </Button>
                )}
            />
            <Button onClick={() => setSheet('right')}>Right sheet</Button>
            <Button onClick={() => setSheet('bottom')}>Bottom sheet</Button>
            <Sheet
                open={sheet !== null}
                side={sheet ?? 'right'}
                title={sheet === 'bottom' ? 'Customize' : 'Revisions'}
                onClose={() => setSheet(null)}
                footer={
                    <Button variant="primary" className="w-full" onClick={() => setSheet(null)}>
                        Done
                    </Button>
                }
            >
                <p className="text-ui text-fg-2">
                    Esc, the close button or the scrim close the sheet. Focus stays inside while it is open. The bottom
                    sheet snaps to 25, 55 and 90 % of the screen: drag the handle or use the arrow keys on it.
                </p>
            </Sheet>
        </div>
    );
}

function ToastDemo(): JSX.Element {
    const toast = useToast();
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => toast.show({ tone: 'success', title: 'Saved revision r6' })}>Success</Button>
            <Button
                onClick={() =>
                    toast.show({
                        tone: 'info',
                        title: 'Changed plateW 50 → 60',
                        action: { label: 'Undo', onClick: () => undefined },
                    })
                }
            >
                Info with action
            </Button>
            <Button
                variant="danger"
                onClick={() =>
                    toast.show({
                        tone: 'error',
                        title: 'Export failed',
                        description: 'DXF needs a planar section: add sectionView().',
                        action: { label: 'Retry', onClick: () => undefined },
                    })
                }
            >
                Error
            </Button>
        </div>
    );
}
