# Contributing to propeller-v2-vue-ui

This is the Vue 3 component library for Propeller Commerce storefronts. It
is its own project — `propeller-vue` and any other storefront are
*consumers* of it, not the other way around. Component, composable,
provider, and SDK-glue changes happen **here**, in `src/`.

For the deep architectural reference (entry points, build internals, the
SDK seam, the provider), read [TECH.md](./TECH.md) first. This file covers
the day-to-day workflow.

It is the Vue mirror of `propeller-v2-react-ui`; the two are kept
architecturally identical.

---

## Prerequisites

- Node 20+
- npm 10+
- `propeller-sdk-v2` available (the package peer-depends on it; for local
  development it is installed as a dev dependency from GitHub)

## Setup

```bash
npm install
npm run build      # produces dist/{index,shared}.{js,cjs,d.ts} + dist/styles.css
npm run typecheck  # vue-tsc --noEmit, must be clean before any commit
```

## Scripts

| Script                  | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `npm run build`         | Full build — Vite library build then the Tailwind CSS compile |
| `npm run build:js`      | JS bundles only (`vite build`)                         |
| `npm run build:css`     | Stylesheet only (`tailwindcss` CLI)                    |
| `npm run dev`           | Rebuild JS bundles on change (`vite build --watch`)    |
| `npm run typecheck`     | `vue-tsc --noEmit`                                     |
| `npm test`              | Run the Vitest unit suite once                         |
| `npm run test:watch`    | Run Vitest in watch mode                               |
| `npm run test:coverage` | Run the suite with a v8 coverage report                |
| `npm run storybook`     | Storybook dev server on `:6006` (`build:css` runs first) |
| `npm run build-storybook`| Static Storybook build into `storybook-static/`       |
| `npm run clean`         | Remove `dist/`                                         |

**Build ordering matters.** `npm run build` runs `vite build && npm run
build:css` in that order on purpose: `vite build` empties `dist/`, so the
CSS must be compiled *after*. Don't reorder it.

The `prepare` script runs `build` automatically on install — this is
required because the package is consumed via a `github:` / `file:` URL and
`dist/` is gitignored. Without `prepare`, a fresh install would ship only
source and the consumer's imports would fail.

---

## Project layout

```
src/
├── components/        60 components — one .vue SFC each, PascalCase
├── composables/
│   ├── vue/           Vue composables (useCart, useAuth, …) + the
│   │                  provider-aware ones (useServices, useInfraProps,
│   │                  useResolvedProps, …)
│   └── shared/        NO Vue reactivity in utils/ + types/. Pure TS.
│                      The 3 reactive wrappers (usePagination,
│                      useServiceFetch, useUserIdentity) live here too.
├── context/           PropellerContext, ProductGridContext (provide/inject)
├── lib/
│   ├── createServices.ts   SDK factory: createServices(client) → Services
│   └── toPlain.ts          strips SDK underscore-prefixed backing fields
├── styles.css         Tailwind v4 entry, scanned at build time
├── index.ts           the Vue entry barrel
└── shared.ts          runtime-agnostic entry barrel
```

Anything pure-TS (no Vue, no browser API) belongs under
`composables/shared/utils/` or `composables/shared/types/` and is exported
from `shared.ts` — it must be safe to import from a Nuxt server context.

`.storybook/` + `src/**/*.stories.ts` (Storybook) and `docs/` (a
self-contained Docusaurus site) are part of the repo but not in the build
graph and not shipped to consumers.

---

## Coding rules

These are not style preferences — breaking them breaks the build or the
consumer.

### 1. Composition API + `<script setup>`

Every component is a `.vue` SFC using `<script setup lang="ts">` and the
Composition API. No Options API. `ref` for primitives, `computed` for
derived state, `watch`/`onMounted` for effects with proper cleanup.

### 2. The SDK is reached through `Services`, never `new XxxService()`

Composables and components get SDK access in one of two ways:

- **Provider-driven (preferred):** `const services = useServices();` —
  reads the `Services` bundle from the Propeller provider.
- **Explicit client:** the composable takes a `graphqlClient` option and
  derives services internally via `createServices(graphqlClient)`.

Never instantiate an SDK service directly. Never reintroduce a module-level
`graphqlClient` singleton or a hardcoded endpoint — GraphQL transport is the
consumer's concern (see TECH.md).

### 3. No host coupling

Components and composables import **zero `@/` host paths**, **no
`vue-router`**, and read **no `import.meta.env`**. Navigation goes through
callback props (`onProductClick`, …); URLs come from the `configuration`
prop's url builders; language/currency come from props or the provider. A
library component cannot assume the host's router or config exists.

### 4. BEM hooks on every styled element

Every visible element carries a BEM-style class alongside its Tailwind
utilities — `.propeller-product-card`, `.propeller-product-card__price`,
etc. These are the consumer's override surface (see [STYLING.md](./STYLING.md)).
When you add or restructure markup, add the matching BEM class. Don't remove
existing ones — consumers may target them. **Keep the names identical to
`propeller-v2-react-ui`.**

### 5. Tailwind v4 `@source inline()` for dynamic classes

