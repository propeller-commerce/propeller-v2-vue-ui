# propeller-v2-vue-ui documentation site

This directory is a self-contained [Docusaurus 3](https://docusaurus.io)
app. It is **not** published to npm and is **not** part of the package
build — it has its own `package.json` / lockfile and `node_modules`.

Intended to publish at
<https://propeller-commerce.github.io/propeller-v2-vue-ui/> (GitHub Pages),
mirroring the [React UI docs](https://propeller-commerce.github.io/propeller-v2-react-ui/)
and the [SDK docs](https://propeller-commerce.github.io/propeller-sdk-v2/).
No deploy workflow is wired yet.

## Layout

```
docs/
  docusaurus.config.ts   site config (navbar, footer, branding, search)
  sidebars.ts            manual guide tree + generated API-reference subtree
  scripts/
    gen-api.js           runs TypeDoc over the package's pure-TS surface
    sanitize-api-mdx.js  makes the TypeDoc markdown MDX-safe
  content/               documentation pages (Docusaurus docs root)
    index.mdx            site root (slug: /)
    *.mdx                hand-authored guides
    guides/api/*.mdx     API-integration guides
    api/                 GENERATED API reference (gitignored)
  src/css/custom.css     theme overrides (brand color)
  static/img/            branding assets (reused from the SDK docs)
```

## Local development

In this directory:

```bash
npm install      # first time
npm start        # dev server at http://localhost:3000/propeller-v2-vue-ui/
npm run build    # production build into docs/build
npm run serve    # serve the production build
npm run typecheck
```

A Docusaurus site is a single-page app with absolute asset paths — it must
be served over HTTP (`npm start` / `npm run serve`), not opened as a
`file://` URL.

## The two reference surfaces

This site has **two** reference surfaces, by design:

1. **TypeDoc API reference** (`content/api/**`) — auto-generated from the
   package's *pure-TS headless surface*: the composables, the provider
   (`providePropeller` / `usePropellerContext`), the SDK seam
   (`createServices`, `toPlain`), the utilities and the domain types.
   `npm run gen:api` runs TypeDoc (`scripts/gen-api.js`) then makes the
   output MDX-safe (`scripts/sanitize-api-mdx.js`). It runs automatically
   via the `prestart` / `prebuild` hooks, so a plain `npm start` /
   `npm run build` always regenerates it first. The output is gitignored.

2. **Storybook prop tables** — the `.vue` Single-File Components cannot be
   parsed by TypeDoc, so each component's props are documented in
   [Storybook](https://storybook.js.org) instead. The
   [Component reference](content/components.mdx) page is a curated catalogue
   that links out to Storybook for the live preview and prop tables — it
   does not duplicate them.

### Why the API reference excludes `src/index.ts`

`gen-api.js` deliberately does *not* point TypeDoc at `src/index.ts` — that
barrel re-exports the `.vue` components, and TypeDoc cannot read SFCs. The
entry points are the `.ts` globs (`composables/vue/*.ts`, `context/*.ts`,
`lib/*.ts`, `shared.ts`). Those cover the entire documentable API; the
components are covered by Storybook.

## Search

Offline search via `@easyops-cn/docusaurus-search-local`.

## Branding

`static/img/*` are the Propeller brand assets, shared with the React UI and
SDK docs sites.
