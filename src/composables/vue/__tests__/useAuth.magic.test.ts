/**
 * useAuth (Vue) — magic-token login + create.
 *
 * `useAuth` uses only `ref()` (no lifecycle/inject) so it's callable directly,
 * outside a component. It's driven through a fake GraphQLClient implementing the
 * `execute`/`setAccessToken` seam every SDK service calls — the REAL
 * `MagicTokenService` + `createServices` run. No module mocking. Node env (per
 * vitest.config.ts): `window` is undefined so the `userLoggedIn` dispatch is
 * skipped, and the fake `setAccessToken` never touches localStorage.
 */

import { describe, it, expect, vi } from 'vitest';
import { useAuth } from '../useAuth';

const SESSION = {
  accessToken: 'AT',
  refreshToken: 'RT',
  expirationTime: '2099-01-01T00:00:00.000Z',
  isAnonymous: false,
};

function makeFakeClient() {
  const calls: Array<{ operationName: string; variables: unknown }> = [];
  const execute = vi.fn(async ({ operationName, variables }: { operationName: string; variables: unknown }): Promise<any> => {
    calls.push({ operationName, variables });
    switch (operationName) {
      case 'magicTokenLogin':
        return { data: { magicTokenLogin: { providerId: 'p', operationType: 'signIn', session: SESSION } } };
      case 'viewer':
        return { data: { viewer: { __typename: 'Contact', contactId: 7, marker: 'VIEWER', primaryLanguage: 'EN' } } };
      case 'magicTokenCreate':
        return { data: { magicTokenCreate: { id: 'new-token-id', oneTimeUse: true } } };
      default:
        return { data: {} };
    }
  });
  const client = {
    execute,
    setAccessToken: vi.fn(),
    getConfig: () => ({ headers: {} }),
    updateConfig: vi.fn(),
  };
  return { client, execute, calls };
}

describe('useAuth (vue) — magicLogin', () => {
  it('exposes magicLogin + createMagicToken as functions', () => {
    const { client } = makeFakeClient();
    const auth = useAuth({ graphqlClient: client as never });
    expect(typeof auth.magicLogin).toBe('function');
    expect(typeof auth.createMagicToken).toBe('function');
  });

  it('exchanges the token for a session, sets the access token, and returns the viewer', async () => {
    const { client, calls } = makeFakeClient();
    const auth = useAuth({ graphqlClient: client as never });

    const res = await auth.magicLogin('tok-123');

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accessToken).toBe('AT');
    expect(res.data.refreshToken).toBe('RT');
    expect(res.data.expiresAt).toBe('2099-01-01T00:00:00.000Z');
    expect((res.data.user as { marker?: string }).marker).toBe('VIEWER');
    expect(client.setAccessToken).toHaveBeenCalledWith('AT');
    expect(calls[0]).toMatchObject({ operationName: 'magicTokenLogin', variables: { id: 'tok-123' } });
    expect(calls.some((c) => c.operationName === 'viewer')).toBe(true);
  });

  it('returns err (not throw) when the exchange fails', async () => {
    const { client, execute } = makeFakeClient();
    execute.mockResolvedValueOnce({ errors: [{ message: 'invalid token' }] });
    const auth = useAuth({ graphqlClient: client as never });

    const res = await auth.magicLogin('bad');

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(typeof res.error).toBe('string');
    expect(res.error.length).toBeGreaterThan(0);
  });
});

describe('useAuth (vue) — createMagicToken', () => {
  it('passes the input to magicTokenCreate and returns the token', async () => {
    const { client, calls } = makeFakeClient();
    const auth = useAuth({ graphqlClient: client as never });
    const input = { contactId: 42, oneTimeUse: true, expiresAt: '2099-01-01T00:00:00.000Z' };

    const res = await auth.createMagicToken(input);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.id).toBe('new-token-id');
    expect(calls.find((c) => c.operationName === 'magicTokenCreate')?.variables).toMatchObject({ input });
  });
});
