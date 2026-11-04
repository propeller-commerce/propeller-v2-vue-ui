/**
 * RegisterForm — the optional password section.
 */

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import RegisterForm from '../RegisterForm.vue';

const client = { execute: async () => ({ data: {} }), setAccessToken: () => {}, getConfig: () => ({ headers: {} }), updateConfig: () => {} } as never;

function render(extra: Record<string, unknown> = {}): Promise<string> {
  return renderToString(createSSRApp({ render: () => h(RegisterForm, { graphqlClient: client, showUserType: 'Customer', ...extra }) }));
}

describe('RegisterForm — showPassword', () => {
  it('renders the password section by default', async () => {
    const html = await render();
    expect(html).toContain('id="register-password"');
    expect(html).toContain('id="register-confirmPassword"');
    expect(html).toMatch(/>\s*Password\s*<\/h3>/);
  });

  it('leaves the password section out when showPassword is false', async () => {
    const html = await render({ showPassword: false });
    expect(html).not.toContain('type="password"');
    expect(html).not.toMatch(/>\s*Password\s*<\/h3>/);
  });
});
