/**
 * GridPagination — pagination entries as links.
 *
 * Page numbers navigate to a different URL, so they are anchors with a real
 * `href` once `pageHref` is supplied: that is what gives the browser the
 * status-bar preview, open-in-new-tab and copy-link-address. They stayed
 * buttons with no href, so none of that worked (PWP-1060).
 *
 * Mirrors the react-ui test of the same name — the two must stay in step.
 */

import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import GridPagination from '../GridPagination.vue';

const href = (page: number) => `/category/1329/inkt-en-toner?page=${page}`;

function render(props: Record<string, unknown> = {}) {
  const app = createSSRApp({
    render: () =>
      h(GridPagination, {
        products: { page: 2, pages: 5 },
        onPageChange: () => {},
        variant: 'full',
        ...props,
      }),
  });
  return renderToString(app);
}

describe('GridPagination markup', () => {
  it('renders anchors with hrefs when pageHref is given', async () => {
    const html = await render({ pageHref: href });
    expect(html).toContain('href="/category/1329/inkt-en-toner?page=3"');
    expect(html).toContain('href="/category/1329/inkt-en-toner?page=1"');
    expect(html).not.toContain('<button');
  });

  it('keeps buttons when pageHref is omitted, so existing callers are unchanged', async () => {
    const html = await render();
    expect(html).toContain('<button');
    expect(html).not.toContain('href=');
  });

  it('marks the current page with aria-current instead of disabling it', async () => {
    const html = await render({ pageHref: href });
    expect(html).toContain('aria-current="page"');
    // The current page keeps its own URL — it is reachable, not inert.
    expect(html).toContain('href="/category/1329/inkt-en-toner?page=2"');
  });

  it('puts rel=prev/next only on the adjacent entries', async () => {
    const html = await render({ pageHref: href });
    expect(html.match(/rel="prev"/g)).toHaveLength(1);
    expect(html.match(/rel="next"/g)).toHaveLength(1);
  });

  it('is a labelled navigation landmark containing a list', async () => {
    const html = await render({ pageHref: href });
    expect(html).toContain('<nav');
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
  });

  // A control that cannot act should not hold a place in the tab order.
  it('omits Previous on the first page and Next on the last', async () => {
    const first = await render({ products: { page: 1, pages: 5 }, pageHref: href });
    expect(first).not.toContain('--prev');
    expect(first).toContain('--next');

    const last = await render({ products: { page: 5, pages: 5 }, pageHref: href });
    expect(last).toContain('--prev');
    expect(last).not.toContain('--next');
  });

  it('applies the same treatment to the compact variant', async () => {
    const html = await render({ variant: 'compact', pageHref: href });
    expect(html).toContain('<nav');
    expect(html).toContain('href="/category/1329/inkt-en-toner?page=3"');
    expect(html).toContain('rel="next"');
  });

  it('renders nothing when there is only one page', async () => {
    const html = await render({ products: { page: 1, pages: 1 }, pageHref: href });
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('<button');
  });

  it('overrides the landmark name from labels', async () => {
    const html = await render({ pageHref: href, labels: { paginationLabel: 'Paginering' } });
    expect(html).toContain('aria-label="Paginering"');
  });
});
