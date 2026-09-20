// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowUp, Mic, Paperclip, Square, X } from 'lucide-react';
import {
    isReferenceImageMimeType,
    MAX_REFERENCE_IMAGE_BYTES,
    type GenerateRequest,
} from '../funnel/lib/generateClient';

interface Recognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}
type SpeechWindow = Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
};
interface TextAttachment { kind: 'text'; name: string; content: string }
interface PhotoAttachment {
    kind: 'image';
    name: string;
    dataUrl: string;
    mimeType: NonNullable<GenerateRequest['referenceImage']>['mimeType'];
}
type Attachment = TextAttachment | PhotoAttachment;
// Leave room for Studio's selected-feature context in the 64,000 character API budget.
const MAX_PROMPT = 63_000;
const MAX_TEXT_FILES = 5;
const ACCEPT = '.txt,.md,.csv,.json,.svg,.ts,.js,.py,.scad,.step,.stp';
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed';

function readDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string' || !result.startsWith(`data:${file.type};base64,`)) {
                reject(new Error(`Could not read ${file.name} as a safe image.`));
                return;
            }
            resolve(result);
        };
        reader.onerror = () => reject(new Error(`Could not read ${file.name}. Try another photo.`));
        reader.readAsDataURL(file);
    });
}

async function attachmentsFrom(current: Attachment[], selected: File[]): Promise<Attachment[]> {
    const added: Attachment[] = [];
    let textCount = current.filter(file => file.kind === 'text').length;
    let photoCount = current.filter(file => file.kind === 'image').length;
    let textBytes = current.reduce((sum, file) => sum + (file.kind === 'text' ? file.content.length : 0), 0);
    for (const file of selected) {
        const mimeType = file.type;
        if (isReferenceImageMimeType(mimeType)) {
            if (photoCount >= 1) throw new Error('One photo per build.');
            if (file.size === 0) throw new Error(`${file.name} is empty. Choose a photo with visible device details.`);
            if (file.size > MAX_REFERENCE_IMAGE_BYTES) throw new Error('Photos must be 4 MiB or smaller.');
            added.push({ kind: 'image', name: file.name, dataUrl: await readDataUrl(file), mimeType });
            photoCount += 1;
            continue;
        }
        if (!ACCEPT.split(',').some(ext => file.name.toLowerCase().endsWith(ext))) {
            throw new Error('Choose text, code, SVG, or STEP files, or one PNG/JPEG/WebP photo.');
        }
        if (textCount >= MAX_TEXT_FILES) throw new Error(`Include up to ${MAX_TEXT_FILES} text files.`);
        if (file.size > 60_000) throw new Error(`${file.name} is too large. Include files under 60 KB.`);
        const content = await file.text();
        if (content.includes('\0')) throw new Error(`${file.name} is not a text file.`);
        textBytes += content.length;
        if (textBytes > 60_000) throw new Error('Included files must total less than 60 KB of text.');
        added.push({ kind: 'text', name: file.name, content });
        textCount += 1;
    }
    return added;
}

function AttachmentList({ files, disabled, reading, onRemove }: {
    files: Attachment[];
    disabled: boolean;
    reading: boolean;
    onRemove: (index: number) => void;
}) {
    if (files.length === 0) return null;
    return (
        <ul className="flex flex-wrap gap-1 px-2 pb-2" aria-label="Included files">
            {files.map((file, index) => <li key={`${index}-${file.name}`} className="flex max-w-full items-center rounded bg-white/10 pl-2 text-xs">
                <span className="truncate">{file.name}</span>
                <button type="button" aria-label={`Remove ${file.name}`} disabled={disabled || reading} className={buttonClass}
                    onClick={() => onRemove(index)}><X size={12} /></button>
            </li>)}
        </ul>
    );
}

function ComposerControls({ picker, value, disabled, reading, listening, speech, submitLabel, onFilesPicked, onToggleVoice }: {
    picker: RefObject<HTMLInputElement | null>;
    value: string;
    disabled: boolean;
    reading: boolean;
    listening: boolean;
    speech: (new () => Recognition) | undefined;
    submitLabel: string;
    onFilesPicked: (selected: File[]) => void;
    onToggleVoice: () => void;
}) {
    return (
        <div className="flex items-center gap-1 px-2 pb-2 text-gray-300">
            <input ref={picker} aria-label="Choose files" type="file" multiple accept={ACCEPT} className="hidden" disabled={disabled || reading}
                onChange={event => void onFilesPicked(Array.from(event.target.files ?? []))} />
            <button type="button" className={buttonClass} disabled={disabled || reading} onClick={() => picker.current?.click()}>
                <Paperclip size={16} />{reading ? 'Reading…' : 'Include files'}
            </button>
            <button type="button" className={buttonClass} aria-label={listening ? 'Stop voice input' : 'Voice input'} aria-pressed={listening}
                title={speech ? 'Dictate with Chrome' : 'Voice input requires a browser with speech recognition, such as Chrome'} disabled={disabled || !speech} onClick={onToggleVoice}>
                {listening ? <Square size={16} className="text-red-400" /> : <Mic size={16} />}
            </button>
            <button type="submit" aria-label={submitLabel} className={`${buttonClass} ml-auto bg-blue-600 text-white hover:bg-blue-500`}
                disabled={disabled || reading || listening || !value.trim()}><ArrowUp size={16} /></button>
        </div>
    );
}

/** Build and deliver a submission when the composer is idle and the prompt is
 *  within budget; report the reason through `setError` otherwise. */
