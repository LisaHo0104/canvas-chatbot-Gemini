import { OpenRouter } from '@openrouter/sdk';

export function getOpenRouterClient(apiKey?: string) {
	const key =
		apiKey ||
		process.env.OPENROUTER_API_KEY_OWNER ||
		process.env.OPENROUTER_API_KEY ||
		'';
	if (!key) throw new Error('OpenRouter API key is missing');
	return new OpenRouter({ apiKey: key });
}
