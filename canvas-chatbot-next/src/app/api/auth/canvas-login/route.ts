import { NextRequest, NextResponse } from 'next/server';
import { createAuthRouteHandlerClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import { CanvasAPIService } from '@/lib/canvas-api';

export async function POST(request: NextRequest) {
	try {
		const { canvas_token, canvas_url } = await request.json();

		if (!canvas_token || !canvas_url) {
			return NextResponse.json(
				{ error: 'Canvas token and URL are required' },
				{ status: 400 },
			);
		}

		let finalCanvasUrl = String(canvas_url || '').trim();
		finalCanvasUrl = finalCanvasUrl.replace(/\/+$/, '');
		finalCanvasUrl = finalCanvasUrl.replace(/\/api\/v1\/?$/, '');
		finalCanvasUrl = `${finalCanvasUrl}/api/v1`;

		// Verify Canvas API credentials
		const canvasService = new CanvasAPIService(canvas_token, finalCanvasUrl);
		let canvasUser;
		try {
			canvasUser = await canvasService.getCurrentUser();
		} catch (error) {
			return NextResponse.json(
				{ error: 'Invalid Canvas API token or URL' },
				{ status: 401 },
			);
		}

		const supabaseResponse = NextResponse.next({
			request,
		});

		// Create Supabase client
		const supabase = createAuthRouteHandlerClient(request, supabaseResponse);

		// Get current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: 'Authentication required' },
				{ status: 401 },
			);
		}

		// Encrypt Canvas API key
		const encryptedToken = encrypt(canvas_token);

		const { error: upsertError } = await supabase.from('profiles').upsert(
			{
				id: user.id,
				email: user.email || '',
				canvas_institution: finalCanvasUrl.replace('/api/v1', ''),
				canvas_api_key_encrypted: encryptedToken,
				canvas_api_url: finalCanvasUrl,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'id' },
		);

		if (upsertError) {
			console.error('Failed to update Canvas credentials:', upsertError);
			return NextResponse.json(
				{ error: 'Failed to save Canvas credentials' },
				{ status: 500 },
			);
		}

		const json = NextResponse.json({
			success: true,
			message: `Welcome, ${canvasUser.name}!`,
		});
		supabaseResponse.cookies
			.getAll()
			.forEach((cookie) => json.cookies.set(cookie.name, cookie.value, cookie));
		return json;
	} catch (error) {
		console.error('Canvas login error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
