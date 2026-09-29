// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * TypeScript checking for the Studio Code tab.
 *
 * A `.kcad.ts` script is the BODY of a function: the runtime injects the
 * kernelCAD DSL (`param`, `box`, `cylinder`, `path`, ...) as globals and reads
 * the model from a top-level `return` (`kernel/backends/occt/worker.ts`,
 * `scripts/typecheckExamples.ts`). Monaco's default TypeScript setup checks the
 * editor text as a plain file, so it flagged valid scripts: TS1108 under every
 * top-level `return` and TS2304 "Cannot find name" under every DSL call.
 * Ignoring TS1108 is not enough — after that error the checker skips the whole
 * `return` expression, so a real mistake there would go unflagged.
 *
 * So the Code tab checks the script the way the evaluator runs it:
 *   - `configureKcadTypescript` loads the generated kernel API declarations
 *     (`virtual:kcad-editor-typings`, built by `scripts/editorTypings.ts` from
 *     `src/modeling/api.ts`) as an extra lib and turns off Monaco's built-in
 *     diagnostics for the raw editor text (hover and completion stay on);
 *   - `attachKcadDiagnostics` keeps a hidden model holding the script wrapped
 *     in an async function (`wrapKcadScript`), asks the TypeScript worker for
 *     its diagnostics and maps them back onto the editor as markers.
 * Real mistakes (`boxx(...)`, a wrong argument type) are still flagged.
 */

/** Compiler options for the Code tab. Numeric values are the TypeScript enum
 *  members named in the comments (Monaco takes the numbers). Every model is a
 *  module, so the visible script and its hidden wrapped copy do not collide. */
export const KCAD_EDITOR_COMPILER_OPTIONS = {
    target: 9, // ScriptTarget.ES2022
    module: 99, // ModuleKind.ESNext
    moduleDetection: 3, // ModuleDetectionKind.Force
    allowNonTsExtensions: true,
    noEmit: true,
    strict: false,
} as const;

export const KCAD_EDITOR_TYPINGS_PATH = 'file:///node_modules/@types/kernelcad-dsl/index.d.ts';
export const KCAD_CHECK_MODEL_PATH = 'file:///kcad-script-check.ts';
export const KCAD_DIAGNOSTICS_OWNER = 'kernelcad-typescript';

/** The evaluator runs the script as a function body; the check does too. */
export const KCAD_SCRIPT_PREFIX = 'async function __kcadScript() {\n';
export const KCAD_SCRIPT_SUFFIX = '\n}\n';

/**
 * Wrap a script as the function body the evaluator runs. Module-style lines the
 * runtime accepts (`normalizeUserScript`) are rewritten to their function-body
 * form with the SAME length, so an offset in the body is the offset in the
 * editor text:
 *   - `export default <expr>` → `return <expr>`
 *   - `export <decl>`         → `<decl>`
 *   - top-level `import ...` and `export { ... }` lines → blanked
 */
export function wrapKcadScript(code: string): string {
    const blank = (s: string) => s.replace(/[^\n]/g, ' ');
    const body = code
        .replace(/^[ \t]*import\b[^\n]*/gm, blank)
        .replace(/^[ \t]*export\s*\{[^}]*\}[^\n]*/gm, blank)
        .replace(
            /^([ \t]*)(export\s+default\s+)(?=(?:async\s+)?function\b|class\b)/gm,
            (_m, indent: string, kw: string) => indent + blank(kw),
        )
        .replace(/^([ \t]*)(export\s+default\s+)/gm, (_m, indent: string, kw: string) =>
            indent + 'return' + ' '.repeat(kw.length - 'return'.length))
        .replace(
            /^([ \t]*)(export\s+)(?=const\b|let\b|var\b|function\b|class\b|async\b)/gm,
            (_m, indent: string, kw: string) => indent + blank(kw),
        );
    return KCAD_SCRIPT_PREFIX + body + KCAD_SCRIPT_SUFFIX;
}

