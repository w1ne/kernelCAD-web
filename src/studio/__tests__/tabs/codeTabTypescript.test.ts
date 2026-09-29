// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * The Studio Code tab must show zero TypeScript diagnostics on valid
 * `.kcad.ts` scripts and still flag real mistakes.
 *
 * The check runs the real TypeScript language service over the same inputs the
 * Monaco worker gets: the generated kernel typings (`scripts/editorTypings.ts`)
 * as a lib, `KCAD_EDITOR_COMPILER_OPTIONS`, and the script wrapped by
 * `wrapKcadScript`. The "Monaco defaults" case reproduces the old setup (raw
 * text, no kernel typings), which flagged `return` and every DSL call.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { buildEditorTypings } from '../../../../scripts/editorTypings';
import { STARTERS, starterCode, studioStarterCode } from '../../start/starterModels';
import {
    KCAD_CHECK_MODEL_PATH,
    KCAD_DIAGNOSTICS_OWNER,
    KCAD_EDITOR_COMPILER_OPTIONS,
    KCAD_EDITOR_TYPINGS_PATH,
    KCAD_SCRIPT_PREFIX,
    attachKcadDiagnostics,
    configureKcadTypescript,
    unwrapDiagnosticRange,
    wrapKcadScript,
    type MonacoTypescriptHostLike,
    type TsDiagnosticLike,
} from '../../tabs/codeTabTypescript';

const REPO_ROOT = join(__dirname, '../../../..');

let typings = '';

beforeAll(() => {
    typings = buildEditorTypings(REPO_ROOT);
}, 120_000);

interface Found {
    code: number;
    message: string;
    text: string;
}

function languageService(files: Record<string, string>, options: ts.CompilerOptions): ts.LanguageService {
    const host: ts.LanguageServiceHost = {
        getScriptFileNames: () => Object.keys(files),
        getScriptVersion: () => '1',
        getScriptSnapshot: (f) => {
            const text = files[f] ?? (ts.sys.fileExists(f) ? ts.sys.readFile(f) : undefined);
            return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
        },
        getCurrentDirectory: () => '/',
        getCompilationSettings: () => options,
        getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
        fileExists: (f) => files[f] !== undefined || ts.sys.fileExists(f),
        readFile: (f) => files[f] ?? ts.sys.readFile(f),
    };
    return ts.createLanguageService(host);
}

function diagnosticsOf(ls: ts.LanguageService, file: string): ts.Diagnostic[] {
    return [...ls.getSyntacticDiagnostics(file), ...ls.getSemanticDiagnostics(file)];
}

/** Diagnostics the Code tab shows for `code` (the fixed setup). */
function codeTabDiagnostics(code: string): Found[] {
    const ls = languageService(
        { '/kernelcad-dsl.d.ts': typings, '/kcad-script-check.ts': wrapKcadScript(code) },
        { ...KCAD_EDITOR_COMPILER_OPTIONS } as ts.CompilerOptions,
    );
    const found: Found[] = [];
    for (const d of diagnosticsOf(ls, '/kcad-script-check.ts')) {
        const range = unwrapDiagnosticRange(d as TsDiagnosticLike, code.length);
        if (!range) continue;
        found.push({
            code: d.code,
            message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
            text: code.slice(range.start, range.end),
        });
    }
    return found;
}

/** Diagnostics Monaco's default TypeScript setup showed (the old Code tab). */
function monacoDefaultDiagnostics(code: string): number[] {
    const ls = languageService(
        { '/model.ts': code },
        { allowNonTsExtensions: true, target: ts.ScriptTarget.Latest },
    );
    return diagnosticsOf(ls, '/model.ts').map((d) => d.code);
}

const EXAMPLES = [
    'examples/bracket-with-hole.kcad.ts',
    'examples/gallery/turbojet-engine.kcad.ts',
    'examples/v0.21/donut.kcad.ts',
    'tests/e2e/fixtures/twisted-blade.kcad.ts',
];

describe('Code tab TypeScript checking', () => {
    it('the compiler options match the TypeScript enums they name', () => {
        expect(KCAD_EDITOR_COMPILER_OPTIONS.target).toBe(ts.ScriptTarget.ES2022);
        expect(KCAD_EDITOR_COMPILER_OPTIONS.module).toBe(ts.ModuleKind.ESNext);
        expect(KCAD_EDITOR_COMPILER_OPTIONS.moduleDetection).toBe(ts.ModuleDetectionKind.Force);
    });

    it('Monaco defaults flag a valid script (the old setup)', () => {
        const codes = monacoDefaultDiagnostics(studioStarterCode(STARTERS[0]));
        expect(codes).toContain(1108); // top-level return
        expect(codes).toContain(2304); // Cannot find name 'box'
    });

    it('shows no diagnostics on a top-level return', () => {
        expect(codeTabDiagnostics('return box(40, 30, 10);')).toEqual([]);
    });

    it.each(STARTERS.map((s) => [s.id, s] as const))('shows no diagnostics on the %s starter', (_id, starter) => {
        expect(codeTabDiagnostics(starterCode(starter))).toEqual([]);
        expect(codeTabDiagnostics(studioStarterCode(starter))).toEqual([]);
    });

    it.each(EXAMPLES)('shows no diagnostics on %s', (file) => {
        expect(codeTabDiagnostics(readFileSync(join(REPO_ROOT, file), 'utf8'))).toEqual([]);
    });

    it('accepts the module-style forms the runtime accepts', () => {
        const script = [
            "import { box } from 'kernelcad';",
            'export const size = await Promise.resolve(20);',
            'export default box(size, size, size);',
        ].join('\n');
        expect(codeTabDiagnostics(script)).toEqual([]);
    });

    it('flags a misspelled DSL call, on the misspelled name', () => {
        const found = codeTabDiagnostics('const w = param("width", 40);\nreturn boxx(w, 2, 3);');
        expect(found).toHaveLength(1);
        expect(found[0].code).toBe(2552); // Cannot find name 'boxx'. Did you mean 'box'?
        expect(found[0].text).toBe('boxx');
    });

    it('flags a wrong argument type inside the returned expression', () => {
        const found = codeTabDiagnostics("return box('a', 2, 3);");
        expect(found.map((f) => f.code)).toEqual([2345]);
        expect(found[0].text).toBe("'a'");
    });
});

