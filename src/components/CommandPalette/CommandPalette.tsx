import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command as CommandIcon } from 'lucide-react';
import { useCommandRegistry } from '../../hooks/useCommandRegistry';

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const { commands } = useCommandRegistry();

    // Toggle with Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);

        // Expose for testing
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).openCommandPalette = () => setOpen(true);
        }

        return () => {
            document.removeEventListener('keydown', down);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).openCommandPalette;
        };
    }, []);

    // Group commands
    const groupedCommands = commands.reduce((acc, cmd) => {
        const section = cmd.section || 'General';
        if (!acc[section]) acc[section] = [];
        acc[section].push(cmd);
        return acc;
    }, {} as Record<string, typeof commands>);

    return (
        <>
            {/* mounting marker for E2E tests */}
            <div data-testid="command-palette-mounted" style={{ display: 'none' }} />

            <AnimatePresence>
                {open && (
                    <Command.Dialog
                        open={open}
                        onOpenChange={setOpen}
                        label="Global Command Menu"
                        className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
                    >
                        {/* Backdrop with Blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                        />

                        {/* Main Palette */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
                            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-xl"
                        >
                            <DialogTitle className="sr-only">Command Palette</DialogTitle>
                            <DialogDescription className="sr-only">
                                Search and run available kernelCAD commands.
                            </DialogDescription>

                            <div className="flex items-center border-b border-white/10 px-4">
                                <Search className="mr-2 h-5 w-5 text-zinc-500" />
                                <Command.Input
                                    placeholder="Type a command or search..."
                                    className="flex-1 bg-transparent py-4 text-lg text-white placeholder-zinc-500 outline-none"
                                />
                                <div className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                                    <span className="text-xs">ESC</span>
                                </div>
                            </div>
                            {/* ... existing List content ... */}
                            <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
                                <Command.Empty className="py-6 text-center text-sm text-zinc-500">
                                    No commands found.
                                </Command.Empty>

                                {Object.entries(groupedCommands).map(([section, cmds]) => (
                                    <Command.Group key={section} heading={section} className="mb-2">
                                        <div className="mb-1 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            {section}
                                        </div>
                                        {cmds.map((cmd) => (
                                            <Command.Item
                                                key={cmd.id}
                                                value={`${cmd.label} ${section}`} // Helping fuzzy search
                                                onSelect={() => {
                                                    setOpen(false);
                                                    // Execute action after a microtask to allow palette to start closing
                                                    setTimeout(() => cmd.action(), 0);
                                                }}
                                                className="group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/10 aria-selected:bg-selection-blue/20 aria-selected:text-selection-blue"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {cmd.icon || <CommandIcon className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 group-aria-selected:text-selection-blue" />}
                                                    <span>{cmd.label}</span>
                                                </div>
                                                {cmd.shortcut && (
                                                    <span className="text-xs font-mono text-zinc-500 group-aria-selected:text-selection-blue/70">
                                                        {cmd.shortcut}
                                                    </span>
                                                )}
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                ))}
                            </Command.List>
                        </motion.div>
                    </Command.Dialog>
                )}
            </AnimatePresence>
        </>
    );
}
