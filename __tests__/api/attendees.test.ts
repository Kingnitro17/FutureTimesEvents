// __tests__/api/attendees.test.ts
// Unit tests for GET /api/events/[id]/attendees

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockSnapshot = {
  going_count: 42,
  interested_count: 7,
  preview_attendees: [{ user_id: 'u1', display_name: 'Alex', avatar_color: '#FF55C2', initials: 'AJ' }],
  computed_at: '2026-05-15T00:00:00Z',
};

jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      in:     jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
    })),
  },
}));

jest.mock('@/lib/cache', () => ({
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(undefined),
}));

import handler from '@/pages/api/events/[id]/attendees';

describe('GET /api/events/[id]/attendees', () => {
  it('returns snapshot data', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'evt1' },
    });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data.going_count).toBe(42);
    expect(data.preview_attendees).toHaveLength(1);
  });

  it('returns 405 for non-GET', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'evt1' },
    });
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('serves from cache when available', async () => {
    const { getCache } = await import('@/lib/cache');
    (getCache as jest.Mock).mockResolvedValueOnce({ going_count: 99, preview_attendees: [] });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'evt1' },
    });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().going_count).toBe(99);
    expect(res.getHeader('X-Cache')).toBe('HIT');
  });
});
