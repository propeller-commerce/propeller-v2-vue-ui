/**
 * A boolean infra key must still resolve from the provider.
 *
 * `defineProps<{ includeTax?: boolean }>()` compiles to
 * `{ type: Boolean, required: false }`, and Vue casts an ABSENT Boolean prop to
 * `false` rather than leaving it `undefined`. `useInfraProps` used to ask
 * `props[key] !== undefined`, so it saw that phantom `false` as an explicit
 * override and never consulted the provider: a shop whose provider says prices
 * include VAT rendered every price EXCLUDING VAT unless each host passed
 * `includeTax` by hand. String keys (`language`, `currency`) were never
 * affected — which is why the locale fix held while VAT kept coming back.
 *
 * These components are declared as PLAIN OBJECTS with an explicit
 * `{ type: Boolean }` on purpose. That is what the production build emits for
 * an SFC's optional boolean; the dev-mode transform vitest uses drops the
 * runtime `type` altogether, so importing the .vue file here would pass
 * whether or not the bug is present. Asserting against the compiled shape is
 * the only version of this test that can fail.
 */

import { describe, it, expect } from 'vitest';
import { createSSRApp, h, defineComponent } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { PropellerScopeKey } from '../../../context/PropellerContext';
import { PropellerDepsKey } from '../../../plugin';
import { useInfraProps } from '../useInfraProps';

/** Mirrors the production compile output for `includeTax?: boolean`. */
const TaxProbe = defineComponent({
  props: {
    includeTax: { type: Boolean, required: false },
    language: { type: String, required: false },
  },
  setup(props) {
    const infra = useInfraProps(props);
    return () => h('i', `includeTax=${String(infra.includeTax)} language=${String(infra.language)}`);
  },
});

function render(scope: Record<string, unknown>, props: Record<string, unknown> = {}) {
  const app = createSSRApp({ render: () => h(TaxProbe, props) });
  app.provide(PropellerDepsKey, { currency: '€' } as never);
  app.provide(PropellerScopeKey, { portalMode: 'open', user: null, ...scope } as never);
  return renderToString(app);
}

describe('useInfraProps resolves boolean infra keys', () => {
  it('reads includeTax from the provider when the host passes nothing', async () => {
    expect(await render({ includeTax: true, language: 'EN' })).toContain('includeTax=true');
  });

  it('reads a false provider value too', async () => {
    expect(await render({ includeTax: false, language: 'EN' })).toContain('includeTax=false');
  });

  it('lets an explicit true prop win over a false provider', async () => {
    const html = await render({ includeTax: false, language: 'EN' }, { includeTax: true });
    expect(html).toContain('includeTax=true');
  });

  it('lets an explicit false prop win over a true provider', async () => {
    const html = await render({ includeTax: true, language: 'EN' }, { includeTax: false });
    expect(html).toContain('includeTax=false');
  });

  it('recognises a kebab-cased attribute as explicitly passed', async () => {
    const html = await render({ includeTax: true, language: 'EN' }, { 'include-tax': false });
    expect(html).toContain('includeTax=false');
  });

  it('still resolves string keys from the provider', async () => {
    expect(await render({ includeTax: true, language: 'EN' })).toContain('language=EN');
  });
});
