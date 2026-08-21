/**
 * Pure / runtime-agnostic surface for `propeller-v2-vue-ui`.
 *
 * Everything exported here is plain TS — no Vue, no browser API. Safe to
 * import from a Nuxt server context, a build script, or a test without
 * pulling in the Vue component tree. The main `.` entry pulls in the
 * components and their Vue dependency; this `/shared` entry stays free of it.
 *
 * Re-exports the pure surface from `propeller-v2-core-ui` so existing
 * downstream import paths (`propeller-v2-vue-ui/shared`) keep working.
 * New code may import from `propeller-v2-core-ui` directly.
 */
export * from '@propeller-commerce/propeller-v2-core-ui';

// `MenuCategory` is the serialisable shape `<Menu :tree="..." />` consumes.
// Re-exported from `/shared` (type-only) so server modules can build the
// tree without pulling the Vue composable's runtime into the server bundle.
export type { MenuCategory } from './composables/vue/useMenu';
