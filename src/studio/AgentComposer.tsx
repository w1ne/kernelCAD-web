// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic, Paperclip, Square, X } from 'lucide-react';

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
interface Attachment { name: string; content: string }
// Leave room for Studio's selected-feature context in the 64,000 character API budget.
const MAX_PROMPT = 63_000;
const ACCEPT = '.txt,.md,.csv,.json,.svg,.ts,.js,.py,.scad,.step,.stp';

export function AgentComposer({ value, onChange, onSubmit, disabled = false, submitLabel = 'Send' }: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (prompt: string) => void;
    disabled?: boolean;
    submitLabel?: string;
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

    async function includeFiles(selected: File[]) {
        setError('');
        setReading(true);
        try {
            if (files.length + selected.length > 5) throw new Error('Include up to 5 text files.');
            const added: Attachment[] = [];
            let size = files.reduce((sum, file) => sum + file.content.length, 0);
            for (const file of selected) {
                if (!ACCEPT.split(',').some(ext => file.name.toLowerCase().endsWith(ext))) {
                    throw new Error('Choose text, code, SVG, or STEP files. Images, PDFs, and binary models are not supported yet.');
                }
                if (file.size > 60_000) throw new Error(`${file.name} is too large. Include files under 60 KB.`);
                const content = await file.text();
                if (content.includes('\0')) throw new Error(`${file.name} is not a text file.`);
                size += content.length;
                if (size > 60_000) throw new Error('Included files must total less than 60 KB of text.');
                added.push({ name: file.name, content });
            }
            setFiles(previous => [...previous, ...added]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not read the selected files.');
        } finally {
            setReading(false);
            if (picker.current) picker.current.value = '';
        }
    }

    function toggleVoice() {
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

    function send() {
        if (disabled || reading || listening || !value.trim()) return;
        const prompt = [value.trim(), ...files.map(file => `Included file: ${file.name}\n${file.content}\nEnd of file: ${file.name}`)].join('\n\n');
        if (prompt.length > MAX_PROMPT) { setError('Your message and files are too long. Shorten the message or remove a file.'); return; }
        setError('');
        onSubmit(prompt);
    }

    const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed';
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
                {files.length > 0 && <ul className="flex flex-wrap gap-1 px-2 pb-2" aria-label="Included files">
                    {files.map((file, index) => <li key={`${index}-${file.name}`} className="flex max-w-full items-center rounded bg-white/10 pl-2 text-xs">
                        <span className="truncate">{file.name}</span>
                        <button type="button" aria-label={`Remove ${file.name}`} disabled={disabled || reading} className={buttonClass}
                            onClick={() => setFiles(previous => previous.filter((_, i) => i !== index))}><X size={12} /></button>
                    </li>)}
                </ul>}
                <div className="flex items-center gap-1 px-2 pb-2 text-gray-300">
                    <input ref={picker} aria-label="Choose files" type="file" multiple accept={ACCEPT} className="hidden" disabled={disabled || reading}
                        onChange={event => void includeFiles(Array.from(event.target.files ?? []))} />
                    <button type="button" className={buttonClass} disabled={disabled || reading} onClick={() => picker.current?.click()}>
                        <Paperclip size={16} />{reading ? 'Reading…' : 'Include files'}
                    </button>
                    <button type="button" className={buttonClass} aria-label={listening ? 'Stop voice input' : 'Voice input'} aria-pressed={listening}
                        title={Speech ? 'Dictate with Chrome' : 'Voice input requires a browser with speech recognition, such as Chrome'} disabled={disabled || !Speech} onClick={toggleVoice}>
                        {listening ? <Square size={16} className="text-red-400" /> : <Mic size={16} />}
                    </button>
                    <button type="submit" aria-label={submitLabel} className={`${buttonClass} ml-auto bg-blue-600 text-white hover:bg-blue-500`}
                        disabled={disabled || reading || listening || !value.trim()}><ArrowUp size={16} /></button>
                </div>
            </div>
            {listening && <p role="status" className="text-xs text-gray-400">Listening… stop the microphone to send.</p>}
            {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        </form>
    );
}
