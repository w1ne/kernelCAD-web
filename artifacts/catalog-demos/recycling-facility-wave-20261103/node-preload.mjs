// Node 22's module syntax detection treats the pinned Emscripten package as
// ambiguous. Its ESM source still expects CommonJS globals inside its Node
// filesystem hooks, so provide those globals only to local catalog commands.
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.require = createRequire(import.meta.url);
globalThis.__dirname = dirname(fileURLToPath(import.meta.resolve('replicad-opencascadejs')));
