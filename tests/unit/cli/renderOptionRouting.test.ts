// #394 regression: `render` (composite mode) declares --width/--height/
// --focus/--hide for itself AND has an `inspect` subcommand declaring the
// same flags. Without positional options, commander let the parent greedily
// claim those flags even when written after `render inspect <file> <outDir>`,
// so the inspect action silently never received them — `--focus drum` and
// `--width 2048` were no-ops while subcommand-unique flags (--channels)
// worked, which made the drop look like a renderer bug.
//
// The test wires the PRODUCTION command tree (renderCommand() under a
// program with enablePositionalOptions, mirroring src/agent/cli/index.ts)
// and replaces the inspect action handler with a spy — commander's
// .action() overrides the registered handler — so parsing runs the real
// flag definitions and routing without launching a browser.
import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { renderCommand } from '../../../src/agent/cli/commands/render';

function buildProgramWithSpy(): {
  program: Command;
  captured: { file?: string; outDir?: string; opts?: Record<string, unknown> };
} {
  const captured: { file?: string; outDir?: string; opts?: Record<string, unknown> } = {};
  const program = new Command()
    .name('kernelcad')
    .enablePositionalOptions()
    .exitOverride();
  const render = renderCommand();
  const inspect = render.commands.find((c) => c.name() === 'inspect');
  if (!inspect) throw new Error('inspect subcommand not found');
  inspect.action((file: string, outDir: string, opts: Record<string, unknown>) => {
    captured.file = file;
    captured.outDir = outDir;
    captured.opts = opts;
  });
  program.addCommand(render);
  return { program, captured };
}

describe('render inspect option routing (#394)', () => {
  it('delivers --focus, --width and --channels written after the subcommand', async () => {
    const { program, captured } = buildProgramWithSpy();
    await program.parseAsync([
      'node', 'kernelcad', 'render', 'inspect', 'model.kcad.ts', '/tmp/out',
      '--focus', 'drum', '--width', '2048', '--channels', 'rgb,depth',
    ]);
    expect(captured.file).toBe('model.kcad.ts');
    expect(captured.outDir).toBe('/tmp/out');
    expect(captured.opts?.focus).toBe('drum');
    expect(captured.opts?.width).toBe(2048);
    expect(captured.opts?.channels).toBe('rgb,depth');
  });

  it('delivers --hide and --height regardless of flag order', async () => {
    const { program, captured } = buildProgramWithSpy();
    await program.parseAsync([
      'node', 'kernelcad', 'render', 'inspect', 'model.kcad.ts', '/tmp/out',
      '--channels', 'rgb', '--hide', 'cap,wall', '--height', '512',
    ]);
    expect(captured.opts?.hide).toBe('cap,wall');
    expect(captured.opts?.height).toBe(512);
  });
});
