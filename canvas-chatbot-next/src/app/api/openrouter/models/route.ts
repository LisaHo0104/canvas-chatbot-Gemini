import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { OpenRouterService } from '@/lib/openrouter-service';
import { rateLimitMiddleware } from '@/lib/rate-limit';

async function getModelsHandler(request: NextRequest) {
	try {
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return request.cookies.getAll();
					},
					setAll(cookiesToSet) {
						cookiesToSet.forEach(({ name, value, options }) => {
							request.cookies.set(name, value);
						});
					},
				},
			},
		);

		// Get current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: 'Please log in first' },
				{ status: 401 },
			);
		}

		const ownerKey =
			process.env.OPENROUTER_API_KEY_OWNER ||
			process.env.OPENROUTER_API_KEY ||
			'';
		if (!ownerKey) {
			return NextResponse.json(
				{ error: 'OpenRouter owner API key not configured' },
				{ status: 500 },
			);
		}

    const service = new OpenRouterService(ownerKey);
    const all = await service.getAvailableModels();
    let models = (all || []).filter((m: any) => typeof m?.id === 'string' && m.id.endsWith(':free'))
    if (!models || models.length === 0) {
      models = (all || []).filter((m: any) => {
        const p = m?.pricing || {}
        return p?.prompt === 0 && p?.completion === 0
      })
    }

    return NextResponse.json({ models });
	} catch (error) {
		console.error('Get OpenRouter models API error:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to fetch models',
			},
			{ status: 500 },
		);
	}
}

// Apply rate limiting
export const GET = rateLimitMiddleware(getModelsHandler);