/**
 * MachineGrid — mode selection by URL segments, plus the loading layout.
 *
 * Rendered through `vue/server-renderer`. Without a client both composables stay
 * idle; with one, the immediate watchers start a fetch that never resolves, so
 * the render is the loading state.
 */

import { describe, it, expect, vi } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import MachineGrid, { type MachineGridProps, type MachineListingState } from '../MachineGrid.vue';

const paginationProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock('../GridPagination.vue', () => ({
  default: defineComponent({
    inheritAttrs: false,
    setup(_, { attrs }) {
      paginationProps.push({ ...attrs });
      return () => null;
    },
  }),
}));

const LISTING: MachineListingState = {
  page: 1,
  offset: 12,
  sortField: 'NAME',
  sortOrder: 'ASC',
  filters: {},
  term: '',
};

const pending = () => new Promise(() => {});
const CLIENT = { execute: pending, query: pending, mutate: pending } as never;

function render(segments: string[], extra: Partial<MachineGridProps> = {}): Promise<string> {
  const app = createSSRApp({
    render: () =>
      h(MachineGrid, {
        segments,
        basePath: '/machines',
        rootTitle: 'Machines',
        listing: LISTING,
        onListingChange: () => {},
        ...extra,
      }),
  });
  return renderToString(app);
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('MachineGrid — mode selection', () => {
  it('root (empty segments) renders the installations title', async () => {
    const html = await render([]);
    expect(html).toContain('Machines');
    expect(html).not.toContain('aria-current');
  });

  it('node (non-empty segments) renders breadcrumbs + the leaf title from its slug', async () => {
    const html = await render(['mixer-pump']);
    expect(html).toContain('Mixer Pump');
    expect(html).toContain('aria-current');
  });
});

describe('MachineGrid — root loading', () => {
  const root = (ids: string[]) => render([], { graphqlClient: CLIENT, source: 'ERP', sourceIds: ids });

  it('shows one skeleton card per installation instead of a text line', async () => {
    const html = await root(['a', 'b', 'c']);
    expect(count(html, 'propeller-machine-card-skeleton ')).toBe(3);
    expect(html).not.toContain('No machines found.');
  });

  it('caps the skeletons at 8', async () => {
    const html = await root(Array.from({ length: 12 }, (_, i) => `id-${i}`));
    expect(count(html, 'propeller-machine-card-skeleton ')).toBe(8);
  });

  it('marks the grid busy and keeps the loading label for screen readers', async () => {
    const html = await root(['a']);
    expect(html).toContain('aria-busy="true"');
    expect(html).toMatch(/role="status"[^>]*>Loading…</);
  });
});

describe('MachineGrid — machine page loading', () => {
  const node = (extra: Partial<MachineGridProps> = {}) =>
    render(['mixer-pump'], { graphqlClient: CLIENT, ...extra });

  it('renders the parts area with the product skeleton during the first load', async () => {
    const html = await node();
    expect(html).toContain('propeller-product-grid__skeleton-card');
    expect(html).toContain('aria-label="Search parts"');
  });

  it('shows child machine skeletons during the first load', async () => {
    expect(await node()).toContain('propeller-machine-children--loading');
  });

  it('shows a title skeleton instead of the slug label while the machine loads', async () => {
    const html = await node();
    expect(html).toContain('propeller-machine-title-skeleton');
    expect(html).not.toContain('Mixer Pump');
  });

  it('does not show the not-found text while loading', async () => {
    expect(await node()).not.toContain('This machine could not be found.');
  });
});

describe('MachineGrid — view mode', () => {
  const node = (extra: Partial<MachineGridProps> = {}) =>
    render(['mixer-pump'], { graphqlClient: CLIENT, ...extra });

  it('opens the parts as a list by default', async () => {
    expect(await node()).toContain('propeller-product-grid__skeleton-grid flex flex-col');
  });

  it('opens the parts in the 3-column grid with defaultViewMode="grid"', async () => {
    expect(await node({ defaultViewMode: 'grid' })).toContain(
      'propeller-product-grid__skeleton-grid grid grid-cols-2 lg:grid-cols-3'
    );
  });
});

describe('MachineGrid — pagination variant', () => {
  const lastVariant = async (extra: Partial<MachineGridProps>) => {
    paginationProps.length = 0;
    await render(['mixer-pump'], { graphqlClient: CLIENT, ...extra });
    return paginationProps[paginationProps.length - 1]?.variant;
  };

  it('defaults to the compact pager', async () => {
    expect(await lastVariant({})).toBe('compact');
  });

  it('forwards paginationVariant="full"', async () => {
    expect(await lastVariant({ paginationVariant: 'full' })).toBe('full');
  });
});
