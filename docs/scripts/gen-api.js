// Generates the propeller-v2-vue-ui API reference as Markdown into
// docs/content/api/**.
//
// IMPORTANT — TypeDoc is run as a STANDALONE step here, NOT as the
// `docusaurus-plugin-typedoc` build plugin. The plugin regenerates on every
// `docusaurus build` (overwriting the on-disk MDX sanitize pass) and MDX fails
// to parse the raw output before any remark plugin can fix it. Decoupling lets
// the pipeline be: gen-api -> sanitize-api-mdx -> docusaurus build, with the
// API treated as ordinary pre-sanitized static markdown.
//
// VUE NOTE — unlike propeller-v2-react-ui (whose components are `.tsx`, so a
// single `src/index.ts` entry covers everything), this package's components
// are `.vue` Single-File Components that TypeDoc cannot parse. Pointing it at
// `src/index.ts` would fail on the `.vue` re-exports. So the entry points are
// the package's pure-TS headless surface — the composables, the provider
// (context), the SDK seam (lib) and the `shared` entry. That is the entire
// documentable API; the `.vue` components' prop tables live in Storybook.
//
// Run from the `docs/` directory (npm scripts set cwd there).
const {spawnSync} = require('child_process');
const path = require('path');
const fs = require('fs');

// TypeDoc treats `entryPoints` as globs and rejects Windows `\` separators
// ("escapes a non-special character"). Always hand it POSIX `/` paths.
const toPosix = (p) => p.replace(/\\/g, '/');

const docsDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(docsDir, '..');

// Entry points: the pure-TS public surface. `--entryPointStrategy expand`
// walks each glob. The Vue composables, the shared composables/utilities/
// types, the two context files, the SDK-seam lib and `shared.ts` together
// export every documentable symbol — `index.ts` is deliberately omitted
// because it re-exports `.vue` SFCs TypeDoc cannot read. The
// `composables/shared/**` glob is what brings in the framework-agnostic
// orchestration helpers (`initCart`, `fetchActiveCart`, `mergeAnonymousCart`)
// and the shared utilities/types; `tsconfig.typedoc.json` already strips the
// `__tests__` / `*.test.ts` files those directories also contain.
const srcGlob = (rel) => toPosix(path.join(repoRoot, 'src', rel));
const entryPoints = [
  srcGlob('composables/vue/*.ts'),
  srcGlob('composables/shared/**/*.ts'),
  srcGlob('context/*.ts'),
  srcGlob('lib/*.ts'),
  srcGlob('shared.ts'),
];

// Dedicated tsconfig that excludes test / mock / story files — those import
// dev-only deps (vitest, @storybook/vue3-vite) that are not package
// dependencies, so including them in the TypeDoc program fails type
// resolution on CI.
const tsconfig = toPosix(path.join(repoRoot, 'tsconfig.typedoc.json'));
const out = toPosix(path.join(docsDir, 'content', 'api'));

fs.rmSync(out, {recursive: true, force: true});

const args = [
  'typedoc',
  '--plugin', 'typedoc-plugin-markdown',
  '--plugin', 'typedoc-docusaurus-theme',
  '--entryPointStrategy', 'expand',
  ...entryPoints.flatMap((e) => ['--entryPoints', e]),
  '--tsconfig', tsconfig,
  '--out', out,
  // typedoc-docusaurus-theme computes sidebar doc IDs relative to this; it
  // MUST equal the Docusaurus `docs.path` (we use `content`) so IDs come out
  // as `api/...` not `../content/api/...`. Default is `./docs`.
  '--docsPath', './content',
  '--readme', 'none',
  '--exclude', '**/__tests__/**',
  '--exclude', '**/__mocks__/**',
  '--exclude', '**/*.test.ts',
  '--exclude', '**/*.spec.ts',
  '--exclude', '**/*.stories.ts',
  '--excludeInternal',
  '--excludeExternals',
  '--excludePrivate',
  '--sanitizeComments',
  '--sourceLinkTemplate',
  'https://gitlab.com/propellor-eu/cloud/frontend/ui/propeller-v2-vue-ui/-/blob/{gitRevision}/{path}#L{line}',
  '--gitRevision', 'develop',
];

const res = spawnSync('npx', args, {
  cwd: docsDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (res.status !== 0) {
  console.error(`[gen-api] typedoc failed with exit code ${res.status}`);
  process.exit(res.status ?? 1);
}
console.log('[gen-api] API markdown generated at docs/content/api');
