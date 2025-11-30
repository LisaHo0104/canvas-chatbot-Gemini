import { createOpenRouter } from '@openrouter/ai-sdk-provider';

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

export function getDefaultModelId(model?: string) {
	if (model && model.trim().length > 0) return model;
	return 'anthropic/claude-3.5-sonnet';
}
