import { describe, it, expect, vi, beforeEach } from 'vitest';

const { verifyAccessTokenMock } = vi.hoisted(() => ({ verifyAccessTokenMock: vi.fn() }));

vi.mock('../../src/modules/security/security.interface.js', () => ({
  securityInterface: { verifyAccessToken: verifyAccessTokenMock },
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

  it('rejects a header with more than two space-separated parts', async () => {
    const res = buildRes();
    const next = vi.fn();

    await requireAuth({ headers: { authorization: 'Bearer t1 extra' } }, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
  });

  it.each([['bearer t1'], ['BEARER t1'], ['BeArEr t1']])(
    'accepts the case-insensitive scheme %s',
    async (authorization) => {
      const next = vi.fn();

      await requireAuth({ headers: { authorization } }, buildRes(), next);

      expect(verifyAccessTokenMock).toHaveBeenCalledWith('t1');
      expect(next).toHaveBeenCalled();
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

  it('delegates errors with no statusCode to next() instead of answering 401', async () => {
    const infraError = new Error('connect ECONNREFUSED 127.0.0.1:27017');
    verifyAccessTokenMock.mockRejectedValue(infraError);
    const res = buildRes();
    const next = vi.fn();

    await requireAuth({ headers: { authorization: 'Bearer t1' } }, res, next);

    expect(next).toHaveBeenCalledWith(infraError);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
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
