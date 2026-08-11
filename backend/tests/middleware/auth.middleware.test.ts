import { describe, it, expect, vi, beforeEach } from 'vitest';

const { verifyAccessTokenMock } = vi.hoisted(() => ({ verifyAccessTokenMock: vi.fn() }));

vi.mock('../../src/modules/auth/auth.interface.js', () => ({
  authInterface: { verifyAccessToken: verifyAccessTokenMock },
}));

import { requireAuth } from '../../src/middleware/auth.middleware.js';

const expiresAt = new Date('2026-08-11T12:00:00.000Z');

function buildRes() {
  const res = { statusCode: null, body: null };
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAccessTokenMock.mockResolvedValue({ userId: 'u1', role: 'DONOR', jti: 'j1', expiresAt });
  });

  it('rejects a request with no Authorization header', async () => {
    const req = { headers: {} };
    const res = buildRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([['Token abc'], ['Bearer'], ['Bearer ']])(
    'rejects the malformed header %s',
    async (authorization) => {
      const res = buildRes();
      const next = vi.fn();

      await requireAuth({ headers: { authorization } }, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    }
  );

  it('rejects when the token service throws', async () => {
    const tokenError: Error = new Error('Your session is invalid or has expired.');
    tokenError.statusCode = 401;
    verifyAccessTokenMock.mockRejectedValue(tokenError);
    const res = buildRes();
    const next = vi.fn();

    await requireAuth({ headers: { authorization: 'Bearer bad' } }, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Your session is invalid or has expired.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes the bare token to the token service', async () => {
    await requireAuth({ headers: { authorization: 'Bearer t1' } }, buildRes(), vi.fn());

    expect(verifyAccessTokenMock).toHaveBeenCalledWith('t1');
  });

  it('attaches req.user and req.auth then calls next on success', async () => {
    const req = { headers: { authorization: 'Bearer t1' } };
    const next = vi.fn();

    await requireAuth(req, buildRes(), next);

    expect(req.user).toEqual({ id: 'u1', role: 'DONOR' });
    expect(req.auth).toEqual({ jti: 'j1', expiresAt });
    expect(next).toHaveBeenCalled();
  });
});
