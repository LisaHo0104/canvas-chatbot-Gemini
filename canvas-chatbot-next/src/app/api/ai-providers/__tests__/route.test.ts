import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';
import { supabase } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
	supabase: {
		auth: {
			getUser: jest.fn(),
		},
		from: jest.fn(() => ({
			select: jest.fn(),
			insert: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			eq: jest.fn(),
			single: jest.fn(),
			order: jest.fn(),
		})),
	},
}));

jest.mock('@/lib/crypto', () => ({
	encrypt: jest.fn((text) => `encrypted_${text}`),
}));

describe('AI Providers API', () => {
	const mockUser = { id: 'test-user-id', email: 'test@example.com' };
	const mockProvider = {
		id: 'test-provider-id',
		user_id: 'test-user-id',
		provider_name: 'openrouter',
		model_name: 'gpt-4',
		api_key: 'encrypted_test-key',
		is_active: true,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		// Mock authentication
		(supabase.auth.getUser as jest.Mock).mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});
	});

	describe('GET /api/ai-providers', () => {
		it('should return all providers for authenticated user', async () => {
			const mockSelect = {
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({
					data: [mockProvider],
					error: null,
				}),
			};
			(supabase.from as jest.Mock).mockReturnValue(mockSelect);

			const request = new NextRequest('http://localhost:3000/api/ai-providers');
			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.providers).toHaveLength(1);
			expect(data.providers[0].provider_name).toBe('openrouter');
			expect(supabase.from).toHaveBeenCalledWith('ai_providers');
		});

		it('should handle database errors', async () => {
			const mockSelect = {
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({
					data: null,
					error: { message: 'Database error' },
				}),
			};
			(supabase.from as jest.Mock).mockReturnValue(mockSelect);

			const request = new NextRequest('http://localhost:3000/api/ai-providers');
			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe('Failed to fetch AI providers');
		});

		it('should return 401 for unauthenticated users', async () => {
			(supabase.auth.getUser as jest.Mock).mockResolvedValue({
				data: { user: null },
				error: { message: 'Not authenticated' },
			});

			const request = new NextRequest('http://localhost:3000/api/ai-providers');
			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe('Unauthorized');
		});
	});

	describe('POST /api/ai-providers', () => {
		it('should create a new AI provider', async () => {
			const newProvider = {
				provider_name: 'openrouter',
				model_name: 'claude-3-sonnet',
				api_key: 'test-api-key',
			};

			const mockInsert = {
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { ...mockProvider, ...newProvider },
					error: null,
				}),
			};
			(supabase.from as jest.Mock).mockReturnValue(mockInsert);

			const request = new NextRequest(
				'http://localhost:3000/api/ai-providers',
				{
					method: 'POST',
					body: JSON.stringify(newProvider),
				},
			);
			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.provider.provider_name).toBe('openrouter');
			expect(data.provider.model_name).toBe('claude-3-sonnet');
			expect(encrypt).toHaveBeenCalledWith('test-api-key');
		});

		it('should validate required fields', async () => {
			const invalidProvider = {
				provider_name: 'openrouter',
				// Missing api_key and model_name
			};

			const request = new NextRequest(
				'http://localhost:3000/api/ai-providers',
				{
					method: 'POST',
					body: JSON.stringify(invalidProvider),
				},
			);
			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain('Missing required fields');
		});

		it('should handle database insertion errors', async () => {
			const newProvider = {
				provider_name: 'openrouter',
				model_name: 'gpt-4',
				api_key: 'test-api-key',
			};

			const mockInsert = {
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { message: 'Duplicate provider' },
				}),
			};
			(supabase.from as jest.Mock).mockReturnValue(mockInsert);

			const request = new NextRequest(
				'http://localhost:3000/api/ai-providers',
				{
					method: 'POST',
					body: JSON.stringify(newProvider),
				},
			);
			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe('Failed to create AI provider');
		});
	});

	describe('PUT /api/ai-providers', () => {
		it('should update an existing provider', async () => {
			const updates = {
				id: 'test-provider-id',
				model_name: 'gpt-4-turbo',
				api_key: 'new-api-key',
			};

			const mockUpdate = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { ...mockProvider, ...updates },
					error: null,
				}),
			};
			(supabase.from as jest.Mock).mockReturnValue(mockUpdate);

			const request = new NextRequest(
				'http://localhost:3000/api/ai-providers',
				{
					method: 'PUT',
					body: JSON.stringify(updates),
				},
			);
			const response = await PUT(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.provider.model_name).toBe('gpt-4-turbo');
			expect(encrypt).toHaveBeenCalledWith('new-api-key');
		});

		it('should validate provider ID', async () => {
			const invalidUpdate = {
				model_name: 'gpt-4-turbo',
				// Missing id
			};

			const request = new NextRequest(
				'http://localhost:3000/api/ai-providers',
				{
					method: 'PUT',
					body: JSON.stringify(invalidUpdate),
				},
			);
			const response = await PUT(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain('Provider ID is required');
		});

		it('should handle not found provider', async () => {
			const updates = {
				id: 'non-existent-id',
				model_name: 'gpt-4-turbo',
			};

			const mockUpdate = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: null,
				}),
			};
			(supabase.from as jest.Mock).mockReturnValue(mockUpdate);

			const request = new NextRequest(
				'http://localhost:3000/api/ai-providers',
				{
					method: 'PUT',
					body: JSON.stringify(updates),
				},
			);
			const response = await PUT(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('AI provider not found');
		});
	});

	describe('DELETE /api/ai-providers', () => {
		it('should delete a provider', async () => {
			const mockDelete = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: mockProvider,
					error: null,
				}),
			};
			(supabase.from as jest.Mock).mockReturnValue(mockDelete);

			const request = new NextRequest(
				'http://localhost:3000/api/ai-providers',
				{
					method: 'DELETE',
					body: JSON.stringify({ id: 'test-provider-id' }),
				},
			);
			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe('AI provider deleted successfully');
		});

		it('should validate provider ID', async () => {
			const request = new NextRequest(
				'http://localhost:3000/api/ai-providers',
				{
					method: 'DELETE',
					body: JSON.stringify({}),
				},
			);
			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain('Provider ID is required');
		});

		it('should handle not found provider', async () => {
			const mockDelete = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: null,
				}),
			};
			(supabase.from as jest.Mock).mockReturnValue(mockDelete);

			const request = new NextRequest(
				'http://localhost:3000/api/ai-providers',
				{
					method: 'DELETE',
					body: JSON.stringify({ id: 'non-existent-id' }),
				},
			);
			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('AI provider not found');
		});
	});
});