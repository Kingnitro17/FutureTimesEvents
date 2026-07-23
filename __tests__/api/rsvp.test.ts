// __tests__/api/rsvp.test.ts
// Unit tests for POST /api/events/[id]/rsvp
// Run: npx jest __tests__/api/rsvp.test.ts
//
// Uses jest + jest-mock-extended. No real DB or Redis connections.

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

// ── Mock supabase-server before importing handler ────────────────
jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'evt1', status: 'published' }, error: null }),
      upsert: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ error: null }),
  },
  supabaseFromToken: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-uuid-123' } },
        error: null,
      }),
    },
  })),
}));

jest.mock('@/lib/worker-queue', () => ({
  enqueueSnapshotJob: jest.fn().mockResolvedValue(undefined),
}));

// Mock Redis rate limiter to always allow
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    zremrangebyscore: jest.fn().mockResolvedValue(0),
    zcard:   jest.fn().mockResolvedValue(0),
    zadd:    jest.fn().mockResolvedValue(1),
    expire:  jest.fn().mockResolvedValue(1),
    on:      jest.fn(),
  }));
});

import handler from '@/pages/api/events/[id]/rsvp';

// ── Helpers ──────────────────────────────────────────────────────
function makeReq(overrides: Partial<NextApiRequest> = {}) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
    query:  { id: 'evt1' },
    headers: { authorization: 'Bearer fake-jwt' },
    body: { status: 'going', idempotency_key: 'idem-1' },
    ...overrides,
  });
  return { req, res };
}

describe('POST /api/events/[id]/rsvp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no auth header', async () => {
    const { req, res } = makeReq({ headers: {} });
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for invalid status', async () => {
    const { req, res } = makeReq({ body: { status: 'maybe' } });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().error).toMatch(/invalid status/i);
  });

  it('returns 200 and ok:true for valid RSVP', async () => {
    const { req, res } = makeReq();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().ok).toBe(true);
  });

  it('enqueues snapshot job on success', async () => {
    const { enqueueSnapshotJob } = await import('@/lib/worker-queue');
    const { req, res } = makeReq();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(enqueueSnapshotJob).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt1', status: 'going' })
    );
  });

  it('returns 405 for GET method on rsvp route', async () => {
    const { req, res } = makeReq({ method: 'DELETE' });
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
