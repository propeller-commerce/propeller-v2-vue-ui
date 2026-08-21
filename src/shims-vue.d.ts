/**
 * Lets TypeScript resolve `.vue` single-file component imports.
 * `vue-tsc` understands `.vue` files natively; this shim keeps a plain
 * `tsc`-based editor / tooling pass from erroring on the imports.
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
