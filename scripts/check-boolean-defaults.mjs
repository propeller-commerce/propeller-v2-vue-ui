#!/usr/bin/env node
/**
 * Fail the build when an optional boolean prop documented as defaulting to
 * `true` compiles without that default.
 *
 * Vue casts an ABSENT `Boolean` prop to `false`, not `undefined`. So
 * `defineProps<{ showStock?: boolean }>()` plus a `showStock ?? true` in the
 * template reads as `false`, and a prop whose doc comment promises "Defaults to
 * true" quietly does the opposite. It bit MachineGrid (stock, prices and
 * add-to-cart all off), ProductBundles (items never listed), ProductPrice (no
 * login prompt) and PriceToggle (frozen in controlled mode) — every one of them
 * silent, and every one of them diverging from the React twin.
 *
 * The doc comment is the spec: if it says "Defaults to true", the compiled prop
 * must carry `default: true`. Nothing here needs updating when a component is
 * added — write the doc comment and this enforces it.
 *
 * Deliberately NOT checked: props documented as defaulting to false. Vue's cast
 * already produces that, so there is nothing to get wrong.
 *
 * Infra keys (`includeTax`, `isAuthenticated`) are exempt — `useInfraProps`
 * resolves those from `vnode.props`, which sees what the parent actually passed
 * and so is immune to the cast. See `composables/vue/useInfraProps.ts`.
 *
 * Plain node, no framework. Run in CI and before publishing.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, compileScript } from '@vue/compiler-sfc';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Resolved by `useInfraProps` from the raw vnode props, so the cast can't bite. */
const INFRA_EXEMPT = new Set(['includeTax', 'isAuthenticated']);

const files = execFileSync('git', ['ls-files', 'src/**/*.vue'], { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

// `compileScript` needs a real fs to follow imported/extended prop types.
const fs = {
  fileExists: (f) => existsSync(f) && statSync(f).isFile(),
  readFile: (f) => (existsSync(f) ? readFileSync(f, 'utf8') : undefined),
};

/** Props whose doc comment promises a `true` default, keyed by prop name. */
function documentedTrue(src) {
  const names = new Set();
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*([A-Za-z0-9_]+)\?\s*:\s*boolean\s*;/);
    if (!m) continue;
    // The doc block immediately above the declaration.
    const doc = [];
    for (let j = i - 1; j >= 0 && /^\s*(\/\*\*|\*|\*\/)/.test(lines[j]); j--) doc.unshift(lines[j]);
    if (/Defaults? to true/i.test(doc.join(' '))) names.add(m[1]);
  }
  return names;
}

/** The compiled runtime descriptor for each prop, as the production build emits it. */
function compiledProps(file, src) {
  const { descriptor } = parse(src, { filename: file });
  const { content } = compileScript(descriptor, { id: file, fs });
  const start = content.indexOf('props: {');
  if (start < 0) return null;
  const out = new Map();
  for (const line of content.slice(start).split('\n').slice(1)) {
    if (/^\s{2}\},?\s*$/.test(line)) break;
    const m = line.match(/^\s*([A-Za-z0-9_]+):\s*\{(.*)\},?\s*$/);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

const failures = [];
const skipped = [];

for (const file of files) {
  const abs = path.join(root, file);
  const src = readFileSync(abs, 'utf8');
  if (!src.includes('defineProps')) continue;

  const promised = documentedTrue(src);
  if (promised.size === 0) continue;

  let props;
  try {
    props = compiledProps(file, src);
  } catch (err) {
    skipped.push(`${file}: ${String(err.message).split('\n')[0]}`);
    continue;
  }
  if (!props) continue;

  for (const name of promised) {
    if (INFRA_EXEMPT.has(name)) continue;
    const descriptor = props.get(name);
    if (descriptor === undefined) continue;
    if (!/type:\s*Boolean/.test(descriptor)) continue;
    if (/default:/.test(descriptor)) continue;
    failures.push(
      `${file}  ->  ${name} is documented as defaulting to true but compiles to ` +
        `{ ${descriptor.trim()} }. Vue casts an absent Boolean prop to false, so it ` +
        `defaults to FALSE. Add it to withDefaults().`
    );
  }
}

if (skipped.length) {
  console.log('Skipped (could not compile):');
  for (const s of skipped) console.log(`  ${s}`);
  console.log('');
}

if (failures.length) {
  console.error('Boolean props that lie about their default:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\n${failures.length} problem(s).`);
  process.exit(1);
}

console.log('Boolean prop defaults match their documentation.');
