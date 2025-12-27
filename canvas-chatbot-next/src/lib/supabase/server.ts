import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
	const cookieStore = await cookies();

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
		{
			db: {
				schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public',
			},
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options),
						);
					} catch {
						// The `setAll` method was called from a Server Component.
						// This can be ignored if you have middleware refreshing
						// user sessions.
					}
				},
			},
		},
	);
}

export function createRouteHandlerClient(request: NextRequest) {
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
		{
			db: {
				schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public',
			},
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
}

export function createAuthRouteHandlerClient(
	request: NextRequest,
	response: NextResponse,
) {
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
		{
			db: {
				schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public',
			},
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						request.cookies.set(name, value);
						response.cookies.set(name, value, options);
					});
				},
			},
		},
	);
}

/**
 * Creates a Supabase client with service role key
 * This bypasses RLS and should only be used for server-side operations like webhooks
 * Never expose this client to the client-side
 */
export function createServiceRoleClient() {
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!supabaseUrl) {
		throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
	}

	// Create client with service role key - this bypasses RLS
	const client = createSupabaseClient(
		supabaseUrl,
		serviceRoleKey,
		{
			db: {
				schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public',
			},
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		},
	);

	return client;
}
