import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
	try {
		const supabase = createRouteHandlerClient(request);

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

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 });
		}

		const filename = file.name;
		const fileBuffer = Buffer.from(await file.arrayBuffer());
		let content = '';

		// Process different file types
		if (filename.toLowerCase().endsWith('.txt')) {
			content = fileBuffer.toString('utf-8');
		} else if (filename.toLowerCase().endsWith('.pdf')) {
			// For now, we'll skip PDF processing to avoid DOMMatrix issues
			// TODO: Implement PDF processing with a different library
			return NextResponse.json(
				{
					error:
						'PDF processing is temporarily disabled. Please upload TXT files only.',
				},
				{ status: 400 },
			);
		} else {
			return NextResponse.json(
				{ error: 'Unsupported file type. Please upload TXT files only.' },
				{ status: 400 },
			);
		}

		// Limit content length
		if (content.length > 50000) {
			content =
				content.substring(0, 50000) + '\n\n[Content truncated due to length]';
		}

		// File upload record saving was removed as part of database cleanup
		// The file_uploads table has been dropped

		return NextResponse.json({
			success: true,
			filename: filename,
			content: content,
		});
	} catch (error) {
		console.error('File upload error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
