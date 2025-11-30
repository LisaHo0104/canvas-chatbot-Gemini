import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { OpenRouterService } from '../openrouter-service';

export function createOpenRouterProvider(apiKey: string) {
	const provider = createOpenRouter({
		apiKey,
		headers: {
			'HTTP-Referer':
				process.env.OPENROUTER_SITE_URL ||
				process.env.NEXT_PUBLIC_APP_URL ||
				'http://localhost:3000',
			'X-Title': process.env.OPENROUTER_APP_TITLE || 'Canvas Chatbot',
		},
	});
	return provider;
}

export async function getDefaultModelId(model?: string): Promise<string> {
    if (model && model.trim().length > 0) return model;
    const apiKey = process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY;
    if (apiKey) {
        try {
            const svc = new OpenRouterService(apiKey);
            const models = await svc.getAvailableModels();
            const firstId = models?.[0]?.id;
            if (typeof firstId === 'string' && firstId.trim()) return firstId;
        } catch {}
    }
    return 'google/gemini-2.0-flash-exp';
}
