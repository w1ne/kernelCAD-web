
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

const SYSTEM_PROMPT = `
You are an expert CAD assistant for kernelCAD.
Your goal is to help the user generate 3D geometry using the 'replicad' library.

CONTEXT:
- You are running in a "Headless Kernel" environment.
- The variable 'replicad' is available globally.
- You can use standard Replicad API methods like 'makeBox', 'makeCylinder', 'makeSphere', 'sketch', 'draw', etc.

RULES:
1. When asked to create geometry, return a SINGLE Markdown code block containing JavaScript code.
2. The code MUST return a Shape or an array of Shapes.
3. Do NOT use 'console.log' to return geometry; use the 'return' statement.
4. Use descriptive variable names.
5. If the user asks for a specific operation (e.g., fillet, chamfer), apply it to the shape.

EXAMPLE:
User: "Create a box 10x10x10"
Model:
Here is the code for a box:
\`\`\`javascript
const box = replicad.makeBox(10, 10, 10);
return box;
\`\`\`

API GUIDELINES:
- Replicad uses an Object-Oriented style for boolean operations.
- DO NOT use imaginary functional APIs like \`replicad.union\`, \`replicad.cut\`, or \`replicad.intersect\`.
- CORRECT: \`shape1.fuse(shape2)\` (Union)
- CORRECT: \`shape1.cut(tool)\` (Difference)
- CORRECT: \`shape1.intersect(other)\` (Intersection)
`;

export class LLMService {
    private apiKey: string | null = null;
    private static STORAGE_KEY = 'kernelcad_llm_api_key';

    constructor() {
        if (typeof localStorage !== 'undefined') {
            this.apiKey = localStorage.getItem(LLMService.STORAGE_KEY);
        }
    }

