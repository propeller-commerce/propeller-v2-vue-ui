// Writes one props page per `.vue` component to content/api/components; run after gen-api.js.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createChecker} from 'vue-component-meta';

const docsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(docsDir, '..');
const componentsDir = path.join(repoRoot, 'src', 'components');
const outDir = path.join(docsDir, 'content', 'api', 'components');
const catalogue = path.join(docsDir, 'content', 'components.mdx');
const indexTs = path.join(repoRoot, 'src', 'index.ts');

const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const repoUrl = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
const sourceUrl = (file) => `${repoUrl}/blob/master/src/components/${file}`;

// Escape prose for MDX (outside code spans) and table cells.
const escText = (s) =>
  s
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/\|/g, '\\|');

// Prose that may contain `code` spans: escape only the non-code parts.
const escProse = (s) =>
  s
    .split(/(`[^`\n]*`)/g)
    .map((p) => (p.startsWith('`') && p.endsWith('`') && p.length > 1 ? p.replace(/\|/g, '\\|') : escText(p)))
    .join('');

const code = (s) => '`' + String(s).replace(/`/g, "'").replace(/\s+/g, ' ').replace(/\|/g, '\\|') + '`';

// Multi-line JSDoc text -> single table cell.
function cell(text) {
  if (!text) return '';
  const lines = [];
  let inFence = false;
  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*```/.test(raw)) { inFence = !inFence; continue; }
    if (inFence) { if (raw.trim()) lines.push(code(raw.trim())); continue; }
    lines.push(escProse(raw.trim()));
  }
  return lines.join('<br />').replace(/(<br \/>){2,}/g, '<br /><br />').replace(/^(<br \/>)+|(<br \/>)+$/g, '');
}

const tagNote = (tags, name) => tags.find((t) => t.name === name);

// Leading JSDoc of the SFC script, or the one right above the Props interface.
function leadingDoc(source, name) {
  const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  for (const body of scripts) {
    const top = body.match(/^\s*\/\*\*([\s\S]*?)\*\//);
    const above = body.match(new RegExp(`\\/\\*\\*((?:(?!\\*\\/)[\\s\\S])*)\\*\\/\\s*export interface ${name}Props\\b`));
    const raw = (top || above)?.[1];
    if (!raw) continue;
    const text = raw
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim();
    const para = text.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' ').trim();
    const cleaned = para.replace(new RegExp(`^${name}\\s*(\\(Vue\\))?\\s*[—–-]\\s*`), '');
    if (cleaned) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return '';
}

// One-line descriptions from the hand-written catalogue tables.
function catalogueDescriptions() {
  const map = new Map();
  if (!fs.existsSync(catalogue)) return map;
  for (const line of fs.readFileSync(catalogue, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\|\s*\[?`(\w+)`\]?(?:\([^)]*\))?\s*\|\s*(.+?)\s*\|\s*$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

const exported = new Set(
  [...fs.readFileSync(indexTs, 'utf8').matchAll(/components\/(\w+)\.vue/g)].map((m) => m[1]),
);

function renderPage(name, file, meta, description) {
  const props = meta.props.filter((p) => !p.global).sort((a, b) => Number(b.required) - Number(a.required));
  const out = [
    '---',
    `title: ${name}`,
    `sidebar_label: ${name}`,
    'custom_edit_url: null',
    '---',
    '',
    `# ${name}`,
    '',
  ];
  if (description) out.push(escProse(description), '');
  if (!exported.has(name)) out.push(':::note', 'Internal component — not exported from the package entry.', ':::', '');
  out.push('```ts', `import { ${name} } from '${pkg.name}';`, '```', '');
  out.push(`Source: [src/components/${file}](${sourceUrl(file)})`, '');

  out.push('## Props', '');
  if (props.length) {
    out.push('| Prop | Type | Required | Default | Description |', '| --- | --- | --- | --- | --- |');
    for (const p of props) {
      const type = p.required ? p.type : p.type.replace(/ \| undefined$/, '');
      const def = p.default ?? tagNote(p.tags, 'default')?.text;
      const dep = tagNote(p.tags, 'deprecated');
      const desc = (dep ? `**Deprecated.** ${dep.text ? escProse(dep.text) + ' ' : ''}` : '') + cell(p.description);
      out.push(`| ${code(p.name)} | ${code(type)} | ${p.required ? 'Yes' : 'No'} | ${def != null && def !== '' ? code(def) : '—'} | ${desc} |`);
    }
  } else {
    out.push('This component takes no props.');
  }
  out.push('');

  if (meta.events.length) {
    out.push('## Events', '', '| Event | Payload | Description |', '| --- | --- | --- |');
    for (const e of meta.events) out.push(`| ${code(e.name)} | ${code(e.type)} | ${cell(e.description)} |`);
    out.push('');
  }

  if (meta.slots.length) {
    out.push('## Slots', '', '| Slot | Slot props | Description |', '| --- | --- | --- |');
    for (const s of meta.slots) out.push(`| ${code(s.name)} | ${s.type && s.type !== '{}' ? code(s.type) : '—'} | ${cell(s.description)} |`);
    out.push('');
  }
  return out.join('\n');
}

const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith('.vue')).sort();
const checker = createChecker(path.join(repoRoot, 'tsconfig.json'), {
  schema: {ignore: ['*']},
  printer: {newLine: 1},
});
const descriptions = catalogueDescriptions();

fs.rmSync(outDir, {recursive: true, force: true});
fs.mkdirSync(outDir, {recursive: true});

const generated = [];
const failed = [];
for (const file of files) {
  const name = file.replace(/\.vue$/, '');
  try {
    const meta = checker.getComponentMeta(path.join(componentsDir, file));
    const source = fs.readFileSync(path.join(componentsDir, file), 'utf8');
    const description = leadingDoc(source, name) || descriptions.get(name) || '';
    fs.writeFileSync(path.join(outDir, `${name}.md`), renderPage(name, file, meta, description), 'utf8');
    generated.push({name, props: meta.props.filter((p) => !p.global).length, events: meta.events.length, slots: meta.slots.length});
  } catch (err) {
    failed.push(name);
    console.error(`[gen-components] ${name}: ${err.message}`);
  }
}

const index = [
  '---',
  'title: Component props',
  'sidebar_label: Overview',
  'slug: /api/components',
  'custom_edit_url: null',
  '---',
  '',
  '# Component props',
  '',
  `Props, events and slots of every \`.vue\` component, generated from the component source with \`vue-component-meta\`. See the [component catalogue](/components) for what each one renders.`,
  '',
  '| Component | Props | Events | Slots |',
  '| --- | --- | --- | --- |',
  ...generated.map((g) => `| [${g.name}](/api/components/${g.name}) | ${g.props} | ${g.events} | ${g.slots} |`),
  '',
].join('\n');
fs.writeFileSync(path.join(outDir, 'index.md'), index, 'utf8');

const sidebar = {items: ['api/components/index', ...generated.map((g) => `api/components/${g.name}`)]};
fs.writeFileSync(path.join(outDir, 'components-sidebar.cjs'), `module.exports = ${JSON.stringify(sidebar, null, 2)};\n`, 'utf8');

const missing = generated.filter((g) => exported.has(g.name) && !descriptions.has(g.name)).map((g) => g.name);
if (missing.length) console.warn(`[gen-components] not in components.mdx catalogue: ${missing.join(', ')}`);
console.log(`[gen-components] ${generated.length} component page(s) generated at docs/content/api/components`);
if (failed.length) {
  console.error(`[gen-components] failed: ${failed.join(', ')}`);
  process.exit(1);
}