describe('wrapKcadScript', () => {
    it('keeps every body offset equal to the editor offset', () => {
        const script = "import x from 'y';\nexport { a };\nexport default function f() {}\nexport const a = 1;\nexport default box(1, 2, 3);\n";
        const wrapped = wrapKcadScript(script);
        const body = wrapped.slice(KCAD_SCRIPT_PREFIX.length, KCAD_SCRIPT_PREFIX.length + script.length);
        expect(body.length).toBe(script.length);
        expect(body.split('\n').map((l) => l.trim().replace(/\s+/g, ' '))).toEqual([
            '', '', 'function f() {}', 'const a = 1;', 'return box(1, 2, 3);', '',
        ]);
    });
});

function fakeMonaco(worker: { syntactic: TsDiagnosticLike[]; semantic: TsDiagnosticLike[] }) {
    const text = { value: 'return boxx(1, 2, 3);' };
    const listeners: Array<() => void> = [];
    const editorModel = {
        getValue: () => text.value,
        setValue: vi.fn(),
        getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
        onDidChangeContent: (cb: () => void) => {
            listeners.push(cb);
            return { dispose: vi.fn() };
        },
        isDisposed: () => false,
        dispose: vi.fn(),
        uri: 'inmemory://model/1',
    };
    const checkModel = { ...editorModel, setValue: vi.fn(), dispose: vi.fn(), uri: KCAD_CHECK_MODEL_PATH };
    const defaults = {
        setCompilerOptions: vi.fn(),
        setDiagnosticsOptions: vi.fn(),
        addExtraLib: vi.fn(),
    };
    const setModelMarkers = vi.fn();
    const monaco: MonacoTypescriptHostLike = {
        languages: {
            typescript: {
                typescriptDefaults: defaults,
                getTypeScriptWorker: async () => async () => ({
                    getSyntacticDiagnostics: async () => worker.syntactic,
                    getSemanticDiagnostics: async () => worker.semantic,
                }),
            },
        },
        Uri: { parse: (v: string) => v },
        editor: {
            createModel: vi.fn(() => checkModel),
            getModel: () => null,
            setModelMarkers,
            MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 },
        },
    };
    return { monaco, defaults, setModelMarkers, checkModel, editor: { getModel: () => editorModel }, listeners };
}

describe('configureKcadTypescript + attachKcadDiagnostics', () => {
    it('sets the options, loads the typings once and turns off raw-text diagnostics', async () => {
        const { monaco, defaults } = fakeMonaco({ syntactic: [], semantic: [] });
        const load = vi.fn(async () => 'declare const box: any;');
        await expect(configureKcadTypescript(monaco, load)).resolves.toBe(true);
        await configureKcadTypescript(monaco, load);
        expect(load).toHaveBeenCalledTimes(1);
        expect(defaults.setCompilerOptions).toHaveBeenCalledWith({ ...KCAD_EDITOR_COMPILER_OPTIONS });
        expect(defaults.setDiagnosticsOptions).toHaveBeenCalledWith({ noSemanticValidation: true, noSyntaxValidation: true });
        expect(defaults.addExtraLib).toHaveBeenCalledWith('declare const box: any;', KCAD_EDITOR_TYPINGS_PATH);
    });

    it('maps worker diagnostics on the wrapped script back onto the editor', async () => {
        vi.useFakeTimers();
        try {
            const start = KCAD_SCRIPT_PREFIX.length + 'return '.length;
            const { monaco, editor, setModelMarkers, checkModel } = fakeMonaco({
                syntactic: [],
                semantic: [
                    { start, length: 4, code: 2552, category: 1, messageText: "Cannot find name 'boxx'." },
                    { start: 3, length: 5, code: 9999, category: 1, messageText: 'in the wrapper' },
                ],
            });
            const handle = attachKcadDiagnostics(monaco, editor, Promise.resolve(true));
            await vi.runAllTimersAsync();
            expect(checkModel.setValue).toHaveBeenCalledWith(wrapKcadScript('return boxx(1, 2, 3);'));
            const [, owner, markers] = setModelMarkers.mock.calls.at(-1)!;
            expect(owner).toBe(KCAD_DIAGNOSTICS_OWNER);
            expect(markers).toEqual([expect.objectContaining({
                startLineNumber: 1, startColumn: 8, endColumn: 12, severity: 8, code: '2552',
            })]);
            handle.dispose();
            expect(checkModel.dispose).toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('reports nothing when the typings failed to load', async () => {
        vi.useFakeTimers();
        try {
            const { monaco, editor, setModelMarkers, listeners } = fakeMonaco({
                syntactic: [],
                semantic: [{ start: 40, length: 4, code: 2304, category: 1, messageText: 'x' }],
            });
            attachKcadDiagnostics(monaco, editor, Promise.resolve(false));
            await vi.runAllTimersAsync();
            listeners.forEach((cb) => cb());
            await vi.runAllTimersAsync();
            expect(setModelMarkers).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });
});