    setApiKey(key: string) {
        this.apiKey = key;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LLMService.STORAGE_KEY, key);
        }
    }

    getApiKey(): string | null {
        return this.apiKey;
    }

    validateCode(code: string): string[] {
        const errors: string[] = [];
        const forbidden = [
            { pattern: /replicad\.union\(/, message: "replicad.union is not supported. Use shape.fuse(other) instead." },
            { pattern: /replicad\.cut\(/, message: "replicad.cut is not supported. Use shape.cut(tool) instead." },
            { pattern: /replicad\.intersect\(/, message: "replicad.intersect is not supported. Use shape.intersect(other) instead." },
        ];

        for (const rule of forbidden) {
            if (rule.pattern.test(code)) {
                errors.push(rule.message);
            }
        }
        return errors;
    }

    async sendMessage(history: ChatMessage[], context?: { code?: string; selectedId?: string; style?: string; image?: string }): Promise<string> {
        // Use stored key or env variable
        let apiKey = this.apiKey;
        if (!apiKey && typeof import.meta !== 'undefined' && import.meta.env) {
            apiKey = import.meta.env.VITE_XAI_API_KEY;
        }

        if (!apiKey) {
            throw new Error("API Key is missing. Please configure it in the AI settings or .env file.");
        }

        let systemPromptWithContext = SYSTEM_PROMPT;

        // Inject Style Guidelines
        if (context?.style && context.style !== 'Standard') {
            systemPromptWithContext += `\nDESIGN STYLE: ${context.style}\n`;
            if (context.style === 'Industrial') {
                systemPromptWithContext += `GUIDELINES: Use robust proportions, visible chamfers (e.g., makeChamfer), and functional aesthetics. Avoid fragile geometry.\n`;
            } else if (context.style === 'Minimalist') {
                systemPromptWithContext += `GUIDELINES: Use smooth continuous surfaces, large fillet radii (e.g., makeFillet), and hide unnecessary details. Aim for "Apple-like" aesthetics.\n`;
            } else if (context.style === 'Organic') {
                systemPromptWithContext += `GUIDELINES: Avoid sharp corners. Use lofts and sweeps where possible to create curvy, biological forms.\n`;
            }
        }

        // Inject Workbench Context
        if (context) {
            systemPromptWithContext += `\nCURRENT WORKBENCH STATE:\n`;
            if (context.selectedId) {
                systemPromptWithContext += `- User has SELECTED object with ID: "${context.selectedId}"\n`;
            }
            if (context.code) {
                systemPromptWithContext += `- Current Code in Editor:\n\`\`\`javascript\n${context.code}\n\`\`\`\n`;
                systemPromptWithContext += `(When generating code, you can reference existing variables if they are in scope, or suggest edits.)\n`;
            }
        }

        interface ApiContentItem {
            type: string;
            text?: string;
            image_url?: { url: string };
        }

        const apiMessages: { role: string; content: string | ApiContentItem[] }[] = [
            { role: 'system', content: systemPromptWithContext },
            ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content }))
        ];

        // If context has image, append it to the last user message or create a new one
        if (context?.image) {
            // Find last user message (compatible with older ES versions)
            let lastUserMsgIndex = -1;
            for (let i = apiMessages.length - 1; i >= 0; i--) {
                if (apiMessages[i].role === 'user') {
                    lastUserMsgIndex = i;
                    break;
                }
            }

            if (lastUserMsgIndex !== -1) {
                const existingContent = apiMessages[lastUserMsgIndex].content;
                apiMessages[lastUserMsgIndex].content = [
                    { type: "text", text: typeof existingContent === 'string' ? existingContent : "" },
                    { type: "image_url", image_url: { url: context.image } }
                ];
            } else {
                apiMessages.push({
                    role: 'user',
                    content: [
                        { type: "text", text: "Analyze this image and generate code." },
                        { type: "image_url", image_url: { url: context.image } }
                    ]
                });
            }
        }

        // Select Model
        const model = context?.image ? "grok-2-vision-1212" : "grok-4-1-fast-reasoning";

        try {
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    messages: apiMessages,
                    model: model,
                    stream: false,
                    temperature: 0
                })
            });

            if (!response.ok) {
                const errData = await response.json() as { error?: { message?: string } };
                throw new Error(errData.error?.message || response.statusText);
            }

            const data = await response.json() as { choices?: { message?: { content?: string } }[] };
            const text = data.choices?.[0]?.message?.content;

            if (!text) {
                throw new Error("No response content from LLM.");
            }

            // Validate the generated code
            const validationErrors = this.validateCode(text);
            if (validationErrors.length > 0) {
                return `**Generation Rejected**: The AI generated code that uses unsupported APIs.\n\nIssues Found:\n` + validationErrors.map(e => `- ${e}`).join('\n');
            }

            return text;

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("LLM Error:", message);
            throw new Error(`LLM Request Failed: ${message}`);
        }
    }

    async generateVariations(prompt: string, context?: { code?: string; style?: string }): Promise<Array<{ name: string; code: string; description: string; }>> {
        const variationPrompt = `
        You are a Generative Design Specialist.
        The user wants 3 DISTINCT variations for the request: "${prompt}".
        
        CONTEXT:
        ${context?.code ? `Base Code:\n${context.code}\n` : ''}
        ${context?.style ? `Target Style: ${context.style}\n` : ''}

        OUTPUT FORMAT:
        Return ONLY a raw JSON array (no markdown formatting).
        Schema:
        [
            { "name": "Variation 1 Name", "code": "full javascript code...", "description": "Why this design is unique" },
            { "name": "Variation 2 Name", "code": "full javascript code...", "description": "Why this design is unique" },
            { "name": "Variation 3 Name", "code": "full javascript code...", "description": "Why this design is unique" }
        ]
        
        ENSURE each variation's "code" is a complete, runnable script starting with imports or variable declarations and ending with a return statement or proper geometry assignment.
        `;

        const response = await this.sendMessage([{ role: 'user', content: variationPrompt }]);

        // Clean up markdown code blocks if present (some LLMs add them despite instructions)
        let jsonStr = response.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse variations JSON", e);
            throw new Error("Failed to generate valid variations. Please try again.");
        }
    }
}

export const llmService = new LLMService();
