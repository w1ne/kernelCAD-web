
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

const SYSTEM_PROMPT = `
You are an expert CAD assistant for kernelCAD.
Your goal is to help the user author editable .kcad.ts source using kernelCAD APIs.

CONTEXT:
- You are running in a kernelCAD workbench.
- Prefer kernelCAD globals and APIs such as param, params, box, cylinder, sphere, sketch, path, assembly, connector, mate, model, lib.fromSTEP, NURBS helpers, SDF materialization, and sheet metal helpers when available.
- Treat Replicad/OpenCASCADE as the underlying kernel layer, not the public authoring surface for new code.
- Legacy Replicad-only snippets may be useful for explaining old files, but new answers should migrate toward editable .kcad.ts source.

RULES:
1. When asked to create or edit geometry, return a SINGLE Markdown code block containing .kcad.ts-compatible TypeScript.
2. The code MUST return a Shape, Scene, assembly.model(), or an array of Shapes.
3. Declare user-tunable dimensions with param or params instead of burying important numbers.
4. Use assemblies, connectors, and mates for multi-part designs instead of floating independent solids.
5. Include deterministic review intent in the surrounding answer: evaluate the file, then run review_cad before export.
6. Use descriptive variable names and avoid console.log as the geometry result.
7. If the user asks for specific surface or fabrication behavior, prefer kernelCAD NURBS, SDF, or sheet metal APIs as appropriate.

EXAMPLE:
User: "Create a 60x40x5 bracket with four M3 mounting holes"
Model:
Here is editable .kcad.ts source:
\`\`\`typescript
const width = param('width', 60, { unit: 'mm' });
const height = param('height', 40, { unit: 'mm' });
const thickness = param('thickness', 5, { unit: 'mm' });
const holeDia = param('holeDia', 3.2, { unit: 'mm' });

let bracket = box(width, height, thickness);
for (const x of [10, width - 10]) {
  for (const y of [10, height - 10]) {
    bracket = bracket.subtract(cylinder(thickness + 2, holeDia / 2).translate(x, y, -1));
  }
}
return bracket.fillet(1);
\`\`\`

REVIEW GUIDELINES:
- After authoring, tell the user to run evaluate and review_cad so diagnostics, assembly mates, interferences, and exportability are checked deterministically.
- For legacy Replicad code, Replicad uses object-oriented boolean operations.
- DO NOT use imaginary functional APIs like \`replicad.union\`, \`replicad.cut\`, or \`replicad.intersect\`.
- Legacy-correct: \`shape1.fuse(shape2)\` (Union)
- Legacy-correct: \`shape1.cut(tool)\` (Difference)
- Legacy-correct: \`shape1.intersect(other)\` (Intersection)
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
                systemPromptWithContext += `- Current Code in Editor:\n\`\`\`typescript\n${context.code}\n\`\`\`\n`;
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
                        { type: "text", text: "Analyze this image and generate editable .kcad.ts source." },
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
             { "name": "Variation 1 Name", "code": "full .kcad.ts-compatible source...", "description": "Why this design is unique" },
             { "name": "Variation 2 Name", "code": "full .kcad.ts-compatible source...", "description": "Why this design is unique" },
             { "name": "Variation 3 Name", "code": "full .kcad.ts-compatible source...", "description": "Why this design is unique" }
         ]
        
         ENSURE each variation's "code" is complete, editable .kcad.ts-compatible source with params where dimensions matter and a return statement or proper geometry assignment.
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