/** A TypeScript diagnostic as the Monaco TypeScript worker returns it. */
export interface TsDiagnosticLike {
    readonly start?: number;
    readonly length?: number;
    readonly code: number;
    readonly category: number; // 0 Warning, 1 Error, 2 Suggestion, 3 Message
    readonly messageText: string | TsMessageChainLike;
}

interface TsMessageChainLike {
    readonly messageText: string;
    readonly next?: readonly TsMessageChainLike[];
}

export function flattenMessageText(text: string | TsMessageChainLike, indent = 0): string {
    if (typeof text === 'string') return text;
    let out = `${'  '.repeat(indent)}${text.messageText}`;
    for (const next of text.next ?? []) out += `\n${flattenMessageText(next, indent + 1)}`;
    return out;
}

/** Map a diagnostic on the wrapped script to an editor text range. Returns
 *  `null` for diagnostics outside the user's code (the wrapper lines). */
export function unwrapDiagnosticRange(
    diagnostic: TsDiagnosticLike,
    codeLength: number,
): { start: number; end: number } | null {
    if (diagnostic.start === undefined) return null;
    const start = diagnostic.start - KCAD_SCRIPT_PREFIX.length;
    if (start < 0 || start > codeLength) return null;
    const end = Math.min(codeLength, start + Math.max(0, diagnostic.length ?? 0));
    return { start, end };
}

interface TypescriptWorkerLike {
    getSyntacticDiagnostics: (fileName: string) => Promise<TsDiagnosticLike[]>;
    getSemanticDiagnostics: (fileName: string) => Promise<TsDiagnosticLike[]>;
}

interface TypescriptApiLike {
    typescriptDefaults: {
        setCompilerOptions: (options: Record<string, unknown>) => void;
        setDiagnosticsOptions: (options: Record<string, unknown>) => void;
        addExtraLib: (content: string, filePath?: string) => unknown;
    };
    getTypeScriptWorker: () => Promise<(...uris: unknown[]) => Promise<TypescriptWorkerLike>>;
}

interface TextModelLike {
    getValue: () => string;
    setValue: (value: string) => void;
    getPositionAt: (offset: number) => { lineNumber: number; column: number };
    onDidChangeContent: (cb: () => void) => { dispose: () => void };
    isDisposed?: () => boolean;
    dispose: () => void;
    uri: unknown;
}

/** Monaco namespace shape this module reads. Newer Monaco exposes the
 *  TypeScript API as `monaco.typescript`; older as `monaco.languages.typescript`. */
export interface MonacoTypescriptHostLike {
    typescript?: TypescriptApiLike;
    languages?: { typescript?: TypescriptApiLike };
    Uri?: { parse: (value: string) => unknown };
    editor?: {
        createModel: (value: string, language: string, uri: unknown) => TextModelLike;
        getModel: (uri: unknown) => TextModelLike | null;
        setModelMarkers: (model: unknown, owner: string, markers: readonly unknown[]) => void;
        MarkerSeverity: { Hint: number; Info: number; Warning: number; Error: number };
    };
}

export interface KcadEditorLike {
    getModel: () => TextModelLike | null;
}

export type LoadEditorTypings = () => Promise<string>;

const loadBundledTypings: LoadEditorTypings = () =>
    import('virtual:kcad-editor-typings').then((mod) => mod.default);

function typescriptApi(monaco: MonacoTypescriptHostLike): TypescriptApiLike | undefined {
    return monaco.typescript ?? monaco.languages?.typescript;
}

const configured = new WeakMap<object, Promise<boolean>>();

/**
 * Configure Monaco's TypeScript defaults for `.kcad.ts` scripts. Call from
 * `beforeMount`. Idempotent per Monaco instance. Resolves `true` once the
 * kernel typings are loaded; `false` if they could not load (the editor then
 * shows no type diagnostics rather than false ones).
 */