Tailwind v4's scanner extracts class names from string literals, but it can
miss classes buried in template-literal ternaries inside `:class` bindings.
If a class only ever appears inside a dynamic expression, add it to the
`@source inline(...)` directive at the top of `src/styles.css`, rebuild the
CSS, and confirm the class is in `dist/styles.css`.

### 6. Every component merges a passed `class`

Vue merges a fallthrough `class` attribute onto the component root
automatically. Where a component has multiple root candidates or disables
attribute inheritance, keep the explicit
`` `propeller-x ...base... ${props.class || ''}` `` pattern.

### 7. Infra props are resolved, not required

Components that need `graphqlClient` / `user` / `language` / `currency` /
etc. call `useInfraProps(rawProps)` — explicit props win, otherwise the
value comes from the provider. Don't make infra props required in the type.

---

## Testing

The package is verified at two levels.

### Unit tests — the pure-logic surface

The package uses [Vitest](https://vitest.dev/). Tests live next to the code
they cover, in `__tests__/` directories, named `*.test.ts`.

Unit-test coverage targets the **pure-logic surface** — `src/lib/`
(`createServices`, `toPlain`) and the framework-free utilities in
`src/composables/shared/utils/`. These are plain functions with no Vue, no
DOM, and no SDK network calls, so they run in the fast `node` environment.

When you change a pure utility, add or update its `__tests__/` file in the
same commit.

```bash
npm test              # run once
npm run test:watch    # watch mode while developing
npm run test:coverage # with a coverage report
```

### Component verification — the consumer's e2e suite

Components are **not** unit-tested in isolation. They need a GraphQL client
and the provider to render meaningfully, so testing them against a *mock*
SDK would be heavy to maintain and less truthful than testing them in a
real app.

Instead, the components are verified by **propeller-vue's Playwright e2e
suite** — it drives the real storefront, against a real backend, in a real
browser. CI wires this up as a gate (see below).

When your change affects a component's rendered layout, add or update a
Playwright regression spec in propeller-vue's `e2e/` directory and ship it
as a paired commit.

---

## Continuous integration

`.gitlab-ci.yml` defines three stages:

- **`verify`** — `typecheck` (`vue-tsc`), `unit-tests` (Vitest +
  coverage), and `build`. Fast, hermetic.
- **`downstream`** — `downstream-e2e`: builds the package, clones
  propeller-vue, installs the freshly-built package into it with
  `npm install file:… --install-links`, and runs that repo's Playwright
  e2e suite. The component regression gate.
- **`mirror`** — one-way mirror of `develop` / `master` to the public
  GitHub repo so the package is installable via a `github:` URL.

The downstream job needs a live backend and test accounts, supplied as
**GitLab CI/CD variables** (mark secrets *Masked* and *Protected*):

| Variable | Purpose |
| --- | --- |
| `CONSUMER_REPO_URL` | Token-authenticated git URL of propeller-vue, so CI can clone it. |
| `VITE_GRAPHQL_ENDPOINT` / `VITE_GRAPHQL_PROXY_TARGET` | Backend GraphQL endpoint + proxy upstream. |
| `VITE_API_KEY` | Backend API key (masked). |
| `VITE_ORDER_EDITOR_API_KEY` | Order-editor key (masked). |
| `VITE_BASE_CATEGORY_ID` | Catalog root category. |
| `E2E_CONTACT_EMAIL` / `E2E_CONTACT_PASSWORD` | Contact test-account login (masked). |
| `E2E_CUSTOMER_EMAIL` / `E2E_CUSTOMER_PASSWORD` | Customer test-account login (masked). |
| `GITHUB_TOKEN` | Repo-scoped token for the mirror job (masked + protected). |

Until those variables are configured the `downstream-e2e` job is
`allow_failure: true` and is skipped when `CONSUMER_REPO_URL` is unset — the
`verify` stage still gates every pipeline. Once the variables are in place,
drop `allow_failure`.

---

## Before you commit

1. `npm run typecheck` — must be clean (0 errors).
2. `npm test` — the unit suite must pass.
3. `npm run build` — must succeed; check `dist/styles.css` exists and
   contains any new utility classes you used.
4. If you changed a pure utility, its `__tests__/` file is updated in the
   same commit.
5. If the change affects a component's rendered layout, add or update a
   Playwright regression test **in the consumer** (`propeller-vue`'s `e2e/`
   suite). Ship them as paired commits.
6. If the change affects the public API surface, update `CHANGELOG.md` and
   — for breaking changes — `MIGRATION.md`.

## Commit messages

Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
`chore:`). Scope is optional but encouraged. Do not add AI-assistant
attribution trailers.

## Versioning

The package is pre-1.0 (`0.x`). Until 1.0 the API may change between minor
versions; breaking changes are documented in `MIGRATION.md`.

## The fix-location rule

If you are tempted to fix a component by editing a copy in a consumer app:
don't. The supported customization paths are theme tokens, BEM-hook CSS, the
`class` attribute, slots, and wrap-and-extend (see STYLING.md and TECH.md).
If none fit, the fix is a PR here.

## Mirror project

The React counterpart (`propeller-v2-react-ui`) has the same architecture.
The `composables/shared/` layer is intentionally pure TS so it can stay
byte-identical between the two packages. If you change something in
`composables/shared/`, mirror it to the React package.
