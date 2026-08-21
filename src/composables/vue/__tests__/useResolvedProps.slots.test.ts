/**
 * Resolver slot-precedence tests (Vue).
 *
 * useResolvedProps treats component-slot values identically to booleans —
 * the precedence rule is `explicit > grid > infra > default`. Vitest runs
 * in `environment: 'node'`. We mock the two context hooks and call the
 * resolver directly with non-React mock objects standing in for components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockGridConfig: Record<string, unknown> | null = null;
let mockInfra: Record<string, unknown> = {};

vi.mock('../../../context/ProductGridContext', () => ({
  useProductGridConfig: () => mockGridConfig,
}));
vi.mock('../useInfraProps', () => ({
  useInfraProps: () => mockInfra,
}));

import { useResolvedProps, type ResolveSpec } from '../useResolvedProps';

interface TestProps {
  priceComponent?: unknown;
  stockComponent?: unknown;
  showStock?: boolean;
}

const SPEC: ResolveSpec<TestProps> = {
  priceComponent: { grid: 'priceComponent' as never },
  stockComponent: { grid: 'stockComponent' as never },
  showStock: { grid: 'showStock' },
};

describe('useResolvedProps (Vue) — component-slot resolution', () => {
  beforeEach(() => {
    mockGridConfig = null;
    mockInfra = {};
  });

  it('returns explicit priceComponent prop when provided', () => {
    const Local = { name: 'Local' };
    const resolved = useResolvedProps<TestProps>({ priceComponent: Local }, SPEC);
    expect(resolved.priceComponent).toBe(Local);
  });

  it('falls back to grid priceComponent when no explicit prop', () => {
    const GridPrice = { name: 'GridPrice' };
    mockGridConfig = { priceComponent: GridPrice };
    const resolved = useResolvedProps<TestProps>({}, SPEC);
    expect(resolved.priceComponent).toBe(GridPrice);
  });

  it('explicit prop wins over grid context (component-slot)', () => {
    const Local = { name: 'Local' };
    const GridPrice = { name: 'GridPrice' };
    mockGridConfig = { priceComponent: GridPrice };
    const resolved = useResolvedProps<TestProps>({ priceComponent: Local }, SPEC);
    expect(resolved.priceComponent).toBe(Local);
  });

  it('returns undefined when neither explicit nor grid slot is set', () => {
    const resolved = useResolvedProps<TestProps>({}, SPEC);
    expect(resolved.stockComponent).toBeUndefined();
  });

  it('resolves component slots alongside boolean flags consistently', () => {
    const GridPrice = { name: 'GridPrice' };
    mockGridConfig = { priceComponent: GridPrice, showStock: true };
    const resolved = useResolvedProps<TestProps>({}, SPEC);
    expect(resolved.priceComponent).toBe(GridPrice);
    expect(resolved.showStock).toBe(true);
  });
});
