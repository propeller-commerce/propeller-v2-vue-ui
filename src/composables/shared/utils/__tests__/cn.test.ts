/**
 * A host className override must beat the component's own utility.
 *
 * The class attribute used to be built by string-appending the override after
 * the package's defaults, which does nothing: `text-white text-cocoa` renders
 * white, because order in the attribute is not the cascade.
 */

import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('lets the later utility win within a group', () => {
    expect(cn('text-white', 'text-cocoa')).toBe('text-cocoa');
  });

  it('keeps non-conflicting utilities and unknown classes', () => {
    const out = cn('propeller-x inline-flex text-white', 'text-cocoa');
    expect(out).toContain('propeller-x');
    expect(out).toContain('inline-flex');
    expect(out).toContain('text-cocoa');
    expect(out).not.toContain('text-white');
  });

  it('drops falsy entries so an absent override changes nothing', () => {
    expect(cn('text-foreground', undefined)).toBe('text-foreground');
  });
});
