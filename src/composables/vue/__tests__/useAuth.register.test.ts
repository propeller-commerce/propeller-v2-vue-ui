/**
 * useAuth (Vue) — registration without a password and without the welcome email.
 *
 * Drives the real SDK services through a fake GraphQLClient (same seam as
 * useAuth.magic.test.ts) and asserts on the operations sent.
 */

import { describe, it, expect, vi } from 'vitest';
import { useAuth } from '../useAuth';

const SESSION = {
  accessToken: 'REG-AT',
  refreshToken: 'REG-RT',
  expirationTime: '2099-01-01T00:00:00.000Z',
};

type Call = { operationName: string; variables: any; token: string };

function makeFakeClient(overrides: Record<string, () => any> = {}) {
  let token = '';
  const calls: Call[] = [];
  const execute = vi.fn(async ({ operationName, variables }: { operationName: string; variables: any }): Promise<any> => {
    calls.push({ operationName, variables, token });
    if (overrides[operationName]) return overrides[operationName]();
    switch (operationName) {
      case 'companyCreate':
        return { data: { companyCreate: { companyId: 11 } } };
      case 'contactRegister':
        return { data: { contactRegister: { contact: { contactId: 21 }, session: SESSION } } };
      case 'customerRegister':
        return { data: { customerRegister: { customer: { customerId: 31 }, session: SESSION } } };
      case 'login':
        return { data: { login: { session: { accessToken: 'LOGIN-AT', refreshToken: 'LOGIN-RT', expirationTime: '2099-01-01T00:00:00.000Z' } } } };
      case 'viewer':
        return { data: { viewer: { __typename: 'Customer', customerId: 31 } } };
      case 'companyAddressCreate':
        return { data: { companyAddressCreate: { id: 1 } } };
      case 'customerAddressCreate':
        return { data: { customerAddressCreate: { id: 2 } } };
      default:
        return { data: { [operationName]: true } };
    }
  });
  const client = {
    execute,
    setAccessToken: vi.fn((t: string) => { token = t; }),
    getConfig: () => ({ headers: {} }),
    updateConfig: vi.fn(),
  };
  const ops = () => calls.map((c) => c.operationName);
  return { client, calls, ops, token: () => token };
}

const PERSON = { email: 'new@example.com', firstName: 'New', lastName: 'User' };
const ADDRESS = { street: 'Main', number: '1', postalCode: '1000AA', city: 'Amsterdam', country: 'NL' };
const WELCOME = /SendWelcomeEmailEvent$/;

describe('useAuth (vue) — registerContact without a password', () => {
  it('sends no password, never logs in and creates the addresses with the register session', async () => {
    const { client, calls, ops, token } = makeFakeClient();
    const auth = useAuth({ graphqlClient: client as never });

    const res = await auth.registerContact({ ...PERSON, companyName: 'Acme', ...ADDRESS, sameDeliveryAsBilling: true }, 'NL', true, false);

    expect(res).toEqual({ ok: true, data: {} });
    const register = calls.find((c) => c.operationName === 'contactRegister')!;
    expect('password' in register.variables.contactRegisterInput).toBe(false);
    expect(ops()).not.toContain('login');
    expect(ops().some((o) => WELCOME.test(o))).toBe(false);
    const addresses = calls.filter((c) => c.operationName === 'companyAddressCreate');
    expect(addresses).toHaveLength(2);
    expect(addresses.every((c) => c.token === 'REG-AT')).toBe(true);
    expect(token()).toBe('');
  });

  it('reports a failed registration instead of returning ok', async () => {
    const { client, ops } = makeFakeClient({
      contactRegister: () => ({ data: null, errors: [{ message: 'Failed to create authentication account for contact' }] }),
    });
    const auth = useAuth({ graphqlClient: client as never });

    const res = await auth.registerContact({ ...PERSON, companyName: 'Acme', ...ADDRESS }, 'NL', true, false);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('Failed to create authentication account');
    expect(ops()).not.toContain('companyAddressCreate');
  });

  it('reports an error when the register response has no session for the addresses', async () => {
    const { client, ops } = makeFakeClient({
      contactRegister: () => ({ data: { contactRegister: { contact: { contactId: 21 }, session: null } } }),
    });
    const auth = useAuth({ graphqlClient: client as never });

    const res = await auth.registerContact({ ...PERSON, companyName: 'Acme', ...ADDRESS }, 'NL', true, false);

    expect(res.ok).toBe(false);
    expect(ops()).not.toContain('companyAddressCreate');
  });
});

describe('useAuth (vue) — registerCustomer without a password', () => {
  it('sends no password, never logs in and creates the addresses with the register session', async () => {
    const { client, calls, ops, token } = makeFakeClient();
    const auth = useAuth({ graphqlClient: client as never });

    const res = await auth.registerCustomer({ ...PERSON, ...ADDRESS, sameDeliveryAsBilling: true }, 'NL', true, false);

    expect(res).toEqual({ ok: true, data: {} });
    const register = calls.find((c) => c.operationName === 'customerRegister')!;
    expect('password' in register.variables.customerRegisterInput).toBe(false);
    expect(ops()).not.toContain('login');
    expect(ops().some((o) => WELCOME.test(o))).toBe(false);
    const addresses = calls.filter((c) => c.operationName === 'customerAddressCreate');
    expect(addresses).toHaveLength(2);
    expect(addresses.every((c) => c.token === 'REG-AT' && c.variables.input.customerId === 31)).toBe(true);
    expect(token()).toBe('');
  });

  it('reports an error when the register response has no session for the addresses', async () => {
    const { client, ops } = makeFakeClient({
      customerRegister: () => ({ data: { customerRegister: { customer: { customerId: 31 }, session: null } } }),
    });
    const auth = useAuth({ graphqlClient: client as never });

    const res = await auth.registerCustomer({ ...PERSON, ...ADDRESS }, 'NL', true, false);

    expect(res.ok).toBe(false);
    expect(ops()).not.toContain('customerAddressCreate');
  });
});

describe('useAuth (vue) — sendWelcomeEmail', () => {
  it('sends the welcome email by default', async () => {
    const { client, ops } = makeFakeClient();
    const auth = useAuth({ graphqlClient: client as never });

    await auth.registerContact({ ...PERSON, password: 'secret', companyName: 'Acme' }, 'NL', false);

    expect(ops()).toContain('triggerContactSendWelcomeEmailEvent');
  });

  it('skips the contact welcome email when sendWelcomeEmail is false', async () => {
    const { client, ops } = makeFakeClient();
    const auth = useAuth({ graphqlClient: client as never });

    await auth.registerContact({ ...PERSON, password: 'secret', companyName: 'Acme' }, 'NL', false, false);

    expect(ops().some((o) => WELCOME.test(o))).toBe(false);
  });

  it('skips the customer welcome email when sendWelcomeEmail is false, but still logs in', async () => {
    const { client, ops } = makeFakeClient();
    const auth = useAuth({ graphqlClient: client as never });

    await auth.registerCustomer({ ...PERSON, password: 'secret' }, 'NL', true, false);

    expect(ops()).toContain('login');
    expect(ops().some((o) => WELCOME.test(o))).toBe(false);
  });
});