function submitComposer({ disabled, reading, listening, value, files, setError, onSubmit }: {
    disabled: boolean;
    reading: boolean;
    listening: boolean;
    value: string;
    files: Attachment[];
    setError: (error: string) => void;
    onSubmit: (prompt: string, referenceImage?: GenerateRequest['referenceImage']) => void;
}) {
    if (disabled || reading || listening || !value.trim()) return;
    const photo = files.find((file): file is PhotoAttachment => file.kind === 'image');
    const prompt = [
        value.trim(),
        ...files
            .filter((file): file is TextAttachment => file.kind === 'text')
            .map(file => `Included file: ${file.name}\n${file.content}\nEnd of file: ${file.name}`),
    ].join('\n\n');
    if (prompt.length > MAX_PROMPT) { setError('Your message and files are too long. Shorten the message or remove a file.'); return; }
    setError('');
    if (photo) {
        onSubmit(prompt, { dataUrl: photo.dataUrl, fileName: photo.name, mimeType: photo.mimeType });
    } else {
        onSubmit(prompt);
    }
}

/** Stop the active recognition or start a new one with the composer's result
 *  and error wiring. */
function toggleVoiceInput({ recognition, Speech, latest, setError, setListening }: {
    recognition: RefObject<Recognition | null>;
    Speech: (new () => Recognition) | undefined;
    latest: RefObject<{ value: string; onChange: (value: string) => void }>;
    setError: (error: string) => void;
    setListening: (listening: boolean) => void;
}) {
    if (recognition.current) { recognition.current.stop(); return; }
    if (!Speech) return;
    setError('');
    const active = new Speech();
    recognition.current = active;
    active.lang = navigator.language || 'en-US';
    active.continuous = true;
    active.interimResults = false;
    active.onresult = event => {
        for (let index = event.resultIndex; index < event.results.length; index++) {
            const result = event.results[index];
            if (!result.isFinal) continue;
            const next = `${latest.current.value.trimEnd()} ${result[0].transcript.trim()}`.trim();
            latest.current.value = next;
            latest.current.onChange(next);
        }
    };
    active.onerror = event => {
        setListening(false);
        setError(event.error === 'not-allowed'
            ? 'Allow microphone access in Chrome to use voice input.'
            : 'Voice input stopped. Try again or type your message.');
    };
    active.onend = () => { recognition.current = null; setListening(false); };
    try { active.start(); setListening(true); }
    catch { recognition.current = null; setListening(false); setError('Could not start the microphone. Try again.'); }
}

export function AgentComposer({ value, onChange, onSubmit, disabled = false, submitLabel = 'Send', onPhotoChange }: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (prompt: string, referenceImage?: GenerateRequest['referenceImage']) => void;
    disabled?: boolean;
    submitLabel?: string;
    onPhotoChange?: (hasPhoto: boolean) => void;
}) {
    const [files, setFiles] = useState<Attachment[]>([]);
    const [reading, setReading] = useState(false);
    const [listening, setListening] = useState(false);
    const [error, setError] = useState('');
    const picker = useRef<HTMLInputElement>(null);
    const recognition = useRef<Recognition | null>(null);
    const latest = useRef({ value, onChange });
    latest.current = { value, onChange };
    const speechWindow = typeof window === 'undefined' ? undefined : window as SpeechWindow;
    const Speech = speechWindow?.SpeechRecognition ?? speechWindow?.webkitSpeechRecognition;

    useEffect(() => () => {
        const active = recognition.current;
        if (active) {
            active.onresult = active.onerror = active.onend = null;
            active.abort();
        }
    }, []);
    useEffect(() => {
        if (disabled) recognition.current?.abort();
    }, [disabled]);

    function replaceFiles(next: Attachment[]) {
        setFiles(next);
        onPhotoChange?.(next.some(file => file.kind === 'image'));
    }

    function removeFile(index: number) {
        replaceFiles(files.filter((_, i) => i !== index));
    }

    async function includeFiles(selected: File[]) {
        setError('');
        setReading(true);
        try {
            const added = await attachmentsFrom(files, selected);
            replaceFiles([...files, ...added]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not read the selected files.');
        } finally {
            setReading(false);
            if (picker.current) picker.current.value = '';
        }
    }

    function toggleVoice() {
        toggleVoiceInput({ recognition, Speech, latest, setError, setListening });
    }

    function send() {
        submitComposer({ disabled, reading, listening, value, files, setError, onSubmit });
    }

    return (
        <form onSubmit={event => { event.preventDefault(); send(); }} className="flex flex-col gap-2">
            <div className="rounded-xl border border-[#3a3a3a] bg-[#171717] focus-within:border-blue-500">
                <textarea
                    aria-label="Generate prompt" value={value} onChange={event => onChange(event.target.value)}
                    disabled={disabled} rows={5} placeholder="What would you like to make?"
                    onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault(); send();
                        }
                    }}
                    className="w-full resize-y min-h-28 bg-transparent p-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none disabled:opacity-50"
                />
                <AttachmentList files={files} disabled={disabled} reading={reading} onRemove={removeFile} />
                <ComposerControls picker={picker} value={value} disabled={disabled} reading={reading} listening={listening} speech={Speech}
                    submitLabel={submitLabel} onFilesPicked={includeFiles} onToggleVoice={toggleVoice} />
            </div>
            {listening && <p role="status" className="text-xs text-gray-400">Listening… stop the microphone to send.</p>}
            {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        </form>
    );
}