export function configureKcadTypescript(
    monaco: MonacoTypescriptHostLike,
    loadTypings: LoadEditorTypings = loadBundledTypings,
): Promise<boolean> {
    const api = typescriptApi(monaco);
    if (!api) return Promise.resolve(false);
    const existing = configured.get(api);
    if (existing) return existing;

    const defaults = api.typescriptDefaults;
    defaults.setCompilerOptions({ ...KCAD_EDITOR_COMPILER_OPTIONS });
    // The raw editor text is not how the script runs; `attachKcadDiagnostics`
    // reports on the wrapped copy instead.
    defaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true });
    const ready = loadTypings().then(
        (typings) => {
            defaults.addExtraLib(typings, KCAD_EDITOR_TYPINGS_PATH);
            return true;
        },
        (err: unknown) => {
            console.warn('[kernelCAD] editor typings failed to load; type checking is off', err);
            return false;
        },
    );
    configured.set(api, ready);
    return ready;
}

const DIAGNOSTICS_DELAY_MS = 300;

/**
 * Report TypeScript diagnostics for the editor's script, checked as the
 * function body the evaluator runs. Call from `onMount` after
 * `configureKcadTypescript`. Returns a disposer.
 */
export function attachKcadDiagnostics(
    monaco: MonacoTypescriptHostLike,
    editor: KcadEditorLike,
    ready: Promise<boolean>,
): { dispose: () => void } {
    const api = typescriptApi(monaco);
    const model = editor.getModel();
    const monacoEditor = monaco.editor;
    if (!api || !model || !monacoEditor || !monaco.Uri) return { dispose: () => {} };

    const uri = monaco.Uri.parse(KCAD_CHECK_MODEL_PATH);
    const checkModel = monacoEditor.getModel(uri) ?? monacoEditor.createModel('', 'typescript', uri);
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let generation = 0;
    let typingsLoaded = false;

    const run = async (): Promise<void> => {
        const current = ++generation;
        const code = model.getValue();
        checkModel.setValue(wrapKcadScript(code));
        const getWorker = await api.getTypeScriptWorker();
        const worker = await getWorker(uri);
        const fileName = String(uri);
        const [syntactic, semantic] = await Promise.all([
            worker.getSyntacticDiagnostics(fileName),
            worker.getSemanticDiagnostics(fileName),
        ]);
        if (disposed || current !== generation || model.isDisposed?.()) return;
        const markers = [];
        for (const d of [...syntactic, ...semantic]) {
            const range = unwrapDiagnosticRange(d, code.length);
            if (!range) continue;
            const start = model.getPositionAt(range.start);
            const end = model.getPositionAt(range.end);
            markers.push({
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
                message: flattenMessageText(d.messageText),
                severity: d.category === 1
                    ? monacoEditor.MarkerSeverity.Error
                    : d.category === 0
                        ? monacoEditor.MarkerSeverity.Warning
                        : monacoEditor.MarkerSeverity.Info,
                code: String(d.code),
                source: 'ts',
            });
        }
        monacoEditor.setModelMarkers(model, KCAD_DIAGNOSTICS_OWNER, markers);
    };
    const schedule = (): void => {
        if (!typingsLoaded || disposed) return;
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            run().catch((err: unknown) => {
                console.warn('[kernelCAD] editor type check failed', err);
            });
        }, DIAGNOSTICS_DELAY_MS);
    };

    const subscription = model.onDidChangeContent(schedule);
    void ready.then((ok) => {
        typingsLoaded = ok;
        schedule();
    });

    return {
        dispose: () => {
            disposed = true;
            if (timer !== undefined) clearTimeout(timer);
            subscription.dispose();
            if (!model.isDisposed?.()) monacoEditor.setModelMarkers(model, KCAD_DIAGNOSTICS_OWNER, []);
            checkModel.dispose();
        },
    };
}
